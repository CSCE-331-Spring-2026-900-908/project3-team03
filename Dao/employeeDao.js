const pool = require('../db/pool');

const getAllEmployees = async () => {
  const result = await pool.query('SELECT * FROM employee ORDER BY employee_id');
  return result.rows;
};

const getEmployeeById = async (employeeId) => {
  const result = await pool.query('SELECT * FROM employee WHERE employee_id = $1', [employeeId]);
  return result.rows[0] || null;
};

const getEmployeesByRole = async (role) => {
  const result = await pool.query('SELECT * FROM employee WHERE role = $1 ORDER BY employee_id', [role]);
  return result.rows;
};

const findEmployeeByUsername = async (username) => {
  const result = await pool.query('SELECT * FROM employee WHERE username = $1', [username]);
  return result.rows[0] || null;
};

const createEmployee = async ({ first_name, last_name, username, role, join_date, hourly_wage, active }) => {
  try {
    console.log('DAO: Creating employee with params:', { first_name, last_name, username, role, join_date, hourly_wage, active });
    
    const result = await pool.query(
      `INSERT INTO employee (first_name, last_name, username, role, join_date, hourly_wage, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [first_name, last_name, username, role, join_date || null, hourly_wage || 0, active ?? true]
    );
    
    console.log('DAO: Employee created, result:', result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error('DAO: Error creating employee:', err.message);
    console.error('DAO: Full error:', err);
    throw err;
  }
};

const updateEmployee = async (employeeId, updates = {}) => {
  const columns = Object.keys(updates);
  if (columns.length === 0) {
    return getEmployeeById(employeeId);
  }

  const setClauses = [];
  const values = [];

  columns.forEach((column, index) => {
    setClauses.push(`${column} = $${index + 1}`);
    values.push(updates[column]);
  });

  values.push(employeeId);
  const query = `UPDATE employee SET ${setClauses.join(', ')} WHERE employee_id = $${values.length} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const setEmployeeActive = async (employeeId, isActive) => {
  const result = await pool.query(
    'UPDATE employee SET active = $1 WHERE employee_id = $2 RETURNING *',
    [isActive, employeeId]
  );
  return result.rows[0] || null;
};

const deleteEmployee = async (employeeId) => {
  const result = await pool.query('DELETE FROM employee WHERE employee_id = $1 RETURNING *', [employeeId]);
  return result.rows[0] || null;
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeesByRole,
  findEmployeeByUsername,
  createEmployee,
  updateEmployee,
  setEmployeeActive,
  deleteEmployee
};