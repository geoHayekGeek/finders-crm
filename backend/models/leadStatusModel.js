// models/leadStatusModel.js
const pool = require('../config/db');

class LeadStatus {
  static async getAllStatuses() {
    const result = await pool.query(`
      SELECT id, status_name, code, color, description, is_active, can_be_referred, created_at, modified_at
      FROM lead_statuses 
      ORDER BY id
    `);
    return result.rows;
  }

  static async getStatusById(id) {
    const result = await pool.query(`
      SELECT id, status_name, code, color, description, is_active, can_be_referred, created_at, modified_at
      FROM lead_statuses 
      WHERE id = $1
    `, [id]);
    return result.rows[0];
  }

  static async getStatusByName(statusName) {
    const result = await pool.query(`
      SELECT id, status_name, code, color, description, is_active, can_be_referred, created_at, modified_at
      FROM lead_statuses 
      WHERE LOWER(status_name) = LOWER($1)
    `, [statusName]);
    return result.rows[0];
  }

  static async createStatus(statusData) {
    const { status_name, code, color, description, is_active, can_be_referred } = statusData;
    const result = await pool.query(`
      INSERT INTO lead_statuses (status_name, code, color, description, is_active, can_be_referred)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [status_name, code, color, description, is_active !== undefined ? is_active : true, can_be_referred !== undefined ? can_be_referred : true]);
    return result.rows[0];
  }

  static async updateStatus(id, statusData) {
    const { status_name, code, color, description, is_active, can_be_referred } = statusData;
    const result = await pool.query(`
      UPDATE lead_statuses 
      SET status_name = $1, code = $2, color = $3, description = $4, is_active = $5, can_be_referred = $6
      WHERE id = $7
      RETURNING *
    `, [status_name, code, color, description, is_active !== undefined ? is_active : true, can_be_referred !== undefined ? can_be_referred : true, id]);
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
