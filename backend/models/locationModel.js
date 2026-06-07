const pool = require('../config/db');

const normalizeName = (value) => (value ? String(value).trim() : '');

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
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }

  return Boolean(value);
};

class Location {
  static async getAllLocations() {
    const result = await pool.query(
      `SELECT *
       FROM locations
       WHERE is_active = true
       ORDER BY name ASC`
    );
    return result.rows;
  }

  static async getAllLocationsForAdmin() {
    const result = await pool.query(
      `SELECT
         l.*,
        COUNT(ce.id)::int AS event_count
       FROM locations l
       LEFT JOIN calendar_events ce ON ce.location_id = l.id
       GROUP BY l.id
       ORDER BY l.is_active DESC, l.name ASC`
    );
    return result.rows;
  }

  static async getLocationById(id) {
    const result = await pool.query(
      `SELECT *
       FROM locations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0];
  }

  static async getLocationByName(name) {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return null;
    }

    const result = await pool.query(
      `SELECT *
       FROM locations
       WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
       LIMIT 1`,
      [normalizedName]
    );
    return result.rows[0];
  }

  static async searchLocations(searchTerm) {
    const normalizedSearch = normalizeName(searchTerm);
    if (!normalizedSearch) {
      return this.getAllLocations();
    }

    const result = await pool.query(
      `SELECT *
       FROM locations
       WHERE is_active = true
         AND (name ILIKE $1 OR COALESCE(description, '') ILIKE $1)
       ORDER BY name ASC`,
      [`%${normalizedSearch}%`]
    );
    return result.rows;
  }

  static async createLocation(locationData) {
    const name = normalizeName(locationData.name);
    const description = locationData.description?.trim() || null;
    const isActive = normalizeBoolean(locationData.is_active, true);

    const result = await pool.query(
      `INSERT INTO locations (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, isActive]
    );

    return result.rows[0];
  }

  static async updateLocation(id, updates) {
    const normalizedUpdates = { ...updates };

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'name')) {
      normalizedUpdates.name = normalizeName(normalizedUpdates.name);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'description')) {
      normalizedUpdates.description = normalizedUpdates.description?.trim() || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'is_active')) {
      normalizedUpdates.is_active = normalizeBoolean(normalizedUpdates.is_active, true);
    }

    const fields = Object.keys(normalizedUpdates);
    const values = Object.values(normalizedUpdates);

    if (fields.length === 0) {
      return this.getLocationById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id, name
         FROM locations
         WHERE id = $1
         LIMIT 1`,
        [id]
      );

      if (!existing.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      const result = await client.query(
        `UPDATE locations
         SET ${setClause}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'name')) {
        await client.query(
          `UPDATE calendar_events
           SET location = $1
           WHERE location_id = $2`,
          [result.rows[0].name, id]
        );
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

  static async deleteLocation(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE locations
         SET is_active = false,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
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
}

module.exports = Location;
