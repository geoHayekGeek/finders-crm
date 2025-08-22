// models/statusModel.js
const pool = require('../config/db');

class Status {
  static async getAllStatuses() {
    const result = await pool.query(
      `SELECT * FROM statuses WHERE is_active = true ORDER BY name ASC`
    );
    return result.rows;
  }

  static async getStatusById(id) {
    const result = await pool.query(
      `SELECT * FROM statuses WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async getStatusByCode(code) {
    const result = await pool.query(
      `SELECT * FROM statuses WHERE code = $1 AND is_active = true`,
      [code]
    );
    return result.rows[0];
  }

  static async createStatus(statusData) {
    const { name, code, description, color } = statusData;
    
    const result = await pool.query(
      `INSERT INTO statuses (name, code, description, color) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, code, description, color]
    );
    return result.rows[0];
  }

  static async updateStatus(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE statuses 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteStatus(id) {
    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE statuses SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async getStatusesWithPropertyCount() {
    const result = await pool.query(`
      SELECT 
        s.*,
        COUNT(p.id) as property_count
      FROM statuses s
      LEFT JOIN properties p ON s.id = p.status_id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    return result.rows;
  }

  static async searchStatuses(searchTerm) {
    const result = await pool.query(
      `SELECT * FROM statuses 
       WHERE is_active = true 
       AND (name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1)
       ORDER BY name ASC`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  }

  static async getStatusStats() {
    const result = await pool.query(`
      SELECT 
        s.name,
        s.color,
        COUNT(p.id) as count
      FROM statuses s
      LEFT JOIN properties p ON s.id = p.status_id
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.color
      ORDER BY count DESC
    `);
    return result.rows;
  }
}

module.exports = Status;
