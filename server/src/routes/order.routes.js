/**
 * /api/orders
 *
 * POST   /                    Place new order (QR guest OR staff)
 * GET    /                    List orders (staff/admin)
 * GET    /:orderId             Get single order
 * PATCH  /:orderId/status      Update order status (kitchen/staff)
 */
const router            = require('express').Router();
const orderCtrl         = require('../controllers/order.controller');
const { authenticate }  = require('../middleware/auth');
const tenantResolver    = require('../middleware/tenantResolver');
const validate          = require('../middleware/validate');
const { placeOrderSchema, updateStatusSchema } = require('../validators/order.validator');

// All routes need tenant context
router.use(tenantResolver);

// QR guests can place orders without auth — authenticate is optional here
router.post(
  '/',
  (req, _res, next) => {
    // Attach user if token present; otherwise continue as guest
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return authenticate(req, _res, next);
    next();
  },
  validate(placeOrderSchema),
  orderCtrl.placeOrder
);

// Below routes require staff authentication
router.use(authenticate);

router.get('/',                  orderCtrl.listOrders);
router.get('/:orderId',          orderCtrl.getOrder);
router.patch(
  '/:orderId/status',
  validate(updateStatusSchema),
  orderCtrl.updateStatus
);

module.exports = router;
