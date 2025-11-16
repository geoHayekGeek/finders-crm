// models/viewingModel.js
const pool = require('../config/db');

class Viewing {
  // Create a new viewing
  static async createViewing(viewingData) {
    const {
      property_id,
      lead_id,
      agent_id,
      viewing_date,
      viewing_time,
      status,
      is_serious,
      description,
      notes
    } = viewingData;

    const result = await pool.query(
      `INSERT INTO viewings (
        property_id, lead_id, agent_id, viewing_date, viewing_time, status, is_serious, description, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        property_id,
        lead_id,
        agent_id,
        viewing_date,
        viewing_time,
        status || 'Scheduled',
        is_serious || false,
        description,
        notes
      ]
    );
    return result.rows[0];
  }

  // Get all viewings with related data
  static async getAllViewings() {
    try {
      console.log('🔍 Executing getAllViewings query...');
      const result = await pool.query(`
        SELECT 
          v.id,
          v.property_id,
          v.lead_id,
          v.agent_id,
          v.viewing_date,
          v.viewing_time,
          v.status,
          v.is_serious,
          v.description,
          v.notes,
          v.created_at,
          v.updated_at,
          p.reference_number as property_reference,
          p.location as property_location,
          p.property_type,
          l.customer_name as lead_name,
          l.phone_number as lead_phone,
          u.name as agent_name,
          u.role as agent_role,
          COALESCE(
            json_agg(
              json_build_object(
                'id', vu.id,
                'update_text', vu.update_text,
                'update_date', vu.update_date,
                'status', vu.status,
                'created_by', vu.created_by,
                'created_by_name', creator.name,
                'created_at', vu.created_at
              ) ORDER BY vu.update_date DESC, vu.created_at DESC
            ) FILTER (WHERE vu.id IS NOT NULL),
            '[]'::json
          ) as updates
        FROM viewings v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN leads l ON v.lead_id = l.id
        LEFT JOIN users u ON v.agent_id = u.id
        LEFT JOIN viewing_updates vu ON v.id = vu.viewing_id
        LEFT JOIN users creator ON vu.created_by = creator.id
        GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
                 v.status, v.is_serious, v.description, v.notes, v.created_at, v.updated_at,
                 p.reference_number, p.location, p.property_type,
                 l.customer_name, l.phone_number, u.name, u.role
        ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
      `);
      console.log('✅ Query executed successfully, rows returned:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('❌ Error in getAllViewings:', error);
      throw error;
    }
  }

  // Get viewings by agent
  static async getViewingsByAgent(agentId) {
    const result = await pool.query(`
      SELECT 
        v.id,
        v.property_id,
        v.lead_id,
        v.agent_id,
        v.viewing_date,
        v.viewing_time,
        v.status,
        v.is_serious,
        v.description,
        v.notes,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vu.id,
              'update_text', vu.update_text,
              'update_date', vu.update_date,
              'status', vu.status,
              'created_by', vu.created_by,
              'created_by_name', creator.name,
              'created_at', vu.created_at
            ) ORDER BY vu.update_date DESC, vu.created_at DESC
          ) FILTER (WHERE vu.id IS NOT NULL),
          '[]'::json
        ) as updates
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      LEFT JOIN viewing_updates vu ON v.id = vu.viewing_id
      LEFT JOIN users creator ON vu.created_by = creator.id
      WHERE v.agent_id = $1
      GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
               v.status, v.is_serious, v.description, v.notes, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
      ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
    `, [agentId]);
    return result.rows;
  }

  // Get viewings by team leader (their own + their team's)
  static async getViewingsForTeamLeader(teamLeaderId) {
    const result = await pool.query(`
      SELECT 
        v.id,
        v.property_id,
        v.lead_id,
        v.agent_id,
        v.viewing_date,
        v.viewing_time,
        v.status,
        v.is_serious,
        v.description,
        v.notes,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vu.id,
              'update_text', vu.update_text,
              'update_date', vu.update_date,
              'status', vu.status,
              'created_by', vu.created_by,
              'created_by_name', creator.name,
              'created_at', vu.created_at
            ) ORDER BY vu.update_date DESC, vu.created_at DESC
          ) FILTER (WHERE vu.id IS NOT NULL),
          '[]'::json
        ) as updates
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      LEFT JOIN viewing_updates vu ON v.id = vu.viewing_id
      LEFT JOIN users creator ON vu.created_by = creator.id
      WHERE v.agent_id = $1 
         OR v.agent_id IN (
           SELECT ta.agent_id 
           FROM team_agents ta 
           WHERE ta.team_leader_id = $1 AND ta.is_active = true
         )
      GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
               v.status, v.is_serious, v.description, v.notes, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
      ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
    `, [teamLeaderId]);
    return result.rows;
  }

  // Get viewing by ID
  static async getViewingById(id) {
    const result = await pool.query(`
      SELECT 
        v.id,
        v.property_id,
        v.lead_id,
        v.agent_id,
        v.viewing_date,
        v.viewing_time,
        v.status,
        v.is_serious,
        v.description,
        v.notes,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vu.id,
              'update_text', vu.update_text,
              'update_date', vu.update_date,
              'status', vu.status,
              'created_by', vu.created_by,
              'created_by_name', creator.name,
              'created_at', vu.created_at
            ) ORDER BY vu.update_date DESC, vu.created_at DESC
          ) FILTER (WHERE vu.id IS NOT NULL),
          '[]'::json
        ) as updates
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      LEFT JOIN viewing_updates vu ON v.id = vu.viewing_id
      LEFT JOIN users creator ON vu.created_by = creator.id
      WHERE v.id = $1
      GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
               v.status, v.is_serious, v.description, v.notes, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
    `, [id]);
    return result.rows[0];
  }

  // Update viewing
  static async updateViewing(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      return await Viewing.getViewingById(id);
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE viewings 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  // Delete viewing
  static async deleteViewing(id) {
    const result = await pool.query(
      'DELETE FROM viewings WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Get viewings with filters
  static async getViewingsWithFilters(filters = {}) {
    let query = `
      SELECT 
        v.id,
        v.property_id,
        v.lead_id,
        v.agent_id,
        v.viewing_date,
        v.viewing_time,
        v.status,
        v.is_serious,
        v.description,
        v.notes,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vu.id,
              'update_text', vu.update_text,
              'update_date', vu.update_date,
              'status', vu.status,
              'created_by', vu.created_by,
              'created_by_name', creator.name,
              'created_at', vu.created_at
            ) ORDER BY vu.update_date DESC, vu.created_at DESC
          ) FILTER (WHERE vu.id IS NOT NULL),
          '[]'::json
        ) as updates
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      LEFT JOIN viewing_updates vu ON v.id = vu.viewing_id
      LEFT JOIN users creator ON vu.created_by = creator.id
      WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    if (filters.status && filters.status !== 'All') {
      query += ` AND v.status = $${valueIndex}`;
      values.push(filters.status);
      valueIndex++;
    }

    if (filters.agent_id) {
      query += ` AND v.agent_id = $${valueIndex}`;
      values.push(filters.agent_id);
      valueIndex++;
    }

    if (filters.property_id) {
      query += ` AND v.property_id = $${valueIndex}`;
      values.push(filters.property_id);
      valueIndex++;
    }

    if (filters.lead_id) {
      query += ` AND v.lead_id = $${valueIndex}`;
      values.push(filters.lead_id);
      valueIndex++;
    }

    if (filters.date_from && filters.date_from.trim() !== '') {
      query += ` AND v.viewing_date >= $${valueIndex}::date`;
      values.push(filters.date_from.trim());
      valueIndex++;
    }

    if (filters.date_to && filters.date_to.trim() !== '') {
      query += ` AND v.viewing_date <= $${valueIndex}::date`;
      values.push(filters.date_to.trim());
      valueIndex++;
    }

    if (filters.search) {
      query += ` AND (l.customer_name ILIKE $${valueIndex} OR p.reference_number ILIKE $${valueIndex} OR p.location ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    query += ` 
      GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
               v.status, v.is_serious, v.description, v.notes, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
      ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get viewing statistics
  static async getViewingStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_viewings,
        COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'No Show' THEN 1 END) as no_show,
        COUNT(CASE WHEN status = 'Rescheduled' THEN 1 END) as rescheduled
      FROM viewings
    `);
    return result.rows[0];
  }

  // Get viewings for a specific agent based on role permissions
  static async getViewingsForAgent(agentId, userRole) {
    // Agents and team leaders see viewings assigned to them
    if (userRole === 'agent') {
      return this.getViewingsByAgent(agentId);
    }
    
    // Team leaders see their own and their team's viewings
    if (userRole === 'team_leader') {
      return this.getViewingsForTeamLeader(agentId);
    }
    
    // Admins, operations managers, operations, and agent managers see all viewings
    return this.getAllViewings();
  }

  // Add update to viewing
  static async addViewingUpdate(viewingId, updateData) {
    const { update_text, update_date, created_by } = updateData;
    
    const result = await pool.query(
      `INSERT INTO viewing_updates (viewing_id, update_text, update_date, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [viewingId, update_text, update_date || new Date().toISOString().split('T')[0], created_by]
    );
    return result.rows[0];
  }

  // Get single viewing update by ID
  static async getViewingUpdateById(updateId) {
    const result = await pool.query(
      `SELECT 
        vu.id,
        vu.viewing_id,
        vu.update_text,
        vu.update_date,
        vu.created_by,
        vu.created_at,
        u.name as created_by_name,
        u.role as created_by_role
      FROM viewing_updates vu
      LEFT JOIN users u ON vu.created_by = u.id
      WHERE vu.id = $1`,
      [updateId]
    );
    return result.rows[0];
  }

  // Update an existing viewing update
  static async updateViewingUpdate(updateId, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (Object.prototype.hasOwnProperty.call(updateData, 'update_text')) {
      fields.push(`update_text = $${paramIndex++}`);
      values.push(updateData.update_text);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'update_date')) {
      fields.push(`update_date = $${paramIndex++}`);
      values.push(updateData.update_date);
    }

    if (fields.length === 0) {
      return await Viewing.getViewingUpdateById(updateId);
    }

    const query = `
      UPDATE viewing_updates
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, [...values, updateId]);
    return result.rows[0];
  }

  // Get updates for a viewing
  static async getViewingUpdates(viewingId) {
    const result = await pool.query(
      `SELECT 
        vu.id,
        vu.viewing_id,
        vu.update_text,
        vu.update_date,
        vu.created_by,
        vu.created_at,
        u.name as created_by_name,
        u.role as created_by_role
      FROM viewing_updates vu
      LEFT JOIN users u ON vu.created_by = u.id
      WHERE vu.viewing_id = $1
      ORDER BY vu.update_date DESC, vu.created_at DESC`,
      [viewingId]
    );
    return result.rows;
  }

  // Delete viewing update
  static async deleteViewingUpdate(updateId) {
    const result = await pool.query(
      'DELETE FROM viewing_updates WHERE id = $1 RETURNING *',
      [updateId]
    );
    return result.rows[0];
  }
}

module.exports = Viewing;

