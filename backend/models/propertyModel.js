// models/propertyModel.js
const pool = require('../config/db');

class Property {
  static async createProperty(propertyData) {
    const {
      status_id,
      location,
      category_id,
      building_name,
      owner_name,
      phone_number,
      surface,
      details,
      interior_details,
      built_year,
      view_type,
      concierge,
      agent_id,
      price,
      notes,
      referral_source,
      referral_dates
    } = propertyData;

    // Generate reference number
    const category = await pool.query('SELECT code FROM categories WHERE id = $1', [category_id]);
    if (!category.rows[0]) {
      throw new Error('Invalid category');
    }

    const refNumber = await pool.query(
      'SELECT generate_reference_number($1, $2)',
      [category.rows[0].code, 'F'] // F for Finders
    );

    const result = await pool.query(
      `INSERT INTO properties (
        reference_number, status_id, location, category_id, building_name, 
        owner_name, phone_number, surface, details, interior_details, 
        built_year, view_type, concierge, agent_id, price, notes, 
        referral_source, referral_dates
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        refNumber.rows[0].generate_reference_number, status_id, location, category_id, building_name,
        owner_name, phone_number, surface, details, interior_details,
        built_year, view_type, concierge, agent_id, price, notes,
        referral_source, referral_dates
      ]
    );
    return result.rows[0];
  }

  static async getAllProperties() {
    const result = await pool.query('SELECT * FROM get_properties_with_details()');
    return result.rows;
  }

  static async getPropertiesByAgent(agentId) {
    const result = await pool.query(
      `SELECT * FROM get_properties_with_details() WHERE agent_id = $1`,
      [agentId]
    );
    return result.rows;
  }

  static async getPropertyById(id) {
    const result = await pool.query(
      `SELECT * FROM get_properties_with_details() WHERE id = $1`,
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
      SELECT * FROM get_properties_with_details() WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    if (filters.status_id && filters.status_id !== 'All') {
      query += ` AND status_id = $${valueIndex}`;
      values.push(filters.status_id);
      valueIndex++;
    }

    if (filters.category_id && filters.category_id !== 'All') {
      query += ` AND category_id = $${valueIndex}`;
      values.push(filters.category_id);
      valueIndex++;
    }

    if (filters.agent_id) {
      query += ` AND agent_id = $${valueIndex}`;
      values.push(filters.agent_id);
      valueIndex++;
    }

    if (filters.price_min) {
      query += ` AND price >= $${valueIndex}`;
      values.push(filters.price_min);
      valueIndex++;
    }

    if (filters.price_max) {
      query += ` AND price <= $${valueIndex}`;
      values.push(filters.price_max);
      valueIndex++;
    }

    if (filters.search) {
      query += ` AND (reference_number ILIKE $${valueIndex} OR location ILIKE $${valueIndex} OR owner_name ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    if (filters.view_type && filters.view_type !== 'All') {
      query += ` AND view_type = $${valueIndex}`;
      values.push(filters.view_type);
      valueIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getPropertyStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN s.code = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN s.code = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN s.code = 'sold' THEN 1 END) as sold,
        COUNT(CASE WHEN s.code = 'rented' THEN 1 END) as rented,
        COUNT(CASE WHEN s.code = 'under_contract' THEN 1 END) as under_contract
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id
    `);
    return result.rows[0];
  }

  static async getPropertiesByLocation() {
    const result = await pool.query(`
      SELECT 
        location,
        COUNT(*) as count
      FROM properties
      GROUP BY location
      ORDER BY count DESC
      LIMIT 20
    `);
    return result.rows;
  }

  static async getPropertiesByCategory() {
    const result = await pool.query(`
      SELECT 
        c.name as category_name,
        c.code as category_code,
        COUNT(p.id) as count
      FROM categories c
      LEFT JOIN properties p ON c.id = p.category_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.code
      ORDER BY count DESC
    `);
    return result.rows;
  }

  static async getPropertiesByStatus() {
    const result = await pool.query(`
      SELECT 
        s.name as status_name,
        s.color as status_color,
        COUNT(p.id) as count
      FROM statuses s
      LEFT JOIN properties p ON s.id = p.status_id
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.color
      ORDER BY count DESC
    `);
    return result.rows;
  }

  static async getPropertiesByView() {
    const result = await pool.query(`
      SELECT 
        view_type,
        COUNT(*) as count
      FROM properties
      WHERE view_type IS NOT NULL
      GROUP BY view_type
      ORDER BY count DESC
    `);
    return result.rows;
  }

  static async getPropertiesByPriceRange() {
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN price < 100000 THEN 'Under $100k'
          WHEN price < 500000 THEN '$100k - $500k'
          WHEN price < 1000000 THEN '$500k - $1M'
          WHEN price < 5000000 THEN '$1M - $5M'
          ELSE 'Over $5M'
        END as price_range,
        COUNT(*) as count
      FROM properties
      WHERE price IS NOT NULL
      GROUP BY price_range
      ORDER BY 
        CASE price_range
          WHEN 'Under $100k' THEN 1
          WHEN '$100k - $500k' THEN 2
          WHEN '$500k - $1M' THEN 3
          WHEN '$1M - $5M' THEN 4
          ELSE 5
        END
    `);
    return result.rows;
  }
}

module.exports = Property;
