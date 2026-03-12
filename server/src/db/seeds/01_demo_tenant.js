/**
 * Seed: Demo Tenant + Restaurant + Kitchen Stations
 */
exports.seed = async (knex) => {
  // Idempotent — skip if already seeded
  const exists = await knex('tenants').where({ slug: 'demo-bistro' }).first();
  if (exists) return;

  const [tenant] = await knex('tenants').insert({
    name:          'Demo Bistro',
    slug:          'demo-bistro',
    email:         'owner@demobistro.com',
    phone:         '+91-9876543210',
    gst_number:    '27AAPFU0939F1ZV',
    currency:      'INR',
    timezone:      'Asia/Kolkata',
    primary_color: '#FF6B35',
    address:       JSON.stringify({ line1: '42 MG Road', city: 'Bengaluru', state: 'Karnataka', pin: '560001' }),
    settings:      JSON.stringify({ cgst_rate: 2.5, sgst_rate: 2.5, enable_qr_ordering: true }),
  }).returning('*');

  const [restaurant] = await knex('restaurants').insert({
    tenant_id:  tenant.id,
    name:       'Demo Bistro — MG Road',
    phone:      '+91-9876543210',
    address:    JSON.stringify({ line1: '42 MG Road', city: 'Bengaluru', state: 'Karnataka', pin: '560001' }),
    open_time:  '08:00',
    close_time: '23:00',
  }).returning('*');

  // Kitchen stations
  await knex('kitchen_stations').insert([
    { tenant_id: tenant.id, restaurant_id: restaurant.id, name: 'Main Kitchen' },
    { tenant_id: tenant.id, restaurant_id: restaurant.id, name: 'Grill Station' },
    { tenant_id: tenant.id, restaurant_id: restaurant.id, name: 'Bar'          },
    { tenant_id: tenant.id, restaurant_id: restaurant.id, name: 'Bakery'       },
  ]);

  // Store IDs for subsequent seeds
  await knex('audit_logs').insert({
    entity:    '_seed_meta',
    action:    'store_ids',
    new_data:  JSON.stringify({ tenant_id: tenant.id, restaurant_id: restaurant.id }),
  });

  console.log(`✅  Tenant seeded: ${tenant.slug} (id: ${tenant.id})`);
  console.log(`✅  Restaurant:    ${restaurant.name} (id: ${restaurant.id})`);
};
