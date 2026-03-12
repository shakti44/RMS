const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');

const placeOrder = asyncHandler(async (req, res) => {
  const order = await orderService.placeOrder({
    tenantId:        req.tenant.id,
    restaurantId:    req.body.restaurantId,
    tableId:         req.body.tableId,
    orderType:       req.body.orderType || 'dine_in',
    items:           req.body.items,
    customerName:    req.body.customerName,
    customerPhone:   req.body.customerPhone,
    deliveryAddress: req.body.deliveryAddress,
    specialNotes:    req.body.specialNotes,
    placedBy:        req.user?.id || null,
  });
  res.status(201).json({ success: true, data: order });
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus({
    orderId:   req.params.orderId,
    tenantId:  req.tenant.id,
    status:    req.body.status,
    userId:    req.user?.id,
  });
  res.json({ success: true, data: order });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId, req.tenant.id);
  res.json({ success: true, data: order });
});

const listOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listOrders({
    tenantId:     req.tenant.id,
    restaurantId: req.query.restaurantId,
    status:       req.query.status,
    orderType:    req.query.orderType,
    date:         req.query.date,
    page:         Number(req.query.page)  || 1,
    limit:        Number(req.query.limit) || 30,
  });
  res.json({ success: true, ...result });
});

module.exports = { placeOrder, updateStatus, getOrder, listOrders };
