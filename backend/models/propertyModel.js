// models/propertyModel.js
const pool = require('../config/db');
const logger = require('../utils/logger');

class Property {
  static async createProperty(propertyData) {
    const {
      status_id,
      property_type,
      location,
      category_id,
      building_name,
      owner_id,
      owner_name,
      phone_number,
      surface,
      details,
      interior_details,
      payment_facilities,
      payment_facilities_specification,
      built_year,
      view_type,
      concierge,
      agent_id,
      price,
      notes,
      property_url,
      closed_date,
      sold_amount,
      buyer_id,
      commission,
      platform_id,
      referrals,
      main_image,
      image_gallery,
      created_by
    } = propertyData;
    
    // Convert details and interior_details to JSONB if they're objects
    let detailsJsonb = details;
    if (typeof details === 'object' && details !== null) {
      detailsJsonb = JSON.stringify(details);
    } else if (typeof details === 'string') {
      // Try to parse as JSON, if fails, create structured object from string
      try {
        detailsJsonb = JSON.parse(details);
      } catch (e) {
        // Legacy string format - convert to structured object
        detailsJsonb = {
          floor_number: '',
          balcony: '',
          covered_parking: '',
          outdoor_parking: '',
          cave: ''
        };
      }
    }
    
    let interiorDetailsJsonb = interior_details;
    if (typeof interior_details === 'object' && interior_details !== null) {
      interiorDetailsJsonb = JSON.stringify(interior_details);
    } else if (typeof interior_details === 'string') {
      // Try to parse as JSON, if fails, create structured object from string
      try {
        interiorDetailsJsonb = JSON.parse(interior_details);
      } catch (e) {
        // Legacy string format - convert to structured object
        interiorDetailsJsonb = {
          living_rooms: '',
          bedrooms: '',
          bathrooms: '',
          maid_room: ''
        };
      }
    }

    // VALIDATION: referrals are required
    if (!referrals || !Array.isArray(referrals) || referrals.length === 0) {
      throw new Error('At least one referral is required. Please provide at least one referral for the property.');
    }

    // VALIDATION: If creating property with closed status, ensure closed_date is set
    const statusCheck = await pool.query(
      `SELECT code, name FROM statuses WHERE id = $1`,
      [status_id]
    );
    
    if (statusCheck.rows.length > 0) {
      const status = statusCheck.rows[0];
      const isClosedStatus = 
        ['sold', 'rented', 'closed'].includes(status.code?.toLowerCase()) ||
        ['sold', 'rented', 'closed'].includes(status.name?.toLowerCase());
      
      if (isClosedStatus && !closed_date) {
        throw new Error('Properties with closed status (Sold/Rented/Closed) must have a closed_date set. Please provide a closed_date.');
      }
    }

    // If an owner_id is provided, always sync owner_name and phone_number from the lead
    let finalOwnerId = owner_id || null;
    let finalOwnerName = owner_name || null;
    let finalPhoneNumber = phone_number || null;

    if (finalOwnerId) {
      const ownerResult = await pool.query(
        `SELECT customer_name, phone_number 
         FROM leads 
         WHERE id = $1`,
        [finalOwnerId]
      );

      if (ownerResult.rows[0]) {
        finalOwnerName = ownerResult.rows[0].customer_name;
        finalPhoneNumber = ownerResult.rows[0].phone_number;
      }
    }

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
          owner_id, owner_name, phone_number, surface, details, interior_details, 
          payment_facilities, payment_facilities_specification,
          built_year, view_type, concierge, agent_id, price, notes, property_url,
          closed_date, sold_amount, buyer_id, commission, platform_id, main_image, image_gallery, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        RETURNING *`,
        [
          refNumber.rows[0].generate_reference_number, status_id, property_type, location, category_id, building_name,
          finalOwnerId, finalOwnerName, finalPhoneNumber, surface, detailsJsonb, interiorDetailsJsonb,
          payment_facilities || false, payment_facilities_specification || null,
          built_year, view_type, concierge, agent_id, price, notes, property_url,
          closed_date, sold_amount || null, buyer_id || null, commission || null, platform_id || null, main_image, image_gallery, created_by || null
        ]
      );
      
      const newProperty = result.rows[0];
      
      // Insert referrals (required, already validated above)
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
      logger.debug('Executing getAllProperties query');
      const result = await pool.query(`
        SELECT 
          p.id,
          p.reference_number,
          p.status_id,
          COALESCE(s.name, 'Uncategorized Status') as status_name,
          COALESCE(s.color, '#6B7280') as status_color,
          COALESCE(s.can_be_referred, TRUE) as status_can_be_referred,
          p.property_type,
          p.location,
          p.category_id,
          COALESCE(c.name, 'Uncategorized') as category_name,
          COALESCE(c.code, 'UNCAT') as category_code,
          p.building_name,
          p.owner_id,
          COALESCE(l.customer_name, p.owner_name) as owner_name,
          COALESCE(l.phone_number, p.phone_number) as phone_number,
          p.surface,
          p.details,
          p.interior_details,
          COALESCE(p.payment_facilities, false) as payment_facilities,
          p.payment_facilities_specification,
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
          p.closed_date,
          p.sold_amount,
          p.buyer_id,
          COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
          COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
          p.commission,
          p.platform_id,
          rs.source_name as platform_name,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
        LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
        LEFT JOIN users u ON p.agent_id = u.id
        LEFT JOIN leads l ON p.owner_id = l.id
        LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
        LEFT JOIN reference_sources rs ON p.platform_id = rs.id
        ORDER BY p.created_at DESC
      `);
      logger.debug('Query executed successfully', { rowCount: result.rows.length });
      
      // Fetch all referrals in a single query for better performance
      const propertyIds = result.rows.map(p => p.id);
      let referralsMap = new Map();
      
      if (propertyIds.length > 0) {
        const referralsResult = await pool.query(
          `SELECT property_id, id, name, type, employee_id, date, external, status, referred_to_agent_id, referred_by_user_id, created_at
           FROM referrals 
           WHERE property_id = ANY($1::int[]) 
           ORDER BY property_id, 
             CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
             date DESC`,
          [propertyIds]
        );
        
        // Group referrals by property_id
        referralsResult.rows.forEach(referral => {
          if (!referralsMap.has(referral.property_id)) {
            referralsMap.set(referral.property_id, []);
          }
          referralsMap.get(referral.property_id).push({
            id: referral.id,
            name: referral.name,
            type: referral.type,
            employee_id: referral.employee_id,
            date: referral.date,
            external: referral.external,
            status: referral.status,
            referred_to_agent_id: referral.referred_to_agent_id,
            referred_by_user_id: referral.referred_by_user_id,
            created_at: referral.created_at
          });
        });
      }
      
      // Attach referrals to each property
      const propertiesWithReferrals = result.rows.map(property => {
        property.referrals = referralsMap.get(property.id) || [];
        return property;
      });
      
      return propertiesWithReferrals;
    } catch (error) {
      logger.error('Error in getAllProperties', error);
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
        COALESCE(s.can_be_referred, TRUE) as status_can_be_referred,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_id,
        COALESCE(l.customer_name, p.owner_name) as owner_name,
        COALESCE(l.phone_number, p.phone_number) as phone_number,
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
          p.closed_date,
          p.sold_amount,
          p.buyer_id,
          COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
          COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
          p.commission,
          p.platform_id,
          rs.source_name as platform_name,
          p.created_by,
          creator.name as created_by_name,
          creator.role as created_by_role,
          p.created_at,
          p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN leads l ON p.owner_id = l.id
      LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
      LEFT JOIN reference_sources rs ON p.platform_id = rs.id
      LEFT JOIN users creator ON p.created_by = creator.id
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
        p.owner_id,
        COALESCE(l.customer_name, p.owner_name) as owner_name,
        COALESCE(l.phone_number, p.phone_number) as phone_number,
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
          p.closed_date,
          p.sold_amount,
          p.buyer_id,
          COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
          COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
          p.commission,
          p.platform_id,
          rs.source_name as platform_name,
          p.created_by,
          creator.name as created_by_name,
          creator.role as created_by_role,
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
      LEFT JOIN leads l ON p.owner_id = l.id
      LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
      LEFT JOIN reference_sources rs ON p.platform_id = rs.id
      LEFT JOIN users creator ON p.created_by = creator.id
      WHERE p.agent_id = $1
      ORDER BY p.created_at DESC
    `, [agentId]);
    return result.rows;
  }

  // Get all properties with filtered owner details based on user role and permissions
  static async getAllPropertiesWithFilteredOwnerDetails(userRole, userId) {
    try {
      logger.debug('Executing getAllPropertiesWithFilteredOwnerDetails query');
      const result = await pool.query(`
        SELECT 
          p.id,
          p.reference_number,
          p.status_id,
          COALESCE(s.name, 'Uncategorized Status') as status_name,
          COALESCE(s.color, '#6B7280') as status_color,
          COALESCE(s.can_be_referred, TRUE) as status_can_be_referred,
          p.property_type,
          p.location,
          p.category_id,
          COALESCE(c.name, 'Uncategorized') as category_name,
          COALESCE(c.code, 'UNCAT') as category_code,
          p.building_name,
          p.owner_id,
          COALESCE(l.customer_name, p.owner_name) as owner_name,
          COALESCE(l.phone_number, p.phone_number) as phone_number,
          p.surface,
          p.details,
          p.interior_details,
          COALESCE(p.payment_facilities, false) as payment_facilities,
          p.payment_facilities_specification,
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
          p.closed_date,
          p.sold_amount,
          p.buyer_id,
          COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
          COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
          p.commission,
          p.platform_id,
          rs.source_name as platform_name,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
        LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
        LEFT JOIN users u ON p.agent_id = u.id
        LEFT JOIN leads l ON p.owner_id = l.id
        LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
        LEFT JOIN reference_sources rs ON p.platform_id = rs.id
        ORDER BY p.created_at DESC
      `);
      logger.debug('Query executed successfully', { rowCount: result.rows.length });
      
      // Fetch all referrals in a single query for better performance
      const propertyIds = result.rows.map(p => p.id);
      let referralsMap = new Map();
      
      if (propertyIds.length > 0) {
        const referralsResult = await pool.query(
          `SELECT property_id, id, name, type, employee_id, date, external, status, referred_to_agent_id, referred_by_user_id, created_at
           FROM referrals 
           WHERE property_id = ANY($1::int[]) 
           ORDER BY property_id, 
             CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
             date DESC`,
          [propertyIds]
        );
        
        // Group referrals by property_id
        referralsResult.rows.forEach(referral => {
          if (!referralsMap.has(referral.property_id)) {
            referralsMap.set(referral.property_id, []);
          }
          referralsMap.get(referral.property_id).push({
            id: referral.id,
            name: referral.name,
            type: referral.type,
            employee_id: referral.employee_id,
            date: referral.date,
            external: referral.external,
            status: referral.status,
            referred_to_agent_id: referral.referred_to_agent_id,
            referred_by_user_id: referral.referred_by_user_id,
            created_at: referral.created_at
          });
        });
      }
      
      // Attach referrals to each property
      const propertiesWithReferrals = result.rows.map(property => {
        property.referrals = referralsMap.get(property.id) || [];
        return property;
      });
      
      return propertiesWithReferrals;
    } catch (error) {
      logger.error('Error in getAllPropertiesWithFilteredOwnerDetails', error);
      throw error;
    }
  }

  // Helper method to check if user can see owner details for a specific property
  static async canUserSeeOwnerDetails(userRole, userId, propertyId) {
    // Normalize role for comparison (handles both 'operations_manager' and 'operations manager' formats)
    const normalizeRole = (role) => role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';
    const normalizedRole = normalizeRole(userRole);
    
    // Admin, operations manager, operations, agent manager can always see owner details
    if (['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizedRole)) {
      return true;
    }

    // For agents and team leaders, check specific permissions
    if (normalizedRole === 'agent') {
      // Agents can see owner details only for properties assigned to them
      const result = await pool.query(
        'SELECT agent_id FROM properties WHERE id = $1',
        [propertyId]
      );
      return result.rows.length > 0 && result.rows[0].agent_id === userId;
    }

    if (normalizedRole === 'team leader') {
      // Team leaders can see owner details for:
      // 1. Properties assigned to them
      // 2. Properties assigned to agents under them
      const result = await pool.query(`
        SELECT p.agent_id, ta.agent_id as team_agent_id
        FROM properties p
        LEFT JOIN team_agents ta ON p.agent_id = ta.agent_id AND ta.team_leader_id = $1 AND ta.is_active = true
        WHERE p.id = $2
      `, [userId, propertyId]);
      
      if (result.rows.length === 0) return false;
      
      const property = result.rows[0];
      // Can see if property is assigned to them or to one of their agents
      return property.agent_id === userId || property.team_agent_id !== null;
    }

    return false;
  }

  // Get properties assigned to agents under a specific team leader
  static async getPropertiesByTeamLeader(teamLeaderId) {
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
        p.owner_id,
        COALESCE(l.customer_name, p.owner_name) as owner_name,
        COALESCE(l.phone_number, p.phone_number) as phone_number,
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
        p.closed_date,
        p.sold_amount,
        p.buyer_id,
        COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
        COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
        p.commission,
        p.platform_id,
        rs.source_name as platform_name,
        p.created_by,
        creator.name as created_by_name,
        creator.role as created_by_role,
        p.created_at,
        p.updated_at,
        'team_agent' as agent_relationship
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN leads l ON p.owner_id = l.id
      LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
      LEFT JOIN reference_sources rs ON p.platform_id = rs.id
      LEFT JOIN users creator ON p.created_by = creator.id
      INNER JOIN team_agents ta ON p.agent_id = ta.agent_id
      WHERE ta.team_leader_id = $1 AND ta.is_active = true
      ORDER BY p.created_at DESC
    `, [teamLeaderId]);
    return result.rows;
  }

  // Get properties for team leader: their own properties + their team's properties
  static async getPropertiesForTeamLeader(teamLeaderId) {
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
        p.owner_id,
        COALESCE(l.customer_name, p.owner_name) as owner_name,
        COALESCE(l.phone_number, p.phone_number) as phone_number,
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
        p.closed_date,
        p.sold_amount,
        p.buyer_id,
        COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
        COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
        p.commission,
        p.platform_id,
        rs.source_name as platform_name,
        p.created_by,
        creator.name as created_by_name,
        creator.role as created_by_role,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.agent_id = $1 THEN 'own'
          ELSE 'team_agent'
        END as agent_relationship
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN leads l ON p.owner_id = l.id
      LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
      LEFT JOIN reference_sources rs ON p.platform_id = rs.id
      LEFT JOIN users creator ON p.created_by = creator.id
      WHERE p.agent_id = $1 
         OR p.agent_id IN (
           SELECT ta.agent_id 
           FROM team_agents ta 
           WHERE ta.team_leader_id = $1 AND ta.is_active = true
         )
      ORDER BY p.created_at DESC
    `, [teamLeaderId]);
    return result.rows;
  }

  static async getPropertyById(id) {
    logger.debug('getPropertyById called', { id, idType: typeof id });
    
    // Ensure ID is a number
    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId)) {
      logger.warn('Invalid property ID', { id });
      return null;
    }
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p.reference_number,
        p.status_id,
        COALESCE(s.name, 'Uncategorized Status') as status_name,
        COALESCE(s.color, '#6B7280') as status_color,
        COALESCE(s.can_be_referred, TRUE) as status_can_be_referred,
        p.property_type,
        p.location,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.code, 'UNCAT') as category_code,
        p.building_name,
        p.owner_id,
        COALESCE(l.customer_name, p.owner_name) as owner_name,
        COALESCE(l.phone_number, p.phone_number) as phone_number,
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
        p.closed_date,
        p.sold_amount,
        p.buyer_id,
        COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
        COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
        p.commission,
        p.platform_id,
        rs.source_name as platform_name,
        p.created_by,
        creator.name as created_by_name,
        creator.role as created_by_role,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN leads l ON p.owner_id = l.id
      LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
      LEFT JOIN reference_sources rs ON p.platform_id = rs.id
      LEFT JOIN users creator ON p.created_by = creator.id
      WHERE p.id = $1
    `, [propertyId]);
    
    logger.debug('Database query result', {
      rowsReturned: result.rows.length,
      firstRow: result.rows[0] ? { id: result.rows[0].id, reference_number: result.rows[0].reference_number } : null
    });
    
    if (result.rows.length === 0) {
      logger.debug('No property found', { id });
      return null;
    }
    
    const property = result.rows[0];
    
    // Fetch referrals for this property
    const referralsResult = await pool.query(
      `SELECT id, name, type, employee_id, date, external, status, referred_to_agent_id, referred_by_user_id, created_at 
       FROM referrals 
       WHERE property_id = $1 
       ORDER BY 
         CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
         date DESC`,
      [propertyId]
    );
    logger.debug('Referrals fetched for property', { propertyId, referralCount: referralsResult.rows.length });
    property.referrals = referralsResult.rows;
    
    logger.debug('Returning property', { propertyId, hasOwnerId: !!property.owner_id });
    
    return property;
  }

  static async updateProperty(id, updates) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Extract referrals from updates and remove them from property updates
      const { referrals, ...propertyUpdates } = updates;
      logger.debug('Extracted referrals and property updates', {
        referralCount: referrals?.length || 0,
        updateFieldCount: Object.keys(propertyUpdates).length
      });

      // If owner_id is being changed, always refresh owner_name and phone_number from the lead
      if (propertyUpdates.owner_id) {
        const ownerResult = await client.query(
          `SELECT customer_name, phone_number 
           FROM leads 
           WHERE id = $1`,
          [propertyUpdates.owner_id]
        );

        if (ownerResult.rows[0]) {
          propertyUpdates.owner_name = ownerResult.rows[0].customer_name;
          propertyUpdates.phone_number = ownerResult.rows[0].phone_number;
        }
      } else if (propertyUpdates.owner_id === null) {
        // If explicitly clearing owner_id, also clear owner_name and phone_number
        propertyUpdates.owner_name = null;
        propertyUpdates.phone_number = null;
      }
      
      // Sanitize date fields: convert empty strings to null
      if (propertyUpdates.closed_date === '') {
        propertyUpdates.closed_date = null;
      }
      
      // VALIDATION: If main_image is being updated, it must not be empty
      if (propertyUpdates.main_image !== undefined) {
        if (!propertyUpdates.main_image || (typeof propertyUpdates.main_image === 'string' && propertyUpdates.main_image.trim() === '')) {
          throw new Error('Main image is required. Please provide a main image for the property.');
        }
      }
      
      // VALIDATION: If setting property to closed status, ensure closed_date is set
      if (propertyUpdates.status_id) {
        const statusCheck = await client.query(
          `SELECT code, name FROM statuses WHERE id = $1`,
          [propertyUpdates.status_id]
        );
        
        if (statusCheck.rows.length > 0) {
          const status = statusCheck.rows[0];
          const isClosedStatus = 
            ['sold', 'rented', 'closed'].includes(status.code?.toLowerCase()) ||
            ['sold', 'rented', 'closed'].includes(status.name?.toLowerCase());
          
          if (isClosedStatus && !propertyUpdates.closed_date) {
            // Check if property already has a closed_date
            const existingProperty = await client.query(
              'SELECT closed_date FROM properties WHERE id = $1',
              [id]
            );
            
            if (!existingProperty.rows[0]?.closed_date) {
              throw new Error('Properties with closed status (Sold/Rented/Closed) must have a closed_date set. Please provide a closed_date.');
            }
          }
        }
      }
      
      // Convert details and interior_details to JSONB if they're objects
      if (propertyUpdates.details !== undefined) {
        if (typeof propertyUpdates.details === 'object' && propertyUpdates.details !== null) {
          propertyUpdates.details = JSON.stringify(propertyUpdates.details);
        } else if (typeof propertyUpdates.details === 'string') {
          // Try to parse as JSON, if fails, keep as string (legacy)
          try {
            JSON.parse(propertyUpdates.details);
          } catch (e) {
            // Not valid JSON, convert to structured object
            propertyUpdates.details = JSON.stringify({
              floor_number: '',
              balcony: '',
              covered_parking: '',
              outdoor_parking: '',
              cave: ''
            });
          }
        }
      }
      
      if (propertyUpdates.interior_details !== undefined) {
        if (typeof propertyUpdates.interior_details === 'object' && propertyUpdates.interior_details !== null) {
          propertyUpdates.interior_details = JSON.stringify(propertyUpdates.interior_details);
        } else if (typeof propertyUpdates.interior_details === 'string') {
          // Try to parse as JSON, if fails, keep as string (legacy)
          try {
            JSON.parse(propertyUpdates.interior_details);
          } catch (e) {
            // Not valid JSON, convert to structured object
            propertyUpdates.interior_details = JSON.stringify({
              living_rooms: '',
              bedrooms: '',
              bathrooms: '',
              maid_room: ''
            });
          }
        }
      }
      
      // Update property fields (excluding referrals)
      if (Object.keys(propertyUpdates).length > 0) {
        const fields = Object.keys(propertyUpdates);
        const values = Object.values(propertyUpdates);
        
        // Handle JSONB fields specially
        const setClause = fields.map((field, index) => {
          if (field === 'details' || field === 'interior_details') {
            return `${field} = $${index + 2}::jsonb`;
          }
          return `${field} = $${index + 2}`;
        }).join(', ');
        
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
      
      // Handle referrals (required on update)
      if (referrals !== undefined) {
        // VALIDATION: If referrals are being updated, they must not be empty
        if (!referrals || !Array.isArray(referrals) || referrals.length === 0) {
          throw new Error('At least one referral is required. Please provide at least one referral for the property.');
        }
        
        logger.debug('Handling referrals for property', { propertyId: id, referralCount: referrals.length });
        
        // Delete existing referrals for this property
        await client.query('DELETE FROM referrals WHERE property_id = $1', [id]);
        logger.debug('Deleted existing referrals', { propertyId: id });
        
        // Insert new referrals (required, already validated above)
        logger.debug('Inserting referrals', { propertyId: id, count: referrals.length });
        for (const referral of referrals) {
          logger.debug('Inserting referral', {
            propertyId: id,
            referralName: referral.name,
            referralType: referral.type
          });
          const result = await client.query(`
            INSERT INTO referrals (property_id, name, type, employee_id, date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `, [id, referral.name, referral.type, referral.employee_id, referral.date]);
          logger.debug('Referral inserted', { referralId: result.rows[0].id });
        }
        
        // Update referrals_count in properties table
        await client.query(
          'UPDATE properties SET referrals_count = $1 WHERE id = $2',
          [referrals.length, id]
        );
      } else {
        // If referrals are not provided in update, check if property already has referrals
        const existingReferralsResult = await client.query(
          'SELECT COUNT(*) as count FROM referrals WHERE property_id = $1',
          [id]
        );
        if (existingReferralsResult.rows && existingReferralsResult.rows.length > 0) {
          const referralsCount = parseInt(existingReferralsResult.rows[0].count);
          if (referralsCount === 0) {
            throw new Error('At least one referral is required. Please provide at least one referral for the property.');
          }
        } else {
          throw new Error('At least one referral is required. Please provide at least one referral for the property.');
        }
      }
      
      await client.query('COMMIT');
      
      // Return the updated property with referrals
      const propertyResult = await client.query(
        'SELECT * FROM properties WHERE id = $1',
        [id]
      );
      
      const referralsResult = await client.query(
        `SELECT id, name, type, employee_id, date, external, status, referred_to_agent_id, referred_by_user_id, created_at 
         FROM referrals 
         WHERE property_id = $1 
         ORDER BY 
           CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
           date DESC`,
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
        p.owner_id,
        COALESCE(l.customer_name, p.owner_name) as owner_name,
        COALESCE(l.phone_number, p.phone_number) as phone_number,
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
        p.closed_date,
        p.sold_amount,
        p.buyer_id,
        COALESCE(buyer_lead.customer_name, NULL) as buyer_name,
        COALESCE(buyer_lead.phone_number, NULL) as buyer_phone_number,
        p.commission,
        p.platform_id,
        rs.source_name as platform_name,
        p.created_by,
        creator.name as created_by_name,
        creator.role as created_by_role,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id AND s.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id AND c.is_active = true
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN leads l ON p.owner_id = l.id
      LEFT JOIN leads buyer_lead ON p.buyer_id = buyer_lead.id
      LEFT JOIN reference_sources rs ON p.platform_id = rs.id
      LEFT JOIN users creator ON p.created_by = creator.id
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
      query += ` AND (p.reference_number ILIKE $${valueIndex} OR p.location ILIKE $${valueIndex} OR COALESCE(l.customer_name, p.owner_name) ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    if (filters.location) {
      query += ` AND p.location ILIKE $${valueIndex}`;
      values.push(`%${filters.location}%`);
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
    
    // Fetch all referrals in a single query for better performance
    const propertyIds = result.rows.map(p => p.id);
    let referralsMap = new Map();
    
    if (propertyIds.length > 0) {
      const referralsResult = await pool.query(
        `SELECT property_id, id, name, type, employee_id, date, external, status, referred_to_agent_id, referred_by_user_id, created_at
         FROM referrals 
         WHERE property_id = ANY($1::int[]) 
         ORDER BY property_id, 
           CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
           date DESC`,
        [propertyIds]
      );
      
      // Group referrals by property_id
      referralsResult.rows.forEach(referral => {
        if (!referralsMap.has(referral.property_id)) {
          referralsMap.set(referral.property_id, []);
        }
        referralsMap.get(referral.property_id).push({
          id: referral.id,
          name: referral.name,
          type: referral.type,
          employee_id: referral.employee_id,
          date: referral.date,
          external: referral.external,
          status: referral.status,
          referred_to_agent_id: referral.referred_to_agent_id,
          referred_by_user_id: referral.referred_by_user_id,
          created_at: referral.created_at
        });
      });
    }
    
    // Attach referrals to each property
    const propertiesWithReferrals = result.rows.map(property => {
      property.referrals = referralsMap.get(property.id) || [];
      return property;
    });
    
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
    
    // Get count of properties with serious viewings
    const seriousViewingsResult = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as properties_with_serious_viewings
      FROM properties p
      INNER JOIN viewings v ON p.id = v.property_id
      WHERE v.is_serious = true
    `);
    
    const stats = result.rows[0];
    const totalProperties = parseInt(stats.total_properties) || 0;
    const propertiesWithSeriousViewings = parseInt(seriousViewingsResult.rows[0]?.properties_with_serious_viewings || 0);
    const seriousViewingsPercentage = totalProperties > 0 
      ? ((propertiesWithSeriousViewings / totalProperties) * 100).toFixed(1)
      : '0.0';
    
    return {
      ...stats,
      properties_with_serious_viewings: propertiesWithSeriousViewings,
      serious_viewings_percentage: parseFloat(seriousViewingsPercentage)
    };
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
