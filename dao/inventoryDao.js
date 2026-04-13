const pool = require('../db/pool');

// ------------------------ DASHBOARD QUERIES ------------------------
async function getLowStockItems(limit = 10) {
    const result = await pool.query(`
        SELECT
            name,
            quantity::numeric(10,2) AS quantity,
            reorder_point::numeric(10,2) AS reorder_point
        FROM ingredient
        WHERE active = TRUE
          AND reorder_point IS NOT NULL
          AND quantity <= reorder_point
        ORDER BY quantity ASC, name ASC
        LIMIT $1
    `, [limit]);

    return result.rows;
}

// ------------------------ INVENTORY QUERIES ------------------------
// Loads inventory table
async function getInventoryItems() {
    const result = await pool.query(`
        SELECT
            ingredient_id,
            name,
            unit,
            category,
            quantity::numeric(10,2) AS quantity,
            reorder_point::numeric(10,2) AS reorder_point,
            expiration_date,
            location
        FROM ingredient
        WHERE active = TRUE
        ORDER BY name ASC
    `);

    return result.rows;
}

// Inserts inv item
async function createInventoryItem({ name, unit, category, quantity, reorderPoint }) {
    const result = await pool.query(`
        INSERT INTO ingredient (
            name,
            unit,
            category,
            quantity,
            reorder_point,
            active
        )
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING ingredient_id, name
    `, [name, unit, category, quantity, reorderPoint]);

    return result.rows[0];
}

// Updates quantity given a name
async function updateInventoryQuantityByName(name, quantity) {
    const result = await pool.query(`
        UPDATE ingredient
        SET quantity = $2
        WHERE LOWER(name) = LOWER($1)
          AND active = TRUE
        RETURNING ingredient_id, name, quantity::numeric(10,2) AS quantity
    `, [name, quantity]);

    return result.rows[0] || null;
}

// sets inv item inactive
async function deactivateInventoryItemByName(name) {
    const result = await pool.query(`
        UPDATE ingredient
        SET active = FALSE
        WHERE LOWER(name) = LOWER($1)
          AND active = TRUE
        RETURNING ingredient_id, name
    `, [name]);

    return result.rows[0] || null;
}

// ------------------------ REPORTS QUERIES ------------------------
// Usage report
async function getUsageReport(startTime, endTime) {
    const result = await pool.query(`
        SELECT
            i.name AS ingredient_name,
            i.unit AS unit,
            COALESCE(SUM(u.used_amount), 0)::numeric(12,3) AS used_amount
        FROM (
            SELECT
                mir.ingredient_id,
                (d.quantity * mir.quantity_required) AS used_amount
            FROM orders o
            JOIN drink d ON d.order_id = o.order_id
            JOIN menu_item_recipe mir ON mir.menu_item_id = d.menu_item_id
            WHERE o.status = 'PAID'
              AND o.created_at >= $1
              AND o.created_at < $2

            UNION ALL

            SELECT
                mir.ingredient_id,
                (d.quantity * da.quantity * mir.quantity_required) AS used_amount
            FROM orders o
            JOIN drink d ON d.order_id = o.order_id
            JOIN drink_addon da ON da.drink_id = d.drink_id
            JOIN menu_item_recipe mir ON mir.menu_item_id = da.menu_item_id
            WHERE o.status = 'PAID'
              AND o.created_at >= $1
              AND o.created_at < $2
        ) u
        JOIN ingredient i ON i.ingredient_id = u.ingredient_id
        GROUP BY i.ingredient_id, i.name, i.unit
        ORDER BY used_amount DESC, i.name ASC
    `, [startTime, endTime]);

    return result.rows;
}

module.exports = {
    getInventoryItems,
    createInventoryItem,
    updateInventoryQuantityByName,
    deactivateInventoryItemByName,
    getLowStockItems,
    getUsageReport
};
