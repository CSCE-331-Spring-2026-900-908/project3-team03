const pool = require('../db/pool');

const getAllDrinks = async () => {
  try {
    console.log('DAO: Fetching all drinks');
    const result = await pool.query('SELECT * FROM drink ORDER BY drink_id');
    console.log('DAO: Retrieved', result.rows.length, 'drinks');
    return result.rows;
  } catch (err) {
    console.error('DAO: Error fetching all drinks:', err.message);
    throw err;
  }
};

const getDrinkById = async (drinkId) => {
  try {
    console.log('DAO: Fetching drink by ID:', drinkId);
    const result = await pool.query('SELECT * FROM drink WHERE drink_id = $1', [drinkId]);
    console.log('DAO: Drink found:', result.rows[0] ? 'Yes' : 'No');
    return result.rows[0] || null;
  } catch (err) {
    console.error('DAO: Error fetching drink by ID:', err.message);
    throw err;
  }
};

const getDrinksByOrderId = async (orderId) => {
  try {
    console.log('DAO: Fetching drinks for order:', orderId);
    const result = await pool.query('SELECT * FROM drink WHERE order_id = $1 ORDER BY drink_id', [orderId]);
    console.log('DAO: Retrieved', result.rows.length, 'drinks for order', orderId);
    return result.rows;
  } catch (err) {
    console.error('DAO: Error fetching drinks for order:', err.message);
    throw err;
  }
};

const createDrink = async ({ order_id, menu_item_id, quantity = 1, ice_amount, sugar_amount, special_notes, base_price }) => {
  try {
    console.log('DAO: Creating drink with params:', { order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes, base_price });
    
    const result = await pool.query(
      `INSERT INTO drink (order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes, base_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes || null, base_price]
    );
    
    console.log('DAO: Drink created successfully, result:', result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error('DAO: Error creating drink:', err.message);
    console.error('DAO: Full error:', err);
    throw err;
  }
};

const updateDrink = async (drinkId, updates = {}) => {
  try {
    console.log('DAO: Updating drink', drinkId, 'with updates:', updates);
    
    const columns = Object.keys(updates);
    if (columns.length === 0) {
      console.log('DAO: No updates provided, fetching current drink');
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
    
    console.log('DAO: Drink updated successfully, result:', result.rows[0]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('DAO: Error updating drink:', err.message);
    throw err;
  }
};

const deleteDrink = async (drinkId) => {
  try {
    console.log('DAO: Deleting drink:', drinkId);
    const result = await pool.query('DELETE FROM drink WHERE drink_id = $1 RETURNING *', [drinkId]);
    console.log('DAO: Drink deleted successfully, result:', result.rows[0]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('DAO: Error deleting drink:', err.message);
    throw err;
  }
};

module.exports = {
  getAllDrinks,
  getDrinkById,
  getDrinksByOrderId,
  createDrink,
  updateDrink,
  deleteDrink
};