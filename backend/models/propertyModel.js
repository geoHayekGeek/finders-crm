// models/propertyModel.js
const pool = require('../config/db');

class Property {
  static async createProperty({ title, address, price, status, type, beds, baths, sqft, agent_id, featured, images }) {
    const result = await pool.query(
      `INSERT INTO properties (title, address, price, status, type, beds, baths, sqft, agent_id, featured, images, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [title, address, price, status, type, beds, baths, sqft, agent_id, featured, images]
    );
    return result.rows[0];
  }

  static async getAllProperties() {
    const result = await pool.query(
      `SELECT p.*, u.name as agent_name, u.role as agent_role
       FROM properties p
       LEFT JOIN users u ON p.agent_id = u.id
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  }

  static async getPropertiesByAgent(agentId) {
    const result = await pool.query(
      `SELECT p.*, u.name as agent_name, u.role as agent_role
       FROM properties p
       LEFT JOIN users u ON p.agent_id = u.id
       WHERE p.agent_id = $1
       ORDER BY p.created_at DESC`,
      [agentId]
    );
    return result.rows;
  }

  static async getPropertyById(id) {
    const result = await pool.query(
      `SELECT p.*, u.name as agent_name, u.role as agent_role
       FROM properties p
       LEFT JOIN users u ON p.agent_id = u.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async updateProperty(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE properties 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteProperty(id) {
    const result = await pool.query(
      'DELETE FROM properties WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getPropertiesWithFilters(filters = {}) {
    let query = `
      SELECT p.*, u.name as agent_name, u.role as agent_role
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    if (filters.status && filters.status !== 'All') {
      query += ` AND p.status = $${valueIndex}`;
      values.push(filters.status);
      valueIndex++;
    }

    if (filters.type && filters.type !== 'All') {
      query += ` AND p.type = $${valueIndex}`;
      values.push(filters.type);
      valueIndex++;
    }

    if (filters.agent_id) {
      query += ` AND p.agent_id = $${valueIndex}`;
      values.push(filters.agent_id);
      valueIndex++;
    }

    if (filters.price_min) {
      query += ` AND CAST(REPLACE(REPLACE(p.price, '$', ''), ',', '') AS INTEGER) >= $${valueIndex}`;
      values.push(filters.price_min);
      valueIndex++;
    }

    if (filters.price_max) {
      query += ` AND CAST(REPLACE(REPLACE(p.price, '$', ''), ',', '') AS INTEGER) <= $${valueIndex}`;
      values.push(filters.price_max);
      valueIndex++;
    }

    if (filters.search) {
      query += ` AND (p.title ILIKE $${valueIndex} OR p.address ILIKE $${valueIndex} OR u.name ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getPropertyStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN status = 'For Sale' THEN 1 END) as for_sale,
        COUNT(CASE WHEN status = 'For Rent' THEN 1 END) as for_rent,
        COUNT(CASE WHEN status = 'Sold' THEN 1 END) as sold,
        COUNT(CASE WHEN status = 'Rented' THEN 1 END) as rented,
        COUNT(CASE WHEN featured = true THEN 1 END) as featured
      FROM properties
    `);
    return result.rows[0];
  }

  static async getPropertiesByLocation() {
    const result = await pool.query(`
      SELECT 
        SPLIT_PART(address, ', ', 2) as location,
        COUNT(*) as count
      FROM properties
      WHERE SPLIT_PART(address, ', ', 2) IS NOT NULL
      GROUP BY SPLIT_PART(address, ', ', 2)
      ORDER BY count DESC
    `);
    return result.rows;
  }

  static async getPropertiesByType() {
    const result = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count
      FROM properties
      GROUP BY type
      ORDER BY count DESC
    `);
    return result.rows;
  }
}

module.exports = Property;
