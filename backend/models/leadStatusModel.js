// models/leadStatusModel.js
const pool = require('../config/db');

class LeadStatus {
  static async getAllStatuses() {
    const result = await pool.query(`
      SELECT id, status_name, code, color, description, is_active, created_at, modified_at
      FROM lead_statuses 
      ORDER BY id
    `);
    return result.rows;
  }

  static async getStatusById(id) {
    const result = await pool.query(`
      SELECT id, status_name, code, color, description, is_active, created_at, modified_at
      FROM lead_statuses 
      WHERE id = $1
    `, [id]);
    return result.rows[0];
  }

  static async createStatus(statusData) {
    const { status_name, code, color, description, is_active } = statusData;
    const result = await pool.query(`
      INSERT INTO lead_statuses (status_name, code, color, description, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [status_name, code, color, description, is_active]);
    return result.rows[0];
  }

  static async updateStatus(id, statusData) {
    const { status_name, code, color, description, is_active } = statusData;
    const result = await pool.query(`
      UPDATE lead_statuses 
      SET status_name = $1, code = $2, color = $3, description = $4, is_active = $5
      WHERE id = $6
      RETURNING *
    `, [status_name, code, color, description, is_active, id]);
    return result.rows[0];
  }

  static async deleteStatus(id) {
    const result = await pool.query(`
      DELETE FROM lead_statuses 
      WHERE id = $1 
      RETURNING *
    `, [id]);
    return result.rows[0];
  }
}

module.exports = LeadStatus;
