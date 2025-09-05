// models/propertyModel.js
const pool = require('../config/db');

class Property {
  static async createProperty(propertyData) {
    const {
      status_id,
      property_type,
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
      property_url,
      referrals,
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
      [category.rows[0].code, property_type] // Pass category code and property_type
    );

    // Use a transaction to insert property and referrals
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the property
      const result = await client.query(
        `INSERT INTO properties (
          reference_number, status_id, property_type, location, category_id, building_name, 
          owner_name, phone_number, surface, details, interior_details, 
          built_year, view_type, concierge, agent_id, price, notes, property_url,
          main_image, image_gallery
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          refNumber.rows[0].generate_reference_number, status_id, property_type, location, category_id, building_name,
          owner_name, phone_number, surface, details, interior_details,
          built_year, view_type, concierge, agent_id, price, notes, property_url,
          main_image, image_gallery
        ]
      );
      
      const newProperty = result.rows[0];
      
      // Insert referrals if provided
      if (referrals && referrals.length > 0) {
        for (const referral of referrals) {
          await client.query(
            `INSERT INTO referrals (property_id, name, type, employee_id, date) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
              newProperty.id,
              referral.name,
              referral.type,
              referral.employee_id || null,
              referral.date
            ]
          );
        }
        
        // Update referrals count
        await client.query(
          `UPDATE properties SET referrals_count = $1 WHERE id = $2`,
          [referrals.length, newProperty.id]
        );
      }
      
      await client.query('COMMIT');
      return newProperty;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllProperties() {
    try {
      console.log('🔍 Executing getAllProperties query...');
      const result = await pool.query(`
        SELECT 
          p.id,
          p.reference_number,
          p.status_id,
          COALESCE(s.name, 'Uncategorized Status') as status_name,
          COALESCE(s.color, '#6B7280') as status_color,
          p.property_type,
          p.location,
          p.category_id,
          COALESCE(c.name, 'Uncategorized') as category_name,
          COALESCE(c.code, 'UNCAT') as category_code,
          p.building_name,
          p.owner_name,
          p.phone_number,
          p.surface,
          p.details,
          p.interior_details,
          p.built_year,
          p.view_type,
          p.concierge,
          p.agent_id,
          u.name as agent_name,
          u.role as agent_role,
          p.price,
          p.notes,
          p.property_url,
          p.main_image,
          p.image_gallery,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
        LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
        LEFT JOIN users u ON p.agent_id = u.id
        ORDER BY p.created_at DESC
      `);
      console.log('✅ Query executed successfully, rows returned:', result.rows.length);
      
      // Fetch referrals for each property
      const propertiesWithReferrals = await Promise.all(
        result.rows.map(async (property) => {
          const referralsResult = await pool.query(
            `SELECT id, name, type, employee_id, date FROM referrals WHERE property_id = $1 ORDER BY date DESC`,
            [property.id]
          );
          property.referrals = referralsResult.rows;
          return property;
        })
      );
      
      return propertiesWithReferrals;
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
        p.status_id,
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        p.details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        p.agent_id,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.property_url,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE p.agent_id = $1
      ORDER BY p.created_at DESC
    `, [agentId]);
    return result.rows;
  }

  // Get properties that are assigned to or referred by a specific agent
  static async getPropertiesAssignedOrReferredByAgent(agentId) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.reference_number,
        p.status_id,
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        p.details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        p.agent_id,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.property_url,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.agent_id = $1 THEN 'assigned'
          ELSE 'referred'
        END as agent_relationship
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE p.agent_id = $1
      ORDER BY p.created_at DESC
    `, [agentId]);
    return result.rows;
  }

  static async getPropertyById(id) {
    console.log('🔍 getPropertyById called with ID:', id, 'Type:', typeof id);
    
    // Ensure ID is a number
    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId)) {
      console.log('❌ Invalid property ID:', id);
      return null;
    }
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p.reference_number,
        p.status_id,
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        p.details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        p.agent_id,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.property_url,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE p.id = $1
    `, [propertyId]);
    
    console.log('🔍 Database query result:', {
      rowsReturned: result.rows.length,
      firstRow: result.rows[0] ? { id: result.rows[0].id, reference_number: result.rows[0].reference_number } : null
    });
    
    if (result.rows.length === 0) {
      console.log('❌ No property found with ID:', id);
      return null;
    }
    
    const property = result.rows[0];
    
    // Fetch referrals for this property
    const referralsResult = await pool.query(
      `SELECT id, name, type, employee_id, date FROM referrals WHERE property_id = $1 ORDER BY date DESC`,
      [propertyId]
    );
    console.log('🔍 Referrals fetched for property', propertyId, ':', referralsResult.rows);
    property.referrals = referralsResult.rows;
    
    return property;
  }

  static async updateProperty(id, updates) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Extract referrals from updates and remove them from property updates
      const { referrals, ...propertyUpdates } = updates;
      console.log('🔍 Extracted referrals:', referrals);
      console.log('🔍 Property updates (without referrals):', propertyUpdates);
      
      // Update property fields (excluding referrals)
      if (Object.keys(propertyUpdates).length > 0) {
        const fields = Object.keys(propertyUpdates);
        const values = Object.values(propertyUpdates);
        
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const query = `
          UPDATE properties 
          SET ${setClause}, updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        const result = await client.query(query, [id, ...values]);
        if (result.rows.length === 0) {
          throw new Error('Property not found');
        }
      }
      
      // Handle referrals if provided
      if (referrals !== undefined) {
        console.log('🔍 Handling referrals for property ID:', id);
        console.log('🔍 Referrals to insert:', referrals);
        
        // Delete existing referrals for this property
        await client.query('DELETE FROM referrals WHERE property_id = $1', [id]);
        console.log('🔍 Deleted existing referrals');
        
        // Insert new referrals if any
        if (referrals && referrals.length > 0) {
          console.log('🔍 Inserting', referrals.length, 'referrals');
          for (const referral of referrals) {
            console.log('🔍 Inserting referral:', referral);
            console.log('🔍 Referral date value:', referral.date);
            console.log('🔍 Referral date type:', typeof referral.date);
            const result = await client.query(`
              INSERT INTO referrals (property_id, name, type, employee_id, date)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `, [id, referral.name, referral.type, referral.employee_id, referral.date]);
            console.log('🔍 Referral inserted with ID:', result.rows[0].id);
          }
        }
        
        // Update referrals_count in properties table
        const referralsCount = referrals ? referrals.length : 0;
        await client.query(
          'UPDATE properties SET referrals_count = $1 WHERE id = $2',
          [referralsCount, id]
        );
      }
      
      await client.query('COMMIT');
      
      // Return the updated property with referrals
      const propertyResult = await client.query(
        'SELECT * FROM properties WHERE id = $1',
        [id]
      );
      
      const referralsResult = await client.query(
        'SELECT * FROM referrals WHERE property_id = $1 ORDER BY date',
        [id]
      );
      
      const property = propertyResult.rows[0];
      property.referrals = referralsResult.rows;
      
      return property;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
        p.status_id,
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_name,
        p.phone_number,
        p.surface,
        p.details,
        p.interior_details,
        p.built_year,
        p.view_type,
        p.concierge,
        p.agent_id,
        u.name as agent_name,
        u.role as agent_role,
        p.price,
        p.notes,
        p.property_url,
        p.main_image,
        p.image_gallery,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
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
    
    // Fetch referrals for each property
    const propertiesWithReferrals = await Promise.all(
      result.rows.map(async (property) => {
        const referralsResult = await pool.query(
          `SELECT id, name, type, employee_id, date FROM referrals WHERE property_id = $1 ORDER BY date DESC`,
          [property.id]
        );
        property.referrals = referralsResult.rows;
        return property;
      })
    );
    
    return propertiesWithReferrals;
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
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
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
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
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
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
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
