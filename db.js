const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  database: process.env.PSQL_DATABASE,
  password: process.env.PSQL_PASSWORD,
  port: process.env.PSQL_PORT,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Don't exit process - let the app handle DB errors gracefully
});

module.exports = { pool };