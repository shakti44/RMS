/**
 * Seed: Staff accounts for the demo tenant.
 *
 * Login credentials (all passwords = "demo1234"):
 *   admin@demobistro.com    → tenant_admin
 *   manager@demobistro.com  → manager
 *   cashier@demobistro.com  → cashier
 *   waiter@demobistro.com   → waiter
 *   kitchen@demobistro.com  → kitchen_staff
 */
const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  const tenant = await knex('tenants').where({ slug: 'demo-bistro' }).first();
  if (!tenant) throw new Error('Run seed 01 first');

  const existing = await knex('users').where({ tenant_id: tenant.id }).first();
  if (existing) return;

  const hash = await bcrypt.hash('demo1234', 12);

  await knex('users').insert([
    { tenant_id: tenant.id, name: 'Admin User',    email: 'admin@demobistro.com',   password_hash: hash, role: 'tenant_admin'  },
    { tenant_id: tenant.id, name: 'Sara Manager',  email: 'manager@demobistro.com', password_hash: hash, role: 'manager'       },
    { tenant_id: tenant.id, name: 'Raj Cashier',   email: 'cashier@demobistro.com', password_hash: hash, role: 'cashier'       },
    { tenant_id: tenant.id, name: 'Priya Waiter',  email: 'waiter@demobistro.com',  password_hash: hash, role: 'waiter'        },
    { tenant_id: tenant.id, name: 'Chef Kumar',    email: 'kitchen@demobistro.com', password_hash: hash, role: 'kitchen_staff' },
  ]);

  console.log('✅  Users seeded (password: demo1234)');
};
