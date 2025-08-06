// models/userModel.js
const pool = require('../config/db');

const createUser = async ({ name, email, password, role, location, phone }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, location, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, email, password, role, location, phone]
  );
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
};

module.exports = {
  createUser,
  getUserByEmail,
};
