const router = require('express').Router();

router.use('/auth',      require('./auth.routes'));
router.use('/menu',      require('./menu.routes'));
router.use('/orders',    require('./order.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/billing',   require('./billing.routes'));
router.use('/tables',    require('./tables.routes'));

// Health check
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

module.exports = router;
