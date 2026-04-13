const { pool } = require('../db');


//Inserts inv item
async function insertInventoryItem(item) {
    await pool.query(`
        INSERT INTO ingredient
        (name, unit, category, spoils, reorder_point, active, quantity, expiration_date, location)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
        item.name,
        "units",
        "GENERAL",
        false,
        item.reorder,
        true,
        item.onHand,
        "2026-12-31",
        "Back Shelf A"
    ]);
}

//Gets all active inv items
async function getAllInventoryItems() {
    const res = await pool.query(`
        SELECT 
            name,
            quantity AS "onHand",
            reorder_point AS "parLevel",
            reorder_point AS "reorder"
        FROM ingredient
        WHERE active = true
        ORDER BY name
    `);

    return res.rows;
}

//Get active ingredients
async function getMenuActiveIngredients() {
    const res = await pool.query(`
        SELECT ingredient_id, name
        FROM ingredient
        WHERE active = true
        ORDER BY name
    `);

    return res.rows;
}

//Get quantity using given id
async function getQuantity(ingredientId) {
    const res = await pool.query(`
        SELECT quantity
        FROM ingredient
        WHERE ingredient_id = $1
    `, [ingredientId]);

    if (res.rows.length === 0) return -1;

    return res.rows[0].quantity;
}

//Updates quantity given a name
async function updateQuantityByName(name, newQuantity) {
    await pool.query(`
        UPDATE ingredient
        SET quantity = $1
        WHERE name = $2 AND active = true
    `, [newQuantity, name]);
}

//sets inv item inactive
async function deleteInventoryItem(name) {
    const res = await pool.query(`
        UPDATE ingredient
        SET active = false
        WHERE name = $1
        RETURNING *
    `, [name]);

    return res.rowCount;
}

//Inserts inv item and returns ID
async function insertIngredientReturningId(name) {
    const res = await pool.query(`
        INSERT INTO ingredient 
        (name, unit, category, spoils, reorder_point, active, quantity, expiration_date, location)
        VALUES ($1, 'units', 'GENERAL', false, 0, true, 0, NULL, 'N/A')
        RETURNING ingredient_id
    `, [name]);

    return res.rows[0].ingredient_id;
}

module.exports = {
    insertInventoryItem,
    getAllInventoryItems,
    getMenuActiveIngredients,
    getQuantity,
    updateQuantityByName,
    deleteInventoryItem,
    insertIngredientReturningId
};