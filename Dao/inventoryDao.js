const pool = require('../db/pool');

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

module.exports = {
    getLowStockItems
};
