const router         = require('express').Router();
const asyncHandler   = require('../utils/asyncHandler');
const billingService = require('../services/billing.service');
const { authenticate }  = require('../middleware/auth');
const tenantResolver    = require('../middleware/tenantResolver');

router.use(tenantResolver, authenticate);

// POST /api/billing/generate
router.post('/generate', asyncHandler(async (req, res) => {
  const bill = await billingService.generateBill({
    tenantId:      req.tenant.id,
    orderId:       req.body.orderId,
    couponCode:    req.body.couponCode,
    discountType:  req.body.discountType,
    discountValue: req.body.discountValue,
    generatedBy:   req.user.id,
  });
  res.status(201).json({ success: true, data: bill });
}));

// POST /api/billing/:billId/payment
router.post('/:billId/payment', asyncHandler(async (req, res) => {
  const payment = await billingService.recordPayment({
    tenantId:    req.tenant.id,
    billId:      req.params.billId,
    method:      req.body.method,
    amount:      Number(req.body.amount),
    referenceId: req.body.referenceId,
    recordedBy:  req.user.id,
  });
  res.status(201).json({ success: true, data: payment });
}));

// GET /api/billing/analytics/daily
router.get('/analytics/daily', asyncHandler(async (req, res) => {
  const summary = await billingService.getDailySummary({
    tenantId:     req.tenant.id,
    restaurantId: req.query.restaurantId,
    date:         req.query.date,
  });
  res.json({ success: true, data: summary });
}));

module.exports = router;
