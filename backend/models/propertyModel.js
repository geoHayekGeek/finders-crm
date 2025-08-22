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
      referral_dates,
      main_image,
      image_gallery
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
        referral_source, referral_dates, main_image, image_gallery
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        refNumber.rows[0].generate_reference_number, status_id, location, category_id, building_name,
        owner_name, phone_number, surface, details, interior_details,
        built_year, view_type, concierge, agent_id, price, notes,
        referral_source, referral_dates, main_image, image_gallery
      ]
    );
    return result.rows[0];
  }

  static async getAllProperties() {
    try {
      console.log('🔍 Executing getAllProperties query...');
      const result = await pool.query(`
        SELECT 
          p.id,
          p.reference_number,
          s.name as status_name,
          s.color as status_color,
          p.location,
          c.name as category_name,
          c.code as category_code,
          p.building_name,
          p.owner_name,
          p.phone_number,
          p.surface,
                  CASE 
          WHEN p.details IS NULL THEN NULL 
          WHEN p.details = '' THEN NULL
          ELSE 
            CASE 
              WHEN p.details ~ '^[\\[\\{].*[\\]\\}]$' THEN p.details::jsonb
              ELSE NULL
            END
        END as details,
          p.interior_details,
          p.built_year,
          p.view_type,
          p.concierge,
          u.name as agent_name,
          u.role as agent_role,
          p.price,
          p.notes,
          p.referral_source,
          p.referral_dates,
          p.main_image,
          p.image_gallery,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN statuses s ON p.status_id = s.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.agent_id = u.id
        ORDER BY p.created_at DESC
      `);
      console.log('✅ Query executed successfully, rows returned:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('❌ Error in getAllProperties:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      throw error;
    }
  }

  static async getPropertiesByAgent(agentId) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.reference_number,
        s.name as status_name,
        s.color as status_color,
        p.location,
        c.name as category_name,
        c.code as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        CASE 
          WHEN p.details IS NULL THEN NULL 
          WHEN p.details = '' THEN NULL
          ELSE 
            CASE 
              WHEN p.details ~ '^[\\[\\{].*[\\]\\}]$' THEN p.details::jsonb
              ELSE NULL
            END
        END as details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.referral_source,
        p.referral_dates,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE p.agent_id = $1
      ORDER BY p.created_at DESC
    `, [agentId]);
    return result.rows;
  }

  static async getPropertyById(id) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.reference_number,
        s.name as status_name,
        s.color as status_color,
        p.location,
        c.name as category_name,
        c.code as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        CASE 
          WHEN p.details IS NULL THEN NULL 
          WHEN p.details = '' THEN NULL
          ELSE 
            CASE 
              WHEN p.details ~ '^[\\[\\{].*[\\]\\}]$' THEN p.details::jsonb
              ELSE NULL
            END
        END as details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.referral_source,
        p.referral_dates,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE p.id = $1
    `, [id]);
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
      SELECT 
        p.id,
        p.reference_number,
        s.name as status_name,
        s.color as status_color,
        p.location,
        c.name as category_name,
        c.code as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        CASE 
          WHEN p.details IS NULL THEN NULL 
          WHEN p.details = '' THEN NULL
          ELSE 
            CASE 
              WHEN p.details ~ '^[\\[\\{].*[\\]\\}]$' THEN p.details::jsonb
              ELSE NULL
            END
        END as details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.referral_source,
        p.referral_dates,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    if (filters.status_id && filters.status_id !== 'All') {
      query += ` AND p.status_id = $${valueIndex}`;
      values.push(filters.status_id);
      valueIndex++;
    }

    if (filters.category_id && filters.category_id !== 'All') {
      query += ` AND p.category_id = $${valueIndex}`;
      values.push(filters.category_id);
      valueIndex++;
    }

    if (filters.agent_id) {
      query += ` AND p.agent_id = $${valueIndex}`;
      values.push(filters.agent_id);
      valueIndex++;
    }

    if (filters.price_min) {
      query += ` AND p.price >= $${valueIndex}`;
      values.push(filters.price_min);
      valueIndex++;
    }

    if (filters.price_max) {
      query += ` AND p.price <= $${valueIndex}`;
      values.push(filters.price_max);
      valueIndex++;
    }

    if (filters.search) {
      query += ` AND (p.reference_number ILIKE $${valueIndex} OR p.location ILIKE $${valueIndex} OR p.owner_name ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    if (filters.view_type && filters.view_type !== 'All') {
      query += ` AND p.view_type = $${valueIndex}`;
      values.push(filters.view_type);
      valueIndex++;
    }

    if (filters.surface_min) {
      query += ` AND p.surface >= $${valueIndex}`;
      values.push(filters.surface_min);
      valueIndex++;
    }

    if (filters.surface_max) {
      query += ` AND p.surface <= $${valueIndex}`;
      values.push(filters.surface_max);
      valueIndex++;
    }

    if (filters.built_year_min) {
      query += ` AND p.built_year >= $${valueIndex}`;
      values.push(filters.built_year_min);
      valueIndex++;
    }

    if (filters.built_year_max) {
      query += ` AND p.built_year <= $${valueIndex}`;
      values.push(filters.built_year_max);
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
      LEFT JOIN properties p ON s.id = s.id
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
        price_range,
        COUNT(*) as count
      FROM (
        SELECT 
          CASE 
            WHEN price < 100000 THEN 'Under $100k'
            WHEN price < 500000 THEN '$100k - $500k'
            WHEN price < 1000000 THEN '$500k - $1M'
            WHEN price < 5000000 THEN '$1M - $5M'
            ELSE 'Over $5M'
          END as price_range,
          CASE 
            WHEN price < 100000 THEN 1
            WHEN price < 500000 THEN 2
            WHEN price < 1000000 THEN 3
            WHEN price < 5000000 THEN 4
            ELSE 5
          END as sort_order
        FROM properties
        WHERE price IS NOT NULL
      ) subquery
      GROUP BY price_range, sort_order
      ORDER BY sort_order
    `);
    return result.rows;
  }

  // Image management methods for file URLs
  static async updatePropertyImages(id, mainImage, imageGallery) {
    const result = await pool.query(
      `UPDATE properties 
       SET main_image = $1, image_gallery = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [mainImage, imageGallery, id]
    );
    return result.rows[0];
  }

  static async addImageToGallery(id, imageUrl) {
    const result = await pool.query(
      `UPDATE properties 
       SET image_gallery = array_append(image_gallery, $1), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [imageUrl, id]
    );
    return result.rows[0];
  }

  static async removeImageFromGallery(id, imageUrl) {
    const result = await pool.query(
      `UPDATE properties 
       SET image_gallery = array_remove(image_gallery, $1), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [imageUrl, id]
    );
    return result.rows[0];
  }

  static async getPropertiesWithImages() {
    const result = await pool.query(`
      SELECT id, reference_number, main_image, image_gallery, location, price
      FROM properties 
      WHERE main_image IS NOT NULL OR array_length(image_gallery, 1) > 0
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  // Method to get image statistics
  static async getImageStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN main_image IS NOT NULL THEN 1 END) as with_main_image,
        COUNT(CASE WHEN array_length(image_gallery, 1) > 0 THEN 1 END) as with_gallery,
        COUNT(CASE WHEN main_image IS NOT NULL AND array_length(image_gallery, 1) > 0 THEN 1 END) as with_both,
        COUNT(CASE WHEN main_image IS NULL AND (image_gallery IS NULL OR array_length(image_gallery, 1) = 0) THEN 1 END) as without_images,
        AVG(CASE WHEN array_length(image_gallery, 1) > 0 THEN array_length(image_gallery, 1) ELSE 0 END) as avg_gallery_size
      FROM properties
    `);
    return result.rows[0];
  }
}

module.exports = Property;
