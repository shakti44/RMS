/**
 * Mock Backend — In-memory data, no database required.
 * Simulates all RMS API endpoints so the frontend works immediately.
 * Run: node mock-server/server.js
 */
const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const { Server }= require('socket.io');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const SECRET = 'mock_secret_key';
const sign   = (payload) => jwt.sign(payload, SECRET, { expiresIn: '24h' });
const verify = (token)   => jwt.verify(token, SECRET);

// ── In-memory store ───────────────────────────────────────────────────────
const TENANT_ID     = 'tenant-demo-001';
const RESTAURANT_ID = 'rest-demo-001';

const USERS = [
  { id: 'u1', tenantId: TENANT_ID, name: 'Admin User',   email: 'admin@demobistro.com',   role: 'tenant_admin',  password: 'demo1234', tenantSlug: 'demo-bistro', tenantName: 'Demo Bistro' },
  { id: 'u2', tenantId: TENANT_ID, name: 'Sara Manager', email: 'manager@demobistro.com', role: 'manager',       password: 'demo1234', tenantSlug: 'demo-bistro', tenantName: 'Demo Bistro' },
  { id: 'u3', tenantId: TENANT_ID, name: 'Chef Kumar',   email: 'kitchen@demobistro.com', role: 'kitchen_staff', password: 'demo1234', tenantSlug: 'demo-bistro', tenantName: 'Demo Bistro' },
  { id: 'u4', tenantId: TENANT_ID, name: 'Priya Waiter', email: 'waiter@demobistro.com',  role: 'waiter',        password: 'demo1234', tenantSlug: 'demo-bistro', tenantName: 'Demo Bistro' },
];

const TABLES = [
  { id: 't1',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'T-01', capacity: 4, status: 'available', section: 'Ground Floor', qr_token: 'qr-t1' },
  { id: 't2',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'T-02', capacity: 4, status: 'occupied',  section: 'Ground Floor', qr_token: 'qr-t2' },
  { id: 't3',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'T-03', capacity: 6, status: 'available', section: 'Ground Floor', qr_token: 'qr-t3' },
  { id: 't4',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'T-04', capacity: 4, status: 'reserved',  section: 'Ground Floor', qr_token: 'qr-t4' },
  { id: 't5',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'T-05', capacity: 4, status: 'available', section: 'Ground Floor', qr_token: 'qr-t5' },
  { id: 't6',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'T-06', capacity: 6, status: 'cleaning',  section: 'Ground Floor', qr_token: 'qr-t6' },
  { id: 't7',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'R-01', capacity: 2, status: 'available', section: 'Rooftop',      qr_token: 'qr-t7' },
  { id: 't8',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'R-02', capacity: 2, status: 'occupied',  section: 'Rooftop',      qr_token: 'qr-t8' },
  { id: 't9',  tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'VIP-1',capacity:10, status: 'available', section: 'Private',      qr_token: 'qr-t9' },
  { id: 't10', tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, name: 'VIP-2',capacity: 8, status: 'available', section: 'Private',      qr_token: 'qr-t10'},
];

const CATEGORIES = [
  { id: 'c1', name: 'Starters',    sort_order: 1 },
  { id: 'c2', name: 'Main Course', sort_order: 2 },
  { id: 'c3', name: 'Breads',      sort_order: 3 },
  { id: 'c4', name: 'Biryani',     sort_order: 4 },
  { id: 'c5', name: 'Desserts',    sort_order: 5 },
  { id: 'c6', name: 'Beverages',   sort_order: 6 },
];

const MENU_ITEMS = [
  { id: 'm1',  category_id: 'c1', name: 'Paneer Tikka',         price: 280, item_type: 'veg',     tags: ['bestseller','grilled'], prep_time_minutes: 15, is_available: true, is_featured: true,  description: 'Marinated cottage cheese grilled in tandoor', modifier_groups: [
    { id: 'mg1', name: 'Spice Level', is_required: false, max_select: 1, options: [
      { id: 'mo1', name: 'Mild', price_delta: 0, is_default: true },
      { id: 'mo2', name: 'Medium', price_delta: 0 },
      { id: 'mo3', name: 'Hot', price_delta: 0 },
    ]},
  ]},
  { id: 'm2',  category_id: 'c1', name: 'Chicken 65',           price: 320, item_type: 'non_veg', tags: ['spicy','bestseller'],   prep_time_minutes: 18, is_available: true, description: 'Crispy fried chicken with curry leaves', modifier_groups: [] },
  { id: 'm3',  category_id: 'c1', name: 'Veg Spring Rolls',     price: 180, item_type: 'veg',     tags: [],                       prep_time_minutes: 12, is_available: true, modifier_groups: [] },
  { id: 'm4',  category_id: 'c1', name: 'Seekh Kebab',          price: 360, item_type: 'non_veg', tags: ['grilled'],              prep_time_minutes: 20, is_available: true, modifier_groups: [] },
  { id: 'm5',  category_id: 'c1', name: 'Samosa (2 pcs)',       price: 80,  item_type: 'veg',     tags: [],                       prep_time_minutes: 8,  is_available: true, modifier_groups: [] },

  { id: 'm6',  category_id: 'c2', name: 'Butter Chicken',       price: 380, item_type: 'non_veg', tags: ['bestseller'],           prep_time_minutes: 20, is_available: true, is_featured: true,  description: 'Creamy tomato chicken curry', modifier_groups: [] },
  { id: 'm7',  category_id: 'c2', name: 'Palak Paneer',         price: 300, item_type: 'veg',     tags: [],                       prep_time_minutes: 18, is_available: true, description: 'Cottage cheese in spinach gravy', modifier_groups: [] },
  { id: 'm8',  category_id: 'c2', name: 'Dal Makhani',          price: 260, item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 15, is_available: true, modifier_groups: [] },
  { id: 'm9',  category_id: 'c2', name: 'Mutton Rogan Josh',    price: 460, item_type: 'non_veg', tags: ['spicy'],                prep_time_minutes: 25, is_available: true, modifier_groups: [] },
  { id: 'm10', category_id: 'c2', name: 'Steamed Rice',         price: 80,  item_type: 'veg',     tags: [],                       prep_time_minutes: 10, is_available: true, modifier_groups: [] },

  { id: 'm11', category_id: 'c3', name: 'Butter Naan',          price: 60,  item_type: 'veg',     tags: [],                       prep_time_minutes: 8,  is_available: true, modifier_groups: [] },
  { id: 'm12', category_id: 'c3', name: 'Garlic Naan',          price: 80,  item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 8,  is_available: true, modifier_groups: [] },
  { id: 'm13', category_id: 'c3', name: 'Tandoori Roti',        price: 40,  item_type: 'veg',     tags: [],                       prep_time_minutes: 6,  is_available: true, modifier_groups: [] },

  { id: 'm14', category_id: 'c4', name: 'Chicken Biryani',      price: 380, item_type: 'non_veg', tags: ['bestseller'],           prep_time_minutes: 30, is_available: true, is_featured: true,  description: 'Fragrant basmati rice with chicken', modifier_groups: [
    { id: 'mg2', name: 'Add-ons', is_required: false, max_select: 3, options: [
      { id: 'mo4', name: 'Extra Raita', price_delta: 40 },
      { id: 'mo5', name: 'Extra Gravy', price_delta: 60 },
      { id: 'mo6', name: 'Boiled Egg',  price_delta: 30 },
    ]},
  ]},
  { id: 'm15', category_id: 'c4', name: 'Veg Biryani',          price: 280, item_type: 'veg',     tags: [],                       prep_time_minutes: 25, is_available: true, modifier_groups: [] },
  { id: 'm16', category_id: 'c4', name: 'Mutton Biryani',       price: 480, item_type: 'non_veg', tags: [],                       prep_time_minutes: 35, is_available: true, modifier_groups: [] },

  { id: 'm17', category_id: 'c5', name: 'Gulab Jamun (2 pcs)', price: 120, item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 5,  is_available: true, modifier_groups: [] },
  { id: 'm18', category_id: 'c5', name: 'Kulfi',                price: 150, item_type: 'veg',     tags: [],                       prep_time_minutes: 3,  is_available: true, modifier_groups: [] },

  { id: 'm19', category_id: 'c6', name: 'Mango Lassi',          price: 120, item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 3,  is_available: true, modifier_groups: [
    { id: 'mg3', name: 'Size', is_required: true, max_select: 1, options: [
      { id: 'mo7', name: 'Regular (300ml)', price_delta: 0,  is_default: true },
      { id: 'mo8', name: 'Large (500ml)',   price_delta: 40, is_default: false },
    ]},
  ]},
  { id: 'm20', category_id: 'c6', name: 'Masala Chai',          price: 60,  item_type: 'veg',     tags: [],                       prep_time_minutes: 5,  is_available: true, modifier_groups: [] },
  { id: 'm21', category_id: 'c6', name: 'Cold Coffee',          price: 140, item_type: 'veg',     tags: [],                       prep_time_minutes: 5,  is_available: true, modifier_groups: [] },
];

const INVENTORY = [
  { id: 'i1',  name: 'Chicken (Boneless)', unit: 'kg',    quantity_on_hand: 10.0, reorder_level: 3.0,  cost_per_unit: 320 },
  { id: 'i2',  name: 'Paneer',             unit: 'kg',    quantity_on_hand: 8.0,  reorder_level: 2.0,  cost_per_unit: 280 },
  { id: 'i3',  name: 'Basmati Rice',       unit: 'kg',    quantity_on_hand: 2.0,  reorder_level: 5.0,  cost_per_unit: 90  },  // LOW STOCK
  { id: 'i4',  name: 'Tomatoes',           unit: 'kg',    quantity_on_hand: 6.0,  reorder_level: 2.0,  cost_per_unit: 30  },
  { id: 'i5',  name: 'Butter',             unit: 'kg',    quantity_on_hand: 3.0,  reorder_level: 1.0,  cost_per_unit: 450 },
  { id: 'i6',  name: 'Cream',              unit: 'litre', quantity_on_hand: 0.5,  reorder_level: 1.0,  cost_per_unit: 200 },  // LOW STOCK
  { id: 'i7',  name: 'Maida (refined)',    unit: 'kg',    quantity_on_hand: 10.0, reorder_level: 2.0,  cost_per_unit: 42  },
  { id: 'i8',  name: 'Mango Pulp',         unit: 'litre', quantity_on_hand: 5.0,  reorder_level: 1.0,  cost_per_unit: 90  },
  { id: 'i9',  name: 'Yoghurt',            unit: 'kg',    quantity_on_hand: 6.0,  reorder_level: 2.0,  cost_per_unit: 65  },
  { id: 'i10', name: 'Spinach',            unit: 'kg',    quantity_on_hand: 3.0,  reorder_level: 1.0,  cost_per_unit: 40  },
  { id: 'i11', name: 'Black Lentils',      unit: 'kg',    quantity_on_hand: 5.0,  reorder_level: 1.5,  cost_per_unit: 120 },
  { id: 'i12', name: 'Cooking Oil',        unit: 'litre', quantity_on_hand: 10.0, reorder_level: 3.0,  cost_per_unit: 130 },
];

// Live orders store
let ORDERS = [
  { id: 'ord-001', tenant_id: TENANT_ID, restaurant_id: RESTAURANT_ID, table_id: 't2', table_name: 'T-02', order_type: 'dine_in', status: 'preparing', placed_at: new Date(Date.now() - 12*60*1000).toISOString(), special_notes: '', customer_name: null,
    items: [
      { id: 'oi1', order_id: 'ord-001', menu_item_id: 'm6', item_name: 'Butter Chicken', quantity: 2, unit_price: 380, subtotal: 760, modifiers: [], special_note: 'Less spicy' },
      { id: 'oi2', order_id: 'ord-001', menu_item_id: 'm12', item_name: 'Garlic Naan',   quantity: 4, unit_price: 80,  subtotal: 320, modifiers: [] },
    ]
  },
  { id: 'ord-002', tenant_id: TENANT_ID, restaurant_id: RESTAURANT_ID, table_id: 't8', table_name: 'R-02', order_type: 'dine_in', status: 'pending', placed_at: new Date(Date.now() - 3*60*1000).toISOString(), special_notes: 'No onions please',
    items: [
      { id: 'oi3', order_id: 'ord-002', menu_item_id: 'm14', item_name: 'Chicken Biryani', quantity: 1, unit_price: 380, subtotal: 380, modifiers: [{ name: 'Extra Raita', group_name: 'Add-ons', price_delta: 40 }] },
      { id: 'oi4', order_id: 'ord-002', menu_item_id: 'm19', item_name: 'Mango Lassi',     quantity: 2, unit_price: 120, subtotal: 240, modifiers: [{ name: 'Large (500ml)', group_name: 'Size', price_delta: 40 }] },
    ]
  },
  { id: 'ord-003', tenant_id: TENANT_ID, restaurant_id: RESTAURANT_ID, table_id: null, table_name: null, order_type: 'takeaway', status: 'ready', placed_at: new Date(Date.now() - 25*60*1000).toISOString(), special_notes: '', customer_name: 'Rahul Sharma',
    items: [
      { id: 'oi5', order_id: 'ord-003', menu_item_id: 'm1', item_name: 'Paneer Tikka',  quantity: 1, unit_price: 280, subtotal: 280, modifiers: [{ name: 'Hot', group_name: 'Spice Level', price_delta: 0 }] },
      { id: 'oi6', order_id: 'ord-003', menu_item_id: 'm8', item_name: 'Dal Makhani',   quantity: 1, unit_price: 260, subtotal: 260, modifiers: [] },
    ]
  },
];

let BILLS = [];
let INV_TX = [];

// ── Auth middleware ────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = verify(header.slice(7));
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token expired' });
  }
};

// ── AUTH ROUTES ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find((u) => u.email === email);
  if (!user || user.password !== password)
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = sign({ id: user.id, tenantId: user.tenantId, role: user.role });
  res.json({
    success: true,
    data: {
      accessToken:  token,
      refreshToken: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role,
              tenantId: user.tenantId, tenantSlug: user.tenantSlug, tenantName: user.tenantName },
    },
  });
});

app.post('/api/auth/logout',  auth, (_req, res) => res.json({ success: true }));
app.post('/api/auth/refresh', (req, res) => res.json({ success: true, data: { accessToken: req.body.refreshToken } }));
app.get('/api/auth/me', auth, (req, res) => {
  const user = USERS.find((u) => u.id === req.user.id);
  res.json({ success: true, data: user });
});

// ── MENU ROUTES ────────────────────────────────────────────────────────────
app.get('/api/menu/public/:restaurantId', (_req, res) => {
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    tenant_id:     TENANT_ID,
    restaurant_id: RESTAURANT_ID,
    is_active:     true,
    items: MENU_ITEMS.filter((i) => i.category_id === cat.id && i.is_available),
  }));
  res.json({ success: true, data: grouped });
});

app.get('/api/menu/public/item/:itemId', (req, res) => {
  const item = MENU_ITEMS.find((i) => i.id === req.params.itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});

app.get('/api/menu/categories', auth, (_req, res) => {
  res.json({ success: true, data: CATEGORIES.map((c) => ({ ...c, tenant_id: TENANT_ID, restaurant_id: RESTAURANT_ID, is_active: true })) });
});
app.get('/api/menu/items', auth, (_req, res) => {
  res.json({ success: true, data: MENU_ITEMS });
});
app.post('/api/menu/categories', auth, (req, res) => {
  const cat = { id: uuid(), ...req.body, tenant_id: TENANT_ID, restaurant_id: RESTAURANT_ID, is_active: true };
  CATEGORIES.push(cat);
  res.status(201).json({ success: true, data: cat });
});
app.put('/api/menu/categories/:id', auth, (req, res) => {
  const i = CATEGORIES.findIndex((c) => c.id === req.params.id);
  if (i < 0) return res.status(404).json({ success: false, message: 'Not found' });
  CATEGORIES[i] = { ...CATEGORIES[i], ...req.body };
  res.json({ success: true, data: CATEGORIES[i] });
});
app.post('/api/menu/items', auth, (req, res) => {
  const item = { id: uuid(), ...req.body, is_available: true, modifier_groups: [] };
  MENU_ITEMS.push(item);
  res.status(201).json({ success: true, data: item });
});
app.put('/api/menu/items/:id', auth, (req, res) => {
  const i = MENU_ITEMS.findIndex((m) => m.id === req.params.id);
  if (i < 0) return res.status(404).json({ success: false, message: 'Not found' });
  MENU_ITEMS[i] = { ...MENU_ITEMS[i], ...req.body };
  res.json({ success: true, data: MENU_ITEMS[i] });
});
app.patch('/api/menu/items/:id/availability', auth, (req, res) => {
  const item = MENU_ITEMS.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  item.is_available = req.body.is_available;
  res.json({ success: true, data: item });
});

// ── TABLES ROUTES ──────────────────────────────────────────────────────────
app.get('/api/tables/qr/:token', (req, res) => {
  const table = TABLES.find((t) => t.qr_token === req.params.token);
  if (!table) return res.status(404).json({ success: false, message: 'Invalid QR code' });
  res.json({ success: true, data: { ...table, tenant_slug: 'demo-bistro', restaurant_name: 'Demo Bistro' } });
});

app.get('/api/tables', auth, (_req, res) => {
  res.json({ success: true, data: TABLES });
});

// Also serve tables under /api/menu/tables (used by TableGrid)
app.get('/api/menu/tables', auth, (_req, res) => {
  res.json({ success: true, data: TABLES });
});

app.patch('/api/tables/:id/status', auth, (req, res) => {
  const table = TABLES.find((t) => t.id === req.params.id);
  if (!table) return res.status(404).json({ success: false, message: 'Not found' });
  table.status = req.body.status;
  res.json({ success: true, data: table });
});

// ── ORDERS ROUTES ──────────────────────────────────────────────────────────
app.get('/api/orders', auth, (req, res) => {
  let orders = [...ORDERS].sort((a, b) => new Date(b.placed_at) - new Date(a.placed_at));
  if (req.query.status) orders = orders.filter((o) => o.status === req.query.status);
  if (req.query.orderType) orders = orders.filter((o) => o.order_type === req.query.orderType);
  const page  = Number(req.query.page  || 1);
  const limit = Number(req.query.limit || 30);
  const paginated = orders.slice((page - 1) * limit, page * limit);
  res.json({ success: true, orders: paginated, total: orders.length, page, limit });
});

app.get('/api/orders/:id', (req, res) => {
  const order = ORDERS.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Not found' });
  const table = TABLES.find((t) => t.id === order.table_id);
  res.json({ success: true, data: { ...order, table_name: table?.name || null } });
});

app.post('/api/orders', (req, res) => {
  const { restaurantId, tableId, orderType, items, customerName, specialNotes } = req.body;
  const table = TABLES.find((t) => t.id === tableId);

  const orderItems = (items || []).map((item, idx) => {
    const menuItem = MENU_ITEMS.find((m) => m.id === item.menuItemId);
    return {
      id:          `oi-${Date.now()}-${idx}`,
      order_id:    '',
      menu_item_id: item.menuItemId,
      item_name:   menuItem?.name || 'Unknown',
      quantity:    item.quantity,
      unit_price:  menuItem?.price || 0,
      subtotal:    (menuItem?.price || 0) * item.quantity,
      modifiers:   [],
      special_note: item.specialNote || '',
      status:      'pending',
    };
  });

  const order = {
    id:            `ord-${Date.now()}`,
    tenant_id:     TENANT_ID,
    restaurant_id: restaurantId || RESTAURANT_ID,
    table_id:      tableId || null,
    table_name:    table?.name || null,
    order_type:    orderType || 'dine_in',
    status:        'pending',
    placed_at:     new Date().toISOString(),
    customer_name: customerName || null,
    special_notes: specialNotes || '',
    items:         orderItems,
  };

  // Fix item order_ids
  order.items.forEach((i) => { i.order_id = order.id; });

  ORDERS.unshift(order);

  // Mark table occupied
  if (table && orderType === 'dine_in') table.status = 'occupied';

  // Broadcast to kitchen
  io.to(`restaurant:${restaurantId || RESTAURANT_ID}`).emit('order:new', order);

  res.status(201).json({ success: true, data: order });
});

app.patch('/api/orders/:id/status', auth, (req, res) => {
  const order = ORDERS.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Not found' });

  order.status = req.body.status;
  if (req.body.status === 'completed') order.completed_at = new Date().toISOString();

  // Free table when order completes or cancels
  if (['completed', 'cancelled'].includes(req.body.status) && order.table_id) {
    const table = TABLES.find((t) => t.id === order.table_id);
    if (table) table.status = 'available';
  }

  io.to(`restaurant:${order.restaurant_id}`).emit('order:updated', order);
  io.of('/guest').to(`order:${order.id}`).emit('order:updated', order);

  res.json({ success: true, data: order });
});

// ── INVENTORY ROUTES ───────────────────────────────────────────────────────
app.get('/api/inventory', auth, (_req, res) => {
  res.json({ success: true, data: INVENTORY });
});

app.post('/api/inventory', auth, (req, res) => {
  const item = { id: uuid(), tenant_id: TENANT_ID, restaurant_id: RESTAURANT_ID, quantity_on_hand: 0, ...req.body };
  INVENTORY.push(item);
  res.status(201).json({ success: true, data: item });
});

app.put('/api/inventory/:id', auth, (req, res) => {
  const i = INVENTORY.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ success: false, message: 'Not found' });
  INVENTORY[i] = { ...INVENTORY[i], ...req.body };
  res.json({ success: true, data: INVENTORY[i] });
});

app.post('/api/inventory/:id/adjust', auth, (req, res) => {
  const item = INVENTORY.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  item.quantity_on_hand = Number(item.quantity_on_hand) + Number(req.body.quantityChange);
  const tx = { id: uuid(), inventory_item_id: item.id, tx_type: req.body.txType, quantity_change: req.body.quantityChange, quantity_after: item.quantity_on_hand, note: req.body.note, created_at: new Date().toISOString() };
  INV_TX.push(tx);
  if (item.quantity_on_hand <= item.reorder_level) {
    io.to(`restaurant:${RESTAURANT_ID}`).emit('inventory:low_stock', { itemId: item.id, name: item.name, quantity_on_hand: item.quantity_on_hand, reorder_level: item.reorder_level });
  }
  res.json({ success: true, data: item });
});

app.get('/api/inventory/alerts/low-stock', auth, (_req, res) => {
  const low = INVENTORY.filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_level));
  res.json({ success: true, data: low });
});

app.get('/api/inventory/:id/transactions', auth, (req, res) => {
  res.json({ success: true, data: INV_TX.filter((t) => t.inventory_item_id === req.params.id) });
});

app.get('/api/inventory/recipes/:menuItemId', auth, (_req, res) => {
  res.json({ success: true, data: [] });
});

// ── BILLING ROUTES ─────────────────────────────────────────────────────────
app.post('/api/billing/generate', auth, (req, res) => {
  const { orderId, couponCode, discountType, discountValue } = req.body;
  const order    = ORDERS.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const subtotal = order.items.reduce((s, i) => s + Number(i.subtotal), 0);
  let   discount = 0;

  if (couponCode === 'WELCOME10') discount = Math.min(subtotal * 0.10, 100);
  else if (couponCode === 'FLAT50' && subtotal >= 300) discount = 50;
  else if (discountType === 'flat')    discount = Number(discountValue || 0);
  else if (discountType === 'percent') discount = (subtotal * Number(discountValue || 0)) / 100;

  const taxable   = subtotal - discount;
  const cgst      = taxable * 0.025;
  const sgst      = taxable * 0.025;
  const grandTotal= taxable + cgst + sgst;

  const bill = {
    id:              uuid(),
    tenant_id:       TENANT_ID,
    order_id:        orderId,
    bill_number:     `RMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`,
    subtotal:        subtotal.toFixed(2),
    discount_amount: discount.toFixed(2),
    coupon_code:     couponCode || null,
    taxable_amount:  taxable.toFixed(2),
    cgst_rate:       2.5,
    sgst_rate:       2.5,
    cgst_amount:     cgst.toFixed(2),
    sgst_amount:     sgst.toFixed(2),
    total_tax:       (cgst + sgst).toFixed(2),
    grand_total:     grandTotal.toFixed(2),
    status:          'open',
    created_at:      new Date().toISOString(),
  };
  BILLS.push(bill);
  res.status(201).json({ success: true, data: bill });
});

app.post('/api/billing/:billId/payment', auth, (req, res) => {
  const bill = BILLS.find((b) => b.id === req.params.billId);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
  bill.status = 'paid';
  const order = ORDERS.find((o) => o.id === bill.order_id);
  if (order) { order.status = 'completed'; order.completed_at = new Date().toISOString(); }
  res.status(201).json({ success: true, data: { id: uuid(), bill_id: bill.id, method: req.body.method, amount: req.body.amount, paid_at: new Date().toISOString() } });
});

app.get('/api/billing/analytics/daily', auth, (_req, res) => {
  const completedOrders = ORDERS.filter((o) => o.status === 'completed');
  const totalRevenue    = completedOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + Number(i.subtotal), 0) * 1.05, 0);
  res.json({
    success: true,
    data: {
      date:                new Date().toISOString().slice(0, 10),
      total_orders:        completedOrders.length || 3,
      total_revenue:       totalRevenue.toFixed(2) || 4820,
      total_tax_collected: (totalRevenue * 0.05 / 1.05).toFixed(2) || 229.52,
      avg_order_value:     completedOrders.length ? (totalRevenue / completedOrders.length).toFixed(2) : 1606.67,
      total_discounts:     0,
      by_order_type: [
        { order_type: 'dine_in',  count: 2, revenue: 3240 },
        { order_type: 'takeaway', count: 1, revenue: 580  },
      ],
      top_items: [
        { name: 'Butter Chicken',  total_qty: 4, revenue: 1520 },
        { name: 'Chicken Biryani', total_qty: 3, revenue: 1140 },
        { name: 'Garlic Naan',     total_qty: 6, revenue: 480  },
        { name: 'Mango Lassi',     total_qty: 4, revenue: 480  },
        { name: 'Dal Makhani',     total_qty: 2, revenue: 520  },
      ],
    },
  });
});

// ── HEALTH ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'mock', timestamp: new Date() }));

// ── SOCKET.IO ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join:restaurant', ({ restaurantId }) => {
    socket.join(`restaurant:${restaurantId}`);
  });
  socket.on('leave:restaurant', ({ restaurantId }) => {
    socket.leave(`restaurant:${restaurantId}`);
  });
});

io.of('/guest').on('connection', (socket) => {
  socket.on('join:order', ({ orderId }) => socket.join(`order:${orderId}`));
});

// ── START ──────────────────────────────────────────────────────────────────
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`\n🚀  Mock RMS Server  →  http://localhost:${PORT}`);
  console.log(`📋  Demo logins (password: demo1234):`);
  console.log(`    admin@demobistro.com   → Admin`);
  console.log(`    manager@demobistro.com → Manager`);
  console.log(`    kitchen@demobistro.com → Kitchen`);
  console.log(`    waiter@demobistro.com  → Waiter\n`);
});
