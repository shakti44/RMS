/**
 * Seed: Categories + Menu Items with modifiers.
 * Covers a typical Indian restaurant menu.
 */
exports.seed = async (knex) => {
  const tenant     = await knex('tenants').where({ slug: 'demo-bistro' }).first();
  const restaurant = await knex('restaurants').where({ tenant_id: tenant.id }).first();
  if (!tenant || !restaurant) throw new Error('Run seeds 01-03 first');

  const exists = await knex('categories').where({ tenant_id: tenant.id }).first();
  if (exists) return;

  const tid = tenant.id;
  const rid = restaurant.id;

  // ── Categories ────────────────────────────────────────────
  const categoryData = [
    { name: 'Starters',       description: 'Appetizers & small plates',  sort_order: 1 },
    { name: 'Main Course',    description: 'Rice, curry, and mains',      sort_order: 2 },
    { name: 'Breads',         description: 'Fresh from the tandoor',      sort_order: 3 },
    { name: 'Biryani',        description: 'Aromatic rice dishes',         sort_order: 4 },
    { name: 'Desserts',       description: 'Sweet endings',               sort_order: 5 },
    { name: 'Beverages',      description: 'Drinks & juices',             sort_order: 6 },
  ];

  const categories = await knex('categories')
    .insert(categoryData.map((c) => ({ ...c, tenant_id: tid, restaurant_id: rid })))
    .returning('*');

  const cat = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // ── Menu Items ────────────────────────────────────────────
  const items = [
    // Starters
    { category_id: cat['Starters'],    name: 'Paneer Tikka',         price: 280, item_type: 'veg',     tags: ['bestseller','grilled'], prep_time_minutes: 15, is_featured: true,
      description: 'Marinated cottage cheese grilled in tandoor with bell peppers' },
    { category_id: cat['Starters'],    name: 'Chicken 65',           price: 320, item_type: 'non_veg', tags: ['spicy','bestseller'],   prep_time_minutes: 18,
      description: 'Crispy deep-fried chicken with curry leaves and chilies' },
    { category_id: cat['Starters'],    name: 'Veg Spring Rolls',     price: 180, item_type: 'veg',     tags: [],                       prep_time_minutes: 12,
      description: 'Crispy rolls stuffed with mixed vegetables' },
    { category_id: cat['Starters'],    name: 'Seekh Kebab',          price: 360, item_type: 'non_veg', tags: ['grilled'],              prep_time_minutes: 20,
      description: 'Minced lamb seekh kebabs with mint chutney' },
    { category_id: cat['Starters'],    name: 'Samosa (2 pcs)',       price: 80,  item_type: 'veg',     tags: [],                       prep_time_minutes: 8  },

    // Main Course
    { category_id: cat['Main Course'], name: 'Butter Chicken',       price: 380, item_type: 'non_veg', tags: ['bestseller'],           prep_time_minutes: 20, is_featured: true,
      description: 'Creamy tomato-based chicken curry' },
    { category_id: cat['Main Course'], name: 'Palak Paneer',         price: 300, item_type: 'veg',     tags: [],                       prep_time_minutes: 18,
      description: 'Cottage cheese in smooth spinach gravy' },
    { category_id: cat['Main Course'], name: 'Dal Makhani',          price: 260, item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 15,
      description: 'Slow-cooked black lentils with butter and cream' },
    { category_id: cat['Main Course'], name: 'Mutton Rogan Josh',    price: 460, item_type: 'non_veg', tags: ['spicy'],                prep_time_minutes: 25,
      description: 'Kashmiri-style slow-cooked mutton curry' },
    { category_id: cat['Main Course'], name: 'Paneer Butter Masala', price: 320, item_type: 'veg',     tags: [],                       prep_time_minutes: 18 },
    { category_id: cat['Main Course'], name: 'Steamed Rice',         price: 80,  item_type: 'veg',     tags: [],                       prep_time_minutes: 10 },

    // Breads
    { category_id: cat['Breads'],      name: 'Butter Naan',          price: 60,  item_type: 'veg',     tags: [],                       prep_time_minutes: 8  },
    { category_id: cat['Breads'],      name: 'Garlic Naan',          price: 80,  item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 8  },
    { category_id: cat['Breads'],      name: 'Tandoori Roti',        price: 40,  item_type: 'veg',     tags: [],                       prep_time_minutes: 6  },
    { category_id: cat['Breads'],      name: 'Lachha Paratha',       price: 70,  item_type: 'veg',     tags: [],                       prep_time_minutes: 8  },

    // Biryani
    { category_id: cat['Biryani'],     name: 'Chicken Biryani',      price: 380, item_type: 'non_veg', tags: ['bestseller'],           prep_time_minutes: 30, is_featured: true,
      description: 'Fragrant basmati rice with spiced chicken' },
    { category_id: cat['Biryani'],     name: 'Veg Biryani',          price: 280, item_type: 'veg',     tags: [],                       prep_time_minutes: 25,
      description: 'Aromatic basmati rice with seasonal vegetables' },
    { category_id: cat['Biryani'],     name: 'Mutton Biryani',       price: 480, item_type: 'non_veg', tags: [],                       prep_time_minutes: 35,
      description: 'Slow-cooked mutton biryani — Hyderabadi style' },

    // Desserts
    { category_id: cat['Desserts'],    name: 'Gulab Jamun (2 pcs)',  price: 120, item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 5  },
    { category_id: cat['Desserts'],    name: 'Kulfi',                price: 150, item_type: 'veg',     tags: [],                       prep_time_minutes: 3  },
    { category_id: cat['Desserts'],    name: 'Rasmalai',             price: 160, item_type: 'veg',     tags: [],                       prep_time_minutes: 5  },

    // Beverages
    { category_id: cat['Beverages'],   name: 'Mango Lassi',          price: 120, item_type: 'veg',     tags: ['bestseller'],           prep_time_minutes: 3  },
    { category_id: cat['Beverages'],   name: 'Sweet Lassi',          price: 100, item_type: 'veg',     tags: [],                       prep_time_minutes: 3  },
    { category_id: cat['Beverages'],   name: 'Fresh Lime Soda',      price: 80,  item_type: 'veg',     tags: [],                       prep_time_minutes: 3  },
    { category_id: cat['Beverages'],   name: 'Masala Chai',          price: 60,  item_type: 'veg',     tags: [],                       prep_time_minutes: 5  },
    { category_id: cat['Beverages'],   name: 'Cold Coffee',          price: 140, item_type: 'veg',     tags: [],                       prep_time_minutes: 5  },
  ];

  const insertedItems = await knex('menu_items')
    .insert(items.map((item) => ({ ...item, tenant_id: tid, restaurant_id: rid })))
    .returning('*');

  // ── Modifier Groups ───────────────────────────────────────
  // Spice level for curries
  const spicyItems = insertedItems.filter((i) => ['Butter Chicken','Palak Paneer','Mutton Rogan Josh','Chicken 65'].includes(i.name));
  for (const item of spicyItems) {
    const [group] = await knex('modifier_groups').insert({
      tenant_id:   tid,
      menu_item_id: item.id,
      name:        'Spice Level',
      is_required: false,
      min_select:  0,
      max_select:  1,
    }).returning('*');

    await knex('modifier_options').insert([
      { tenant_id: tid, modifier_group_id: group.id, name: 'Mild',   price_delta: 0,  is_default: true  },
      { tenant_id: tid, modifier_group_id: group.id, name: 'Medium', price_delta: 0,  is_default: false },
      { tenant_id: tid, modifier_group_id: group.id, name: 'Hot',    price_delta: 0,  is_default: false },
      { tenant_id: tid, modifier_group_id: group.id, name: 'Extra Hot', price_delta: 0, is_default: false },
    ]);
  }

  // Size for Lassi
  const lassiItem = insertedItems.find((i) => i.name === 'Mango Lassi');
  if (lassiItem) {
    const [group] = await knex('modifier_groups').insert({
      tenant_id:   tid,
      menu_item_id: lassiItem.id,
      name:        'Size',
      is_required: true,
      min_select:  1,
      max_select:  1,
    }).returning('*');
    await knex('modifier_options').insert([
      { tenant_id: tid, modifier_group_id: group.id, name: 'Regular (300ml)', price_delta: 0,   is_default: true  },
      { tenant_id: tid, modifier_group_id: group.id, name: 'Large (500ml)',   price_delta: 40,  is_default: false },
    ]);
  }

  // Add-ons for Biryani
  const biryaniItems = insertedItems.filter((i) => i.name.includes('Biryani'));
  for (const item of biryaniItems) {
    const [group] = await knex('modifier_groups').insert({
      tenant_id:   tid,
      menu_item_id: item.id,
      name:        'Add-ons',
      is_required: false,
      min_select:  0,
      max_select:  3,
    }).returning('*');
    await knex('modifier_options').insert([
      { tenant_id: tid, modifier_group_id: group.id, name: 'Extra Raita',  price_delta: 40 },
      { tenant_id: tid, modifier_group_id: group.id, name: 'Extra Gravy',  price_delta: 60 },
      { tenant_id: tid, modifier_group_id: group.id, name: 'Boiled Egg',   price_delta: 30 },
    ]);
  }

  console.log(`✅  ${insertedItems.length} menu items seeded across ${categories.length} categories`);
};
