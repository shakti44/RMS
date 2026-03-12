/**
 * Seed: Inventory items + recipes (BOM) for key menu items.
 */
exports.seed = async (knex) => {
  const tenant     = await knex('tenants').where({ slug: 'demo-bistro' }).first();
  const restaurant = await knex('restaurants').where({ tenant_id: tenant.id }).first();
  if (!tenant || !restaurant) throw new Error('Run seeds 01-04 first');

  const exists = await knex('inventory_items').where({ tenant_id: tenant.id }).first();
  if (exists) return;

  const tid = tenant.id;
  const rid = restaurant.id;

  const inventoryData = [
    { name: 'Chicken (Boneless)', unit: 'kg',    quantity_on_hand: 10,   reorder_level: 3,   cost_per_unit: 320  },
    { name: 'Mutton',             unit: 'kg',    quantity_on_hand: 5,    reorder_level: 2,   cost_per_unit: 620  },
    { name: 'Paneer',             unit: 'kg',    quantity_on_hand: 8,    reorder_level: 2,   cost_per_unit: 280  },
    { name: 'Basmati Rice',       unit: 'kg',    quantity_on_hand: 20,   reorder_level: 5,   cost_per_unit: 90   },
    { name: 'Tomatoes',           unit: 'kg',    quantity_on_hand: 6,    reorder_level: 2,   cost_per_unit: 30   },
    { name: 'Onions',             unit: 'kg',    quantity_on_hand: 10,   reorder_level: 3,   cost_per_unit: 25   },
    { name: 'Cooking Oil',        unit: 'litre', quantity_on_hand: 10,   reorder_level: 3,   cost_per_unit: 130  },
    { name: 'Butter',             unit: 'kg',    quantity_on_hand: 3,    reorder_level: 1,   cost_per_unit: 450  },
    { name: 'Cream',              unit: 'litre', quantity_on_hand: 4,    reorder_level: 1,   cost_per_unit: 200  },
    { name: 'All-Purpose Flour',  unit: 'kg',    quantity_on_hand: 15,   reorder_level: 3,   cost_per_unit: 45   },
    { name: 'Spinach',            unit: 'kg',    quantity_on_hand: 3,    reorder_level: 1,   cost_per_unit: 40   },
    { name: 'Black Lentils',      unit: 'kg',    quantity_on_hand: 5,    reorder_level: 1.5, cost_per_unit: 120  },
    { name: 'Mango Pulp',         unit: 'litre', quantity_on_hand: 5,    reorder_level: 1,   cost_per_unit: 90   },
    { name: 'Yoghurt',            unit: 'kg',    quantity_on_hand: 6,    reorder_level: 2,   cost_per_unit: 65   },
    { name: 'Milk',               unit: 'litre', quantity_on_hand: 8,    reorder_level: 2,   cost_per_unit: 55   },
    { name: 'Sugar',              unit: 'kg',    quantity_on_hand: 5,    reorder_level: 1,   cost_per_unit: 48   },
    { name: 'Tea Leaves',         unit: 'g',     quantity_on_hand: 500,  reorder_level: 100, cost_per_unit: 0.8  },
    { name: 'Eggs',               unit: 'dozen', quantity_on_hand: 5,    reorder_level: 2,   cost_per_unit: 95   },
    { name: 'Lemon',              unit: 'piece', quantity_on_hand: 30,   reorder_level: 10,  cost_per_unit: 5    },
    { name: 'Maida (refined)',    unit: 'kg',    quantity_on_hand: 10,   reorder_level: 2,   cost_per_unit: 42   },
  ];

  const invItems = await knex('inventory_items')
    .insert(inventoryData.map((i) => ({ ...i, tenant_id: tid, restaurant_id: rid })))
    .returning('*');

  const inv = Object.fromEntries(invItems.map((i) => [i.name, i.id]));

  // ── Recipes (BOM per 1 serving) ───────────────────────────
  const menuItems = await knex('menu_items').where({ tenant_id: tid, restaurant_id: rid });
  const menu      = Object.fromEntries(menuItems.map((m) => [m.name, m.id]));

  const recipes = [
    // Butter Chicken — per portion
    { menu_item_id: menu['Butter Chicken'],        inv_id: inv['Chicken (Boneless)'], qty: 0.200 },
    { menu_item_id: menu['Butter Chicken'],        inv_id: inv['Tomatoes'],           qty: 0.100 },
    { menu_item_id: menu['Butter Chicken'],        inv_id: inv['Butter'],             qty: 0.030 },
    { menu_item_id: menu['Butter Chicken'],        inv_id: inv['Cream'],              qty: 0.050 },
    { menu_item_id: menu['Butter Chicken'],        inv_id: inv['Onions'],             qty: 0.100 },

    // Chicken Biryani
    { menu_item_id: menu['Chicken Biryani'],       inv_id: inv['Chicken (Boneless)'], qty: 0.250 },
    { menu_item_id: menu['Chicken Biryani'],       inv_id: inv['Basmati Rice'],       qty: 0.200 },
    { menu_item_id: menu['Chicken Biryani'],       inv_id: inv['Yoghurt'],            qty: 0.060 },
    { menu_item_id: menu['Chicken Biryani'],       inv_id: inv['Onions'],             qty: 0.080 },

    // Palak Paneer
    { menu_item_id: menu['Palak Paneer'],          inv_id: inv['Paneer'],             qty: 0.150 },
    { menu_item_id: menu['Palak Paneer'],          inv_id: inv['Spinach'],            qty: 0.200 },
    { menu_item_id: menu['Palak Paneer'],          inv_id: inv['Cream'],              qty: 0.030 },

    // Dal Makhani
    { menu_item_id: menu['Dal Makhani'],           inv_id: inv['Black Lentils'],      qty: 0.100 },
    { menu_item_id: menu['Dal Makhani'],           inv_id: inv['Butter'],             qty: 0.030 },
    { menu_item_id: menu['Dal Makhani'],           inv_id: inv['Cream'],              qty: 0.020 },

    // Butter Naan
    { menu_item_id: menu['Butter Naan'],           inv_id: inv['Maida (refined)'],    qty: 0.100 },
    { menu_item_id: menu['Butter Naan'],           inv_id: inv['Butter'],             qty: 0.015 },

    // Mango Lassi
    { menu_item_id: menu['Mango Lassi'],           inv_id: inv['Mango Pulp'],         qty: 0.150 },
    { menu_item_id: menu['Mango Lassi'],           inv_id: inv['Yoghurt'],            qty: 0.100 },
    { menu_item_id: menu['Mango Lassi'],           inv_id: inv['Sugar'],              qty: 0.020 },

    // Masala Chai
    { menu_item_id: menu['Masala Chai'],           inv_id: inv['Tea Leaves'],         qty: 4 },    // grams
    { menu_item_id: menu['Masala Chai'],           inv_id: inv['Milk'],               qty: 0.150 },
    { menu_item_id: menu['Masala Chai'],           inv_id: inv['Sugar'],              qty: 0.015 },

    // Paneer Tikka
    { menu_item_id: menu['Paneer Tikka'],          inv_id: inv['Paneer'],             qty: 0.200 },
    { menu_item_id: menu['Paneer Tikka'],          inv_id: inv['Yoghurt'],            qty: 0.050 },
    { menu_item_id: menu['Paneer Tikka'],          inv_id: inv['Cooking Oil'],        qty: 0.020 },
  ].filter((r) => r.menu_item_id && r.inv_id);

  await knex('menu_item_ingredients').insert(
    recipes.map((r) => ({
      tenant_id:         tid,
      menu_item_id:      r.menu_item_id,
      inventory_item_id: r.inv_id,
      quantity_used:     r.qty,
    }))
  );

  // ── Demo coupons ──────────────────────────────────────────
  await knex('coupons').insert([
    {
      tenant_id:   tid,
      code:        'WELCOME10',
      coupon_type: 'percent',
      value:       10,
      max_discount: 100,
      min_order:   200,
      usage_limit: 100,
      is_active:   true,
    },
    {
      tenant_id:   tid,
      code:        'FLAT50',
      coupon_type: 'flat',
      value:       50,
      min_order:   300,
      usage_limit: 50,
      is_active:   true,
    },
  ]);

  console.log(`✅  ${invItems.length} inventory items seeded`);
  console.log(`✅  ${recipes.length} recipe entries seeded`);
  console.log('✅  Coupons: WELCOME10 (10% off), FLAT50 (₹50 off)');
};
