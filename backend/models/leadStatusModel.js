// models/leadStatusModel.js
const pool = require('../config/db');

class LeadStatus {
  static async getAllStatuses() {
    const result = await pool.query(`
      SELECT id, status_name, created_at, modified_at
      FROM lead_statuses 
      ORDER BY id
    `);
    return result.rows;
  }

  static async getStatusById(id) {
    const result = await pool.query(`
      SELECT id, status_name, created_at, modified_at
      FROM lead_statuses 
      WHERE id = $1
    `, [id]);
    return result.rows[0];
  }

  static async createStatus(statusName) {
    const result = await pool.query(`
      INSERT INTO lead_statuses (status_name)
      VALUES ($1)
      RETURNING *
    `, [statusName]);
    return result.rows[0];
  }

  static async updateStatus(id, statusName) {
    const result = await pool.query(`
      UPDATE lead_statuses 
      SET status_name = $1
      WHERE id = $2
      RETURNING *
    `, [statusName, id]);
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
