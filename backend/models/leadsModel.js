// models/leadsModel.js
const pool = require('../config/db');

class Lead {
  static buildLeadsFilters(filters = {}, values = [], valueIndex = 1) {
    let whereClause = '';

    if (filters.status && filters.status !== 'All') {
      whereClause += ` AND l.status = $${valueIndex}`;
      values.push(filters.status);
      valueIndex++;
    }

    if (filters.agent_id) {
      whereClause += ` AND l.agent_id = $${valueIndex}`;
      values.push(filters.agent_id);
      valueIndex++;
    }

    if (Array.isArray(filters.agent_ids) && filters.agent_ids.length > 0) {
      whereClause += ` AND l.agent_id = ANY($${valueIndex}::int[])`;
      values.push(filters.agent_ids);
      valueIndex++;
    }

    if (filters.date_from && String(filters.date_from).trim() !== '') {
      whereClause += ` AND l.date >= $${valueIndex}::date`;
      values.push(String(filters.date_from).trim());
      valueIndex++;
    }

    if (filters.date_to && String(filters.date_to).trim() !== '') {
      whereClause += ` AND l.date < ($${valueIndex}::date + interval '1 day')`;
      values.push(String(filters.date_to).trim());
      valueIndex++;
    }

    if (filters.reference_source_id) {
      whereClause += ` AND l.reference_source_id = $${valueIndex}`;
      values.push(filters.reference_source_id);
      valueIndex++;
    }

    if (filters.search) {
      whereClause += ` AND (l.customer_name ILIKE $${valueIndex} OR l.phone_number ILIKE $${valueIndex} OR l.agent_name ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    return { whereClause, values, valueIndex };
  }

  static async createLead(leadData) {
    const {
      date,
      customer_name,
      phone_number,
      agent_id,
      agent_name,
      price,
      reference_source_id,
      added_by_id,
      status
    } = leadData;

    // Validate required fields
    if (!added_by_id) {
      throw new Error('added_by_id is required and cannot be null');
    }

    const result = await pool.query(
      `INSERT INTO leads (
        date, customer_name, phone_number, agent_id, agent_name,
        price, reference_source_id, added_by_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        date || new Date().toISOString().split('T')[0],
        customer_name,
        phone_number,
        agent_id,
        agent_name,
        price,
        reference_source_id,
        added_by_id, // Person who added the lead
        status || 'Active'
      ]
    );
    return result.rows[0];
  }

  static async getAllLeads() {
    try {
      console.log('🔍 Executing getAllLeads query...');
      const result = await pool.query(`
        SELECT 
          l.id,
          l.date,
          l.customer_name,
          l.phone_number,
          l.agent_id,
          l.agent_name,
          u.name as assigned_agent_name,
          u.role as agent_role,
          l.price,
          l.reference_source_id,
          rs.source_name as reference_source_name,
          l.added_by_id,
          added_by.name as added_by_name,
          added_by.role as added_by_role,
          l.status,
          ls.can_be_referred as status_can_be_referred,
          (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
          l.created_at,
          l.updated_at
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
        LEFT JOIN users added_by ON l.added_by_id = added_by.id
        LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
        ORDER BY l.created_at DESC
      `);
      console.log('✅ Query executed successfully, rows returned:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('❌ Error in getAllLeads:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      throw error;
    }
  }

  static async getLeadsByAgent(agentId) {
    const result = await pool.query(`
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        l.agent_name,
        u.name as assigned_agent_name,
        u.role as agent_role,
        l.price,
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.added_by_id,
        added_by.name as added_by_name,
        added_by.role as added_by_role,
        l.status,
        ls.can_be_referred as status_can_be_referred,
        (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      WHERE l.agent_id = $1
      ORDER BY l.created_at DESC
    `, [agentId]);
    return result.rows;
  }

  // Get leads that are assigned to or referred by a specific agent
  static async getLeadsAssignedOrReferredByAgent(agentId) {
    const result = await pool.query(`
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        l.agent_name,
        u.name as assigned_agent_name,
        u.role as agent_role,
        l.price,
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.added_by_id,
        added_by.name as added_by_name,
        added_by.role as added_by_role,
        l.status,
        ls.can_be_referred as status_can_be_referred,
        (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
        l.created_at,
        l.updated_at,
        'assigned' as agent_relationship
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      WHERE l.agent_id = $1
      ORDER BY l.created_at DESC
    `, [agentId]);
    return result.rows;
  }

  static async getLeadById(id) {
    const result = await pool.query(`
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        l.agent_name,
        u.name as assigned_agent_name,
        u.role as agent_role,
        l.price,
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.added_by_id,
        added_by.name as added_by_name,
        added_by.role as added_by_role,
        l.status,
        ls.can_be_referred as status_can_be_referred,
        (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
        l.created_at,
        l.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', lr.id,
              'agent_id', lr.agent_id,
              'name', lr.name,
              'type', lr.type,
              'agent_name', ref_agent.name,
              'referral_date', lr.referral_date,
              'external', lr.external,
              'status', lr.status,
              'referred_to_agent_id', lr.referred_to_agent_id,
              'referred_by_user_id', lr.referred_by_user_id,
              'referred_by_name', referred_by.name,
              'referred_to_name', referred_to.name
            ) ORDER BY 
              CASE 
                WHEN lr.status = 'pending' THEN 0
                WHEN lr.status = 'rejected' THEN 2
                ELSE 1
              END,
              lr.referral_date DESC
          ) FILTER (WHERE lr.id IS NOT NULL),
          '[]'::json
        ) as referrals
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      LEFT JOIN lead_referrals lr ON l.id = lr.lead_id
      LEFT JOIN users ref_agent ON lr.agent_id = ref_agent.id
      LEFT JOIN users referred_by ON lr.referred_by_user_id = referred_by.id
      LEFT JOIN users referred_to ON lr.referred_to_agent_id = referred_to.id
      WHERE l.id = $1
      GROUP BY l.id, l.date, l.customer_name, l.phone_number, l.agent_id, l.agent_name,
               u.name, u.role, l.price, l.reference_source_id, rs.source_name, l.added_by_id,
               added_by.name, added_by.role, l.status, ls.can_be_referred, l.created_at, l.updated_at
    `, [id]);
    return result.rows[0];
  }

  static async updateLead(id, updates) {
    console.log('🔧 [Backend] Updating lead:', id);
    console.log('🔧 [Backend] Raw updates:', updates);
    
    // Validate added_by_id if it's being updated - it cannot be null
    if (updates.hasOwnProperty('added_by_id') && (!updates.added_by_id || updates.added_by_id === null)) {
      throw new Error('added_by_id is required and cannot be null');
    }
    
    // Filter out undefined values and fields that don't belong in the leads table
    const cleanUpdates = {};
    const nonTableFields = ['referrals', 'notes']; // Fields handled separately or deprecated
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !nonTableFields.includes(key)) {
        cleanUpdates[key] = value;
      }
    });
    
    console.log('🔧 [Backend] Clean updates:', cleanUpdates);
    console.log('🔧 [Backend] Status field specifically:', cleanUpdates.status);
    
    const fields = Object.keys(cleanUpdates);
    const values = Object.values(cleanUpdates);
    
    if (fields.length === 0) {
      console.log('🔧 [Backend] No fields to update, returning current lead');
      // No fields to update, just return the current lead
      return await Lead.getLeadById(id);
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE leads 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    console.log('🔧 [Backend] SQL query:', query);
    console.log('🔧 [Backend] Query values:', [id, ...values]);
    
    const result = await pool.query(query, [id, ...values]);
    console.log('🔧 [Backend] Update result:', result.rows[0]);
    
    return result.rows[0];
  }

  static async deleteLead(id) {
    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getLeadsWithFilters(filters = {}) {
    console.log('🔍 [Backend] getLeadsWithFilters called with filters:', filters);
    
    // Debug: First, let's see what dates are in the database
    if (filters.date_from || filters.date_to) {
      const sampleQuery = `SELECT id, date, customer_name FROM leads ORDER BY date DESC LIMIT 5`;
      const sampleResult = await pool.query(sampleQuery);
      console.log('🔍 [Backend] Sample dates in database:', sampleResult.rows);
      
      // Test individual date filters
      if (filters.date_from) {
        const fromQuery = `SELECT COUNT(*) as count FROM leads WHERE date >= $1::date`;
        const fromResult = await pool.query(fromQuery, [filters.date_from.trim()]);
        console.log('🔍 [Backend] Count with date_from filter:', fromResult.rows[0].count);
      }
      
      if (filters.date_to) {
        const toQuery = `SELECT COUNT(*) as count FROM leads WHERE date <= $1::date`;
        const toResult = await pool.query(toQuery, [filters.date_to.trim()]);
        console.log('🔍 [Backend] Count with date_to filter:', toResult.rows[0].count);
      }
    }
    
    let query = `
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        l.agent_name,
        u.name as assigned_agent_name,
        u.role as agent_role,
        l.price,
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.added_by_id,
        added_by.name as added_by_name,
        added_by.role as added_by_role,
        l.status,
        ls.can_be_referred as status_can_be_referred,
        (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
        l.created_at,
        l.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', lr.id,
              'agent_id', lr.agent_id,
              'name', lr.name,
              'type', lr.type,
              'agent_name', ref_agent.name,
              'referral_date', lr.referral_date,
              'external', lr.external
            ) ORDER BY lr.referral_date DESC
          ) FILTER (WHERE lr.id IS NOT NULL),
          '[]'::json
        ) as referrals
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      LEFT JOIN lead_referrals lr ON l.id = lr.lead_id
      LEFT JOIN users ref_agent ON lr.agent_id = ref_agent.id
      WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    if (filters.status && filters.status !== 'All') {
      query += ` AND l.status = $${valueIndex}`;
      values.push(filters.status);
      valueIndex++;
      console.log('🔍 [Backend] Added status filter:', filters.status);
    }

    if (filters.agent_id) {
      query += ` AND l.agent_id = $${valueIndex}`;
      values.push(filters.agent_id);
      valueIndex++;
      console.log('🔍 [Backend] Added agent_id filter:', filters.agent_id);
    }

    if (filters.date_from && filters.date_from.trim() !== '') {
      query += ` AND l.date >= $${valueIndex}::date`;
      values.push(filters.date_from.trim());
      valueIndex++;
      console.log('🔍 [Backend] Added date_from filter:', filters.date_from.trim(), 'Type:', typeof filters.date_from);
    }

    if (filters.date_to && filters.date_to.trim() !== '') {
      query += ` AND l.date < ($${valueIndex}::date + interval '1 day')`;
      values.push(filters.date_to.trim());
      valueIndex++;
      console.log('🔍 [Backend] Added date_to filter:', filters.date_to.trim(), 'Type:', typeof filters.date_to);
    }

    if (filters.reference_source_id) {
      query += ` AND l.reference_source_id = $${valueIndex}`;
      values.push(filters.reference_source_id);
      valueIndex++;
    }

    if (filters.search) {
      query += ` AND (l.customer_name ILIKE $${valueIndex} OR l.phone_number ILIKE $${valueIndex} OR l.agent_name ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    query += ` 
      GROUP BY l.id, l.date, l.customer_name, l.phone_number, l.agent_id, l.agent_name,
               u.name, u.role, l.price, l.reference_source_id, rs.source_name, l.added_by_id,
               added_by.name, added_by.role, l.status, ls.can_be_referred, l.created_at, l.updated_at
      ORDER BY l.created_at DESC
    `;

    console.log('🔍 [Backend] Final query:', query);
    console.log('🔍 [Backend] Query values:', values);

    const result = await pool.query(query, values);
    console.log('🔍 [Backend] Query result count:', result.rows.length);
    
    // Debug: Show some sample dates from results
    if (result.rows.length > 0) {
      console.log('🔍 [Backend] Sample dates from results:', result.rows.slice(0, 3).map(r => ({ id: r.id, date: r.date, customer_name: r.customer_name })));
    }
    
    return result.rows;
  }

  static async getLeadsWithFiltersPaginated(filters = {}, pagination = {}) {
    const page = Number.isInteger(pagination.page) && pagination.page > 0 ? pagination.page : 1;
    const limit = Number.isInteger(pagination.limit) && pagination.limit > 0 ? pagination.limit : 10;
    const offset = (page - 1) * limit;

    const values = [];
    const { whereClause } = this.buildLeadsFilters(filters, values, 1);

    const dataQuery = `
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        l.agent_name,
        u.name as assigned_agent_name,
        u.role as agent_role,
        l.price,
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.added_by_id,
        added_by.name as added_by_name,
        added_by.role as added_by_role,
        l.status,
        ls.can_be_referred as status_can_be_referred,
        (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
      WHERE 1=1
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM leads l
      WHERE 1=1
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...values, limit, offset]),
      pool.query(countQuery, values),
    ]);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total || 0,
      page,
      limit,
    };
  }

  // Get viewings for a lead
  static async getLeadViewings(leadId) {
    const result = await pool.query(`
      SELECT 
        v.id,
        v.property_id,
        v.viewing_date,
        v.viewing_time,
        v.status,
        v.is_serious,
        v.description,
        v.notes,
        v.created_at,
        v.updated_at,
        p.id as property_id,
        p.reference_number,
        p.location,
        p.property_type,
        p.status_id,
        s.name as status_name,
        s.color as status_color,
        p.category_id,
        c.name as category_name,
        c.code as category_code,
        p.building_name,
        p.surface,
        p.price,
        p.main_image
      FROM viewings v
      INNER JOIN properties p ON v.property_id = p.id
      LEFT JOIN statuses s ON p.status_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE v.lead_id = $1
      ORDER BY v.viewing_date DESC, v.viewing_time DESC
    `, [leadId]);
    return result.rows;
  }

  // Get owned properties for a lead
  static async getLeadOwnedProperties(leadId) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.reference_number,
        p.status_id,
        s.name as status_name,
        s.color as status_color,
        p.property_type,
        p.location,
        p.category_id,
        c.name as category_name,
        c.code as category_code,
        p.building_name,
        p.surface,
        p.price,
        p.main_image,
        p.created_at,
        p.updated_at
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.owner_id = $1
      ORDER BY p.created_at DESC
    `, [leadId]);
    return result.rows;
  }

  static async getLeadStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM leads
    `);
    return result.rows[0];
  }

  static async getLeadsByDateRange() {
    const result = await pool.query(`
      SELECT 
        DATE(date) as lead_date,
        COUNT(*) as count
      FROM leads
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(date)
      ORDER BY lead_date DESC
      LIMIT 30
    `);
    return result.rows;
  }

  static async getLeadsByStatus() {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);
    return result.rows;
  }

  static async getLeadsByAgentStats() {
    const result = await pool.query(`
      SELECT 
        COALESCE(u.name, l.agent_name, 'Unassigned') as agent_name,
        COUNT(*) as count
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      GROUP BY COALESCE(u.name, l.agent_name, 'Unassigned')
      ORDER BY count DESC
    `);
    return result.rows;
  }

  // Get leads added by a specific user
  static async getLeadsByAddedBy(addedById) {
    const result = await pool.query(`
      SELECT 
        l.id,
        l.date,
        l.customer_name,
        l.phone_number,
        l.agent_id,
        l.agent_name,
        u.name as assigned_agent_name,
        u.role as agent_role,
        l.price,
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.added_by_id,
        added_by.name as added_by_name,
        added_by.role as added_by_role,
        l.status,
        (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      WHERE l.added_by_id = $1
      ORDER BY l.created_at DESC
    `, [addedById]);
    return result.rows;
  }

  // Get leads for a specific agent based on role permissions
  static async getLeadsForAgent(agentId, userRole) {
    // Normalize role for comparison (handles both 'team_leader' and 'team leader' formats)
    const normalizeRole = (role) => role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';
    const normalizedRole = normalizeRole(userRole);
    
    // Agents see only their own leads
    if (normalizedRole === 'agent') {
      return this.getLeadsAssignedOrReferredByAgent(agentId);
    }
    
    // Team leaders see their own leads and their team's leads
    if (normalizedRole === 'team leader') {
      // Get team leader's own leads
      const teamLeaderLeads = await this.getLeadsAssignedOrReferredByAgent(agentId);
      
      // Get agent IDs under this team leader
      const teamAgentsResult = await pool.query(
        `SELECT agent_id FROM team_agents 
         WHERE team_leader_id = $1 AND is_active = TRUE`,
        [agentId]
      );
      const teamAgentIds = teamAgentsResult.rows.map(row => row.agent_id);
      
      // Get leads for all team agents
      if (teamAgentIds.length > 0) {
        const teamLeadsResult = await pool.query(`
          SELECT 
            l.id,
            l.date,
            l.customer_name,
            l.phone_number,
            l.agent_id,
            l.agent_name,
            u.name as assigned_agent_name,
            u.role as agent_role,
            l.price,
            l.reference_source_id,
            rs.source_name as reference_source_name,
            l.added_by_id,
            added_by.name as added_by_name,
            added_by.role as added_by_role,
            l.status,
            ls.can_be_referred as status_can_be_referred,
            (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
            l.created_at,
            l.updated_at
          FROM leads l
          LEFT JOIN users u ON l.agent_id = u.id
          LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
          LEFT JOIN users added_by ON l.added_by_id = added_by.id
          LEFT JOIN lead_statuses ls ON LOWER(ls.status_name) = LOWER(l.status)
          WHERE l.agent_id = ANY($1::int[])
          ORDER BY l.created_at DESC
        `, [teamAgentIds]);
        
        // Combine team leader's leads with team agents' leads, removing duplicates
        const allLeadIds = new Set(teamLeaderLeads.map(l => l.id));
        const uniqueTeamLeads = teamLeadsResult.rows.filter(l => !allLeadIds.has(l.id));
        return [...teamLeaderLeads, ...uniqueTeamLeads];
      }
      
      return teamLeaderLeads;
    }
    
    // Admins, operations managers, operations, and agent managers see all leads
    return this.getAllLeads();
  }

  // Get all reference sources
  static async getReferenceSources() {
    const result = await pool.query(`
      SELECT id, source_name, created_at, modified_at
      FROM reference_sources
      ORDER BY source_name
    `);
    return result.rows;
  }

  // Get all users who can add leads (for selector - now includes agents and team leaders)
  static async getUsersWhoCanAddLeads() {
    const result = await pool.query(`
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('admin', 'operations_manager', 'operations', 'agent', 'team_leader')
      ORDER BY name
    `);
    return result.rows;
  }

}

module.exports = Lead;
