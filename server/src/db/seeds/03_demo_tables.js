/**
 * Seed: Dining tables with unique QR tokens.
 */
const crypto = require('crypto');

exports.seed = async (knex) => {
  const tenant     = await knex('tenants').where({ slug: 'demo-bistro' }).first();
  const restaurant = await knex('restaurants').where({ tenant_id: tenant.id }).first();
  if (!tenant || !restaurant) throw new Error('Run seeds 01-02 first');

  const exists = await knex('restaurant_tables').where({ tenant_id: tenant.id }).first();
  if (exists) return;

  const tables = [
    // Ground Floor
    ...Array.from({ length: 6 }, (_, i) => ({
      tenant_id:     tenant.id,
      restaurant_id: restaurant.id,
      name:          `T-${String(i + 1).padStart(2, '0')}`,
      capacity:      i < 4 ? 4 : 6,
      section:       'Ground Floor',
      qr_token:      crypto.randomBytes(16).toString('hex'),
    })),
    // Rooftop
    ...Array.from({ length: 4 }, (_, i) => ({
      tenant_id:     tenant.id,
      restaurant_id: restaurant.id,
      name:          `R-${String(i + 1).padStart(2, '0')}`,
      capacity:      2,
      section:       'Rooftop',
      qr_token:      crypto.randomBytes(16).toString('hex'),
    })),
    // Private Dining
    { tenant_id: tenant.id, restaurant_id: restaurant.id, name: 'VIP-1', capacity: 10, section: 'Private', qr_token: crypto.randomBytes(16).toString('hex') },
    { tenant_id: tenant.id, restaurant_id: restaurant.id, name: 'VIP-2', capacity: 8,  section: 'Private', qr_token: crypto.randomBytes(16).toString('hex') },
  ];

  await knex('restaurant_tables').insert(tables);
  console.log(`✅  ${tables.length} tables seeded`);
};
