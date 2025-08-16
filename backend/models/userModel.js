// models/userModel.js
const pool = require('../config/db');

class User {
  static async createUser({ name, email, password, role, location, phone }) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, location, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, password, role, location, phone]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async updatePassword(email, hashedPassword) {
    console.log('🔄 Updating password for email:', email);
    console.log('🔐 New hash length:', hashedPassword.length);
    
    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING *`,
      [hashedPassword, email]
    );
    
    console.log('📊 Update query result:', {
      rowCount: result.rowCount,
      returnedRows: result.rows.length,
      email: result.rows[0]?.email
    });
    
    return result.rows[0];
  }

  static async getAllUsers() {
    const result = await pool.query(
      `SELECT id, name, email, role, location, phone, created_at, updated_at FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async getUsersByRole(role) {
    const result = await pool.query(
      `SELECT id, name, email, role, location, phone, created_at, updated_at FROM users WHERE role = $1 ORDER BY name`,
      [role]
    );
    return result.rows;
  }

  static async updateUser(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, role, location, phone, created_at, updated_at
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteUser(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = User;
