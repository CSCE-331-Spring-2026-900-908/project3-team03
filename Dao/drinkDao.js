const { pool } = require('../db');

const getAllDrinks = async () => {
  const result = await pool.query('SELECT * FROM drink ORDER BY drink_id');
  return result.rows;
};

const getDrinkById = async (drinkId) => {
  const result = await pool.query('SELECT * FROM drink WHERE drink_id = $1', [drinkId]);
  return result.rows[0] || null;
};

const getDrinksByOrderId = async (orderId) => {
  const result = await pool.query('SELECT * FROM drink WHERE order_id = $1 ORDER BY drink_id', [orderId]);
  return result.rows;
};

const createDrink = async ({ order_id, menu_item_id, quantity = 1, ice_amount, sugar_amount, special_notes, base_price }) => {
  const result = await pool.query(
    `INSERT INTO drink (order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes, base_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes || null, base_price]
  );
  return result.rows[0];
};

const updateDrink = async (drinkId, updates = {}) => {
  const columns = Object.keys(updates);
  if (columns.length === 0) {
    return getDrinkById(drinkId);
  }

  const setClauses = [];
  const values = [];

  columns.forEach((column, index) => {
    setClauses.push(`${column} = $${index + 1}`);
    values.push(updates[column]);
  });

  values.push(drinkId);
  const query = `UPDATE drink SET ${setClauses.join(', ')} WHERE drink_id = $${values.length} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const deleteDrink = async (drinkId) => {
  const result = await pool.query('DELETE FROM drink WHERE drink_id = $1 RETURNING *', [drinkId]);
  return result.rows[0] || null;
};

module.exports = {
  getAllDrinks,
  getDrinkById,
  getDrinksByOrderId,
  createDrink,
  updateDrink,
  deleteDrink
};