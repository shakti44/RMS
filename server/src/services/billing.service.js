/**
 * Billing Service
 * Calculates GST, applies coupons/discounts, generates bills.
 */
const db       = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Generate a bill for a completed/served order.
 * Can be called before payment to preview the total.
 */
const generateBill = async ({ tenantId, orderId, couponCode, discountType, discountValue, generatedBy }) => {
  return db.transaction(async (trx) => {
    const order = await trx('orders')
      .where({ id: orderId, tenant_id: tenantId })
      .first();
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status === 'cancelled') throw ApiError.conflict('Cannot bill a cancelled order');

    // Prevent duplicate bills
    const existing = await trx('bills').where({ order_id: orderId }).first();
    if (existing) return existing;

    // Sum order items
    const items = await trx('order_items as oi')
      .where({ 'oi.order_id': orderId })
      .leftJoin('order_item_modifiers as oim', 'oim.order_item_id', 'oi.id')
      .select(
        trx.raw('SUM(oi.subtotal + COALESCE(oim.price_delta, 0) * oi.quantity) as subtotal')
      )
      .first();

    let subtotal = Number(items.subtotal || 0);

    // ── Coupon validation ────────────────────────────────────────────────
    let couponDiscount = 0;
    let coupon         = null;
    if (couponCode) {
      coupon = await trx('coupons')
        .where({ tenant_id: tenantId, code: couponCode.toUpperCase(), is_active: true })
        .first();

      if (!coupon)                          throw ApiError.badRequest('Invalid or expired coupon');
      if (coupon.valid_until && new Date() > new Date(coupon.valid_until))
                                            throw ApiError.badRequest('Coupon has expired');
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit)
                                            throw ApiError.badRequest('Coupon usage limit reached');
      if (subtotal < coupon.min_order)
        throw ApiError.badRequest(`Minimum order value for this coupon is ${coupon.min_order}`);

      couponDiscount = coupon.coupon_type === 'percent'
        ? Math.min((subtotal * coupon.value) / 100, coupon.max_discount || Infinity)
        : coupon.value;

      discountType  = coupon.coupon_type;
      discountValue = coupon.value;
    }

    // ── Manual discount (from staff) ─────────────────────────────────────
    let manualDiscount = 0;
    if (!couponCode && discountType && discountValue > 0) {
      manualDiscount = discountType === 'percent'
        ? (subtotal * discountValue) / 100
        : discountValue;
    }

    const totalDiscount  = couponDiscount + manualDiscount;
    const taxableAmount  = Math.max(subtotal - totalDiscount, 0);

    // GST: CGST 2.5% + SGST 2.5% = 5% (configurable per tenant later)
    const tenant   = await trx('tenants').where({ id: tenantId }).first();
    const cgstRate = tenant?.settings?.cgst_rate ?? 2.5;
    const sgstRate = tenant?.settings?.sgst_rate ?? 2.5;
    const cgst     = (taxableAmount * cgstRate) / 100;
    const sgst     = (taxableAmount * sgstRate) / 100;
    const totalTax = cgst + sgst;
    const grandTotal = taxableAmount + totalTax;

    // Bill number: RMS-{YYYYMMDD}-{random 4 digits}
    const billNumber = `RMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [bill] = await trx('bills').insert({
      tenant_id:       tenantId,
      order_id:        orderId,
      bill_number:     billNumber,
      subtotal:        subtotal.toFixed(2),
      discount_type:   discountType   || null,
      discount_value:  discountValue  || 0,
      discount_amount: totalDiscount.toFixed(2),
      coupon_code:     couponCode     || null,
      taxable_amount:  taxableAmount.toFixed(2),
      cgst_rate:       cgstRate,
      sgst_rate:       sgstRate,
      cgst_amount:     cgst.toFixed(2),
      sgst_amount:     sgst.toFixed(2),
      total_tax:       totalTax.toFixed(2),
      grand_total:     grandTotal.toFixed(2),
      status:          'open',
      generated_by:    generatedBy || null,
    }).returning('*');

    // Increment coupon usage
    if (coupon) {
      await trx('coupons').where({ id: coupon.id }).increment('times_used', 1);
    }

    return bill;
  });
};

/**
 * Record a payment against a bill. Supports split payments (call multiple times).
 */
const recordPayment = async ({ tenantId, billId, method, amount, referenceId, recordedBy }) => {
  return db.transaction(async (trx) => {
    const bill = await trx('bills')
      .where({ id: billId, tenant_id: tenantId })
      .first();
    if (!bill) throw ApiError.notFound('Bill not found');
    if (bill.status === 'paid') throw ApiError.conflict('Bill is already fully paid');

    // Sum all previous payments
    const [{ total_paid }] = await trx('payments')
      .where({ bill_id: billId })
      .sum('amount as total_paid');

    const paidSoFar = Number(total_paid || 0);
    const remaining = Number(bill.grand_total) - paidSoFar;

    if (amount > remaining + 0.01) {
      throw ApiError.badRequest(`Payment of ${amount} exceeds remaining balance of ${remaining.toFixed(2)}`);
    }

    const [payment] = await trx('payments').insert({
      tenant_id:   tenantId,
      bill_id:     billId,
      method,
      amount:      amount.toFixed(2),
      reference_id: referenceId || null,
      recorded_by: recordedBy  || null,
      paid_at:     new Date(),
    }).returning('*');

    // If fully paid, mark bill and order as completed
    const newTotal = paidSoFar + amount;
    if (newTotal >= Number(bill.grand_total) - 0.01) {
      await trx('bills').where({ id: billId }).update({ status: 'paid', updated_at: new Date() });
      await trx('orders').where({ id: bill.order_id }).update({ status: 'completed', completed_at: new Date(), updated_at: new Date() });
    }

    return payment;
  });
};

/**
 * Daily sales summary for analytics dashboard.
 */
const getDailySummary = async ({ tenantId, restaurantId, date }) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const [summary] = await db('orders as o')
    .join('bills as b', 'o.id', 'b.order_id')
    .where({ 'o.tenant_id': tenantId, 'o.restaurant_id': restaurantId, 'b.status': 'paid' })
    .whereRaw("o.placed_at::date = ?", [targetDate])
    .select(
      db.raw('COUNT(o.id)             as total_orders'),
      db.raw('SUM(b.grand_total)      as total_revenue'),
      db.raw('SUM(b.total_tax)        as total_tax_collected'),
      db.raw('SUM(b.discount_amount)  as total_discounts'),
      db.raw('AVG(b.grand_total)      as avg_order_value')
    );

  const byType = await db('orders as o')
    .join('bills as b', 'o.id', 'b.order_id')
    .where({ 'o.tenant_id': tenantId, 'o.restaurant_id': restaurantId, 'b.status': 'paid' })
    .whereRaw("o.placed_at::date = ?", [targetDate])
    .groupBy('o.order_type')
    .select('o.order_type', db.raw('COUNT(*) as count'), db.raw('SUM(b.grand_total) as revenue'));

  const topItems = await db('order_items as oi')
    .join('orders as o',     'oi.order_id',     'o.id')
    .join('menu_items as m', 'oi.menu_item_id', 'm.id')
    .where({ 'o.tenant_id': tenantId, 'o.restaurant_id': restaurantId })
    .whereRaw("o.placed_at::date = ?", [targetDate])
    .groupBy('m.id', 'm.name')
    .orderBy('total_qty', 'desc')
    .limit(5)
    .select('m.name', db.raw('SUM(oi.quantity) as total_qty'), db.raw('SUM(oi.subtotal) as revenue'));

  return {
    date: targetDate,
    ...summary,
    by_order_type: byType,
    top_items:     topItems,
  };
};

module.exports = { generateBill, recordPayment, getDailySummary };
