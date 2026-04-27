const pool = require('../db/pool');


async function get_all_menu_items() {
    const res = await pool.query(`
        SELECT 
            menu_item_id, 
            name, 
            category, 
            base_price, 
            active     
        FROM menu_item
        ORDER BY menu_item_id   
    `);

    return res.rows;

    /*
    const menu_items = [];

    for (let i = 0; i < res.rows.length; i++) {
        let menu_item = res.rows[i];
        menu_items.push(
            new MenuItem(
                menu_item.menu_item_id,
                menu_item.name,
                menu_item.category,
                menu_item.base_price,
                menu_item.active    
            )
        );
    }

    return menu_items;
    */
}

async function get_menu_item_by_id(menu_item_id) {
    const res = await pool.query(`
        SELECT
            menu_item_id,
            name,
            category,
            base_price,
            description,
            active
        FROM menu_item
        WHERE menu_item_id = $1
    `, [menu_item_id]);

    return res.rows[0] || null;
}

async function get_active_menu_items() {
    const res = await pool.query(`
        SELECT 
            menu_item_id, 
            name, 
            category, 
            base_price, 
            active     
        FROM menu_item
        ORDER BY menu_item_id   
    `);
    
    return res.rows.filter(menu_item => menu_item.active == true);

}

async function get_active_drink_items() {
    const res = await pool.query(`
        SELECT 
            menu_item_id, 
            name, 
            category, 
            base_price, 
            active     
        FROM menu_item
        WHERE category != 'ADDON'
        ORDER BY menu_item_id   
    `);
    
    return res.rows.filter(menu_item => menu_item.active == true);
}

async function get_active_addons() {
    const res = await pool.query(`
        SELECT 
            menu_item_id, 
            name, 
            category, 
            base_price, 
            active     
        FROM menu_item
        WHERE category = 'ADDON'
        ORDER BY menu_item_id   
    `);
    
    return res.rows.filter(menu_item => menu_item.active == true);
}

async function get_active_drink_items_by_category(category) {
    const res = await pool.query(`
        SELECT 
            menu_item_id, 
            name, 
            category, 
            base_price, 
            active     
        FROM menu_item
        WHERE category = $1
        ORDER BY menu_item_id   
    `, [category]);

    console.log('ROWS', res.rows);
    
    return res.rows.filter(menu_item => menu_item.active == true);
}

async function get_ingredients(menu_item_id) {
    const res = await pool.query(`
        SELECT 
            ingredient_id, 
            quantity_required 
        FROM menu_item_recipe 
        WHERE menu_item_id = $1
    `, [menu_item_id]);

    return res.rows;

}

async function get_all_ingredients() {
    const res = await pool.query(`
        SELECT
            ingredient_id,
            name,
            unit,
            category,
            active
        FROM ingredient
        WHERE active = TRUE
        ORDER BY name ASC
    `);

    return res.rows;
}

async function get_price(menu_item_id) {
    const res = await pool.query(`
        SELECT base_price 
        FROM menu_item 
        WHERE menu_item_id = $1
    `, [menu_item_id]);

    //console.log("base price: ", res.rows[0].base_price);

    return res.rows[0].base_price;
}

async function is_addon(menu_item_id) {
    const res = await pool.query(`
        SELECT category 
        FROM menu_item 
        WHERE menu_item_id = $1
    `, [menu_item_id]);

    return res.rows[0].category.localeCompare('ADDON') == 0;

}

async function toggle_active(menu_item_id) {
    const res = await pool.query(`
        UPDATE menu_item
        SET active = NOT active
        WHERE menu_item_id = $1
    `, [menu_item_id]);

}

async function deactivate_menu_item(menu_item_id) {
    const res = await pool.query(`
        UPDATE menu_item
        SET active = FALSE
        WHERE menu_item_id = $1
        RETURNING menu_item_id, name, category, active
    `, [menu_item_id]);

    return res.rows[0] || null;
}

async function update_price(menu_item_id, new_price) {
    const res = await pool.query(`
        UPDATE menu_item 
        SET base_price = $1 
        WHERE menu_item_id = $2
    `, [new_price, menu_item_id]);
}

async function insert_menu_item(name, category, base_price, description, active) {
    const res = await pool.query(`
        INSERT INTO menu_item (name, category, base_price, description, active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING menu_item_id, name
    `, [name, category, base_price, description, active]);

    return res.rows[0];
}

async function add_recipe_ingredient(menu_item_id, ingredient_id, qty_required) {
    const res = await pool.query(`
        INSERT INTO menu_item_recipe (menu_item_id, ingredient_id, quantity_required)
        VALUES ($1, $2, $3)
        ON CONFLICT (menu_item_id, ingredient_id)
        DO UPDATE SET quantity_required = EXCLUDED.quantity_required
    `, [menu_item_id, ingredient_id, qty_required]);

}

async function remove_recipe_ingredient(menu_item_id, ingredient_id) {
    const res = await pool.query(`
        DELETE FROM menu_item_recipe
        WHERE menu_item_id = $1
          AND ingredient_id = $2
        RETURNING menu_item_id, ingredient_id
    `, [menu_item_id, ingredient_id]);

    return res.rows[0] || null;
}

async function get_recipe_lines(menu_item_id) {
    const res = await pool.query(`
        SELECT i.ingredient_id, i.name, r.quantity_required
        FROM menu_item_recipe r
        JOIN ingredient i ON r.ingredient_id = i.ingredient_id
        WHERE r.menu_item_id = $1
        ORDER BY i.name
    `, [menu_item_id]);

    return res.rows.map(row => ({
        ingredient_id: row.ingredient_id,
        name: row.name,
        quantity_required: row.quantity_required,
        label: `${row.name} (${row.quantity_required})`
    }));
}

async function get_default_addons_by_drink(menu_item_ids) {
    if (!Array.isArray(menu_item_ids) || menu_item_ids.length === 0) {
        return {};
    }

    const res = await pool.query(`
        WITH drink_ids AS (
            SELECT unnest($1::bigint[]) AS drink_id
        )
        SELECT d.drink_id, a.menu_item_id AS addon_id
        FROM drink_ids d
        JOIN menu_item a
          ON a.category = 'ADDON'
         AND a.active = TRUE
        WHERE EXISTS (
            SELECT 1
            FROM menu_item_recipe ar
            WHERE ar.menu_item_id = a.menu_item_id
        )
          AND NOT EXISTS (
            SELECT 1
            FROM menu_item_recipe ar
            WHERE ar.menu_item_id = a.menu_item_id
              AND NOT EXISTS (
                SELECT 1
                FROM menu_item_recipe dr
                WHERE dr.menu_item_id = d.drink_id
                  AND dr.ingredient_id = ar.ingredient_id
              )
        )
        ORDER BY d.drink_id, a.menu_item_id
    `, [menu_item_ids]);

    const addonMap = {};

    for (const row of res.rows) {
        const drinkId = String(row.drink_id);
        if (!addonMap[drinkId]) {
            addonMap[drinkId] = [];
        }
        addonMap[drinkId].push(row.addon_id);
    }

    return addonMap;
}

async function create_ingredient(name, unit, category) {
    const res = await pool.query(`
        INSERT INTO ingredient (name, unit, category, active)
        VALUES ($1, $2, $3, TRUE)
        RETURNING ingredient_id, name
    `, [name, unit, category]);

    return res.rows[0];
}



module.exports = {
    get_active_menu_items,
    get_all_menu_items,
    get_active_drink_items,
    get_active_drink_items_by_category,
    get_active_addons,
    get_menu_item_by_id,
    get_ingredients,
    get_all_ingredients,
    get_price,
    is_addon,
    toggle_active,
    deactivate_menu_item,
    update_price,
    insert_menu_item,
    add_recipe_ingredient,
    remove_recipe_ingredient,
    get_recipe_lines,
    get_default_addons_by_drink,
    create_ingredient
};
