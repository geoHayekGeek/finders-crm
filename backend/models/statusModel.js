// models/statusModel.js
const pool = require('../config/db');

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    if (normalized === '1') return true;
    if (normalized === '0') return false;
  }

  return Boolean(value);
};

class Status {
  static async getAllStatuses() {
    const result = await pool.query(
      `SELECT * FROM statuses
       WHERE is_active = true
       ORDER BY COALESCE(is_default_status, FALSE) DESC, name ASC`
    );
    return result.rows;
  }

  static async getAllStatusesForAdmin() {
    const result = await pool.query(
      `SELECT * FROM statuses
       ORDER BY COALESCE(is_default_status, FALSE) DESC, name ASC`
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

  static async getDefaultStatusForPropertyCreation() {
    const result = await pool.query(
      `SELECT *
       FROM statuses
       WHERE is_active = true
         AND COALESCE(is_default_status, FALSE) = true
       ORDER BY id ASC
       LIMIT 1`
    );

    return result.rows[0];
  }

  static async ensureDefaultStatus(client) {
    // Keep inactive rows from holding the default flag. The default should always
    // point to an active status when one exists.
    await client.query(
      `UPDATE statuses
       SET is_default_status = false
       WHERE is_active = false
         AND COALESCE(is_default_status, FALSE) = true`
    );

    const existingDefault = await client.query(
      `SELECT id
       FROM statuses
       WHERE is_active = true
         AND COALESCE(is_default_status, FALSE) = true
       ORDER BY id ASC
       LIMIT 1`
    );

    if (existingDefault.rows[0]) {
      return existingDefault.rows[0].id;
    }

    const preferredActive = await client.query(
      `SELECT id
       FROM statuses
       WHERE is_active = true
         AND (LOWER(code) = 'active' OR LOWER(name) = 'active')
       ORDER BY id ASC
       LIMIT 1`
    );

    let candidateId = preferredActive.rows[0]?.id;

    if (!candidateId) {
      const firstActive = await client.query(
        `SELECT id
         FROM statuses
         WHERE is_active = true
         ORDER BY id ASC
         LIMIT 1`
      );

      candidateId = firstActive.rows[0]?.id;
    }

    if (!candidateId) {
      return null;
    }

    await client.query(
      `UPDATE statuses
       SET is_default_status = true
       WHERE id = $1`,
      [candidateId]
    );

    return candidateId;
  }

  static async createStatus(statusData) {
    const { name, code, description, color, is_active, can_be_referred, is_closure_status, is_default_status } = statusData;

    const normalizedIsDefaultStatus = normalizeBoolean(is_default_status, false);
    const normalizedIsActive = normalizedIsDefaultStatus ? true : normalizeBoolean(is_active, true);
    const normalizedCanBeReferred = normalizeBoolean(can_be_referred, true);
    const normalizedIsClosureStatus = normalizeBoolean(is_closure_status, false);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (normalizedIsDefaultStatus) {
        await client.query(
          `UPDATE statuses
           SET is_default_status = false
           WHERE COALESCE(is_default_status, FALSE) = true`
        );
      }

      const result = await client.query(
        `INSERT INTO statuses (
          name,
          code,
          description,
          color,
          is_active,
          can_be_referred,
          is_closure_status,
          is_default_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          name,
          code,
          description,
          color,
          normalizedIsActive,
          normalizedCanBeReferred,
          normalizedIsClosureStatus,
          normalizedIsDefaultStatus,
        ]
      );

      if (!normalizedIsDefaultStatus) {
        await this.ensureDefaultStatus(client);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id, updates) {
    const normalizedUpdates = { ...updates };

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'is_active')) {
      normalizedUpdates.is_active = normalizeBoolean(normalizedUpdates.is_active, true);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'is_default_status')) {
      normalizedUpdates.is_default_status = normalizeBoolean(normalizedUpdates.is_default_status, false);
    }

    if (normalizedUpdates.is_default_status === true) {
      normalizedUpdates.is_active = true;
    }

    if (normalizedUpdates.is_active === false) {
      normalizedUpdates.is_default_status = false;
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'can_be_referred')) {
      normalizedUpdates.can_be_referred = normalizeBoolean(normalizedUpdates.can_be_referred, true);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'is_closure_status')) {
      normalizedUpdates.is_closure_status = normalizeBoolean(normalizedUpdates.is_closure_status, false);
    }

    const fields = Object.keys(normalizedUpdates);
    const values = Object.values(normalizedUpdates);

    if (fields.length === 0) {
      return await this.getStatusById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE statuses
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (normalizedUpdates.is_default_status === true) {
        await client.query(
          `UPDATE statuses
           SET is_default_status = false
           WHERE COALESCE(is_default_status, FALSE) = true`
        );
      }

      const result = await client.query(query, [id, ...values]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await this.ensureDefaultStatus(client);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteStatus(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE statuses
         SET is_active = false,
             is_default_status = false,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await this.ensureDefaultStatus(client);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
      ORDER BY COALESCE(s.is_default_status, FALSE) DESC, s.name ASC
    `);
    return result.rows;
  }

  static async searchStatuses(searchTerm) {
    const result = await pool.query(
      `SELECT * FROM statuses
       WHERE is_active = true
       AND (name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1)
       ORDER BY COALESCE(is_default_status, FALSE) DESC, name ASC`,
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
