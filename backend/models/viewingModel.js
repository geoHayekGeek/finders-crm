// models/viewingModel.js
const pool = require('../config/db');
const fs = require('fs');
const logPath = 'c:\\Users\\GeorgioHayek\\Desktop\\Applications\\finders-system\\finders-crm\\.cursor\\debug.log';

class Viewing {
  // Helper method to fetch sub-viewings for a viewing
  static async getSubViewingsForViewing(parentViewingId) {
    const result = await pool.query(`
      SELECT 
        sv.id,
        sv.property_id,
        sv.lead_id,
        sv.agent_id,
        sv.viewing_date,
        sv.viewing_time,
        sv.status,
        sv.is_serious,
        sv.description,
        sv.notes,
        sv.parent_viewing_id,
        sv.created_at,
        sv.updated_at,
        sp.reference_number as property_reference,
        sp.location as property_location,
        sp.property_type,
        sl.customer_name as lead_name,
        sl.phone_number as lead_phone,
        su.name as agent_name,
        su.role as agent_role
      FROM viewings sv
      LEFT JOIN properties sp ON sv.property_id = sp.id
      LEFT JOIN leads sl ON sv.lead_id = sl.id
      LEFT JOIN users su ON sv.agent_id = su.id
      WHERE sv.parent_viewing_id = $1
      ORDER BY sv.viewing_date DESC, sv.viewing_time DESC
    `, [parentViewingId]);
    return result.rows;
  }

  // Helper method to attach sub-viewings to viewing objects
  static async attachSubViewings(viewings) {
    if (!viewings || viewings.length === 0) return viewings;
    
    const viewingIds = viewings.map(v => v.id);
    const allSubViewings = await pool.query(`
      SELECT 
        sv.id,
        sv.property_id,
        sv.lead_id,
        sv.agent_id,
        sv.viewing_date,
        sv.viewing_time,
        sv.status,
        sv.is_serious,
        sv.description,
        sv.notes,
        sv.parent_viewing_id,
        sv.created_at,
        sv.updated_at,
        sp.reference_number as property_reference,
        sp.location as property_location,
        sp.property_type,
        sl.customer_name as lead_name,
        sl.phone_number as lead_phone,
        su.name as agent_name,
        su.role as agent_role
      FROM viewings sv
      LEFT JOIN properties sp ON sv.property_id = sp.id
      LEFT JOIN leads sl ON sv.lead_id = sl.id
      LEFT JOIN users su ON sv.agent_id = su.id
      WHERE sv.parent_viewing_id = ANY($1::int[])
      ORDER BY sv.parent_viewing_id, sv.viewing_date DESC, sv.viewing_time DESC
    `, [viewingIds]);
    
    // Group sub-viewings by parent viewing ID
    const subViewingsMap = new Map();
    allSubViewings.rows.forEach(sv => {
      if (!subViewingsMap.has(sv.parent_viewing_id)) {
        subViewingsMap.set(sv.parent_viewing_id, []);
      }
      subViewingsMap.get(sv.parent_viewing_id).push(sv);
    });
    
    // Attach sub-viewings to parent viewings
    return viewings.map(viewing => ({
      ...viewing,
      sub_viewings: subViewingsMap.get(viewing.id) || []
    }));
  }

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
      notes,
      parent_viewing_id
    } = viewingData;

    const result = await pool.query(
      `INSERT INTO viewings (
        property_id, lead_id, agent_id, viewing_date, viewing_time, status, is_serious, description, notes, parent_viewing_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        notes,
        parent_viewing_id || null
      ]
    );
    return result.rows[0];
  }

  // Get all viewings with related data and sub-viewings
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
          v.parent_viewing_id,
          v.created_at,
          v.updated_at,
          p.reference_number as property_reference,
          p.location as property_location,
          p.property_type,
          l.customer_name as lead_name,
          l.phone_number as lead_phone,
          u.name as agent_name,
          u.role as agent_role
        FROM viewings v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN leads l ON v.lead_id = l.id
        LEFT JOIN users u ON v.agent_id = u.id
        WHERE v.parent_viewing_id IS NULL
        ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
      `);
      
      // Fetch and attach sub-viewings
      const viewingsWithSubViewings = await Viewing.attachSubViewings(result.rows);
      
      console.log('✅ Query executed successfully, rows returned:', viewingsWithSubViewings.length);
      return viewingsWithSubViewings;
    } catch (error) {
      console.error('❌ Error in getAllViewings:', error);
      throw error;
    }
  }

  // Get viewings by agent (only parent viewings, sub-viewings attached via helper)
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
        v.parent_viewing_id,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      WHERE v.agent_id = $1 AND v.parent_viewing_id IS NULL
      ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
    `, [agentId]);
    return await Viewing.attachSubViewings(result.rows);
  }

  // Get viewings by team leader (their own + their team's) - only parent viewings
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
        v.parent_viewing_id,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      WHERE (v.agent_id = $1 
         OR v.agent_id IN (
           SELECT ta.agent_id 
           FROM team_agents ta 
           WHERE ta.team_leader_id = $1 AND ta.is_active = true
         ))
         AND v.parent_viewing_id IS NULL
      ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
    `, [teamLeaderId]);
    return await Viewing.attachSubViewings(result.rows);
  }

  // Get viewing by ID with sub-viewings
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
        v.parent_viewing_id,
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
               v.status, v.is_serious, v.description, v.notes, v.parent_viewing_id, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
    `, [id]);
    
    if (!result.rows[0]) {
      return null;
    }
    
    const viewing = result.rows[0];
    
    // If this is a parent viewing, attach sub-viewings
    if (!viewing.parent_viewing_id) {
      const subViewings = await Viewing.getSubViewings(viewing.id);
      viewing.sub_viewings = subViewings;
    }
    
    return viewing;
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
    // #region debug log
    const fs = require('fs');
    const logPath = 'c:\\Users\\GeorgioHayek\\Desktop\\Applications\\finders-system\\finders-crm\\.cursor\\debug.log';
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'viewingModel.js:292',message:'getViewingsWithFilters called',data:{filters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})+'\n');
    } catch(e){}
    // #endregion
    
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
        v.parent_viewing_id,
        v.created_at,
        v.updated_at,
        p.reference_number as property_reference,
        p.location as property_location,
        p.property_type,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        u.name as agent_name,
        u.role as agent_role
      FROM viewings v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN users u ON v.agent_id = u.id
      WHERE v.parent_viewing_id IS NULL
    `;
    
    const values = [];
    let valueIndex = 1;

    if (filters.status && filters.status !== 'All') {
      query += ` AND v.status = $${valueIndex}`;
      values.push(filters.status);
      valueIndex++;
    }

    if (filters.agent_id) {
      // Ensure agent_id is a number (convert string to number if needed)
      const agentIdNum = typeof filters.agent_id === 'string' ? parseInt(filters.agent_id, 10) : filters.agent_id;
      // #region debug log
      try {
        fs.appendFileSync(logPath, JSON.stringify({location:'viewingModel.js:346',message:'Processing agent_id filter',data:{originalValue:filters.agent_id,originalType:typeof filters.agent_id,convertedValue:agentIdNum,convertedType:typeof agentIdNum,isNaN:isNaN(agentIdNum)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'S'})+'\n');
      } catch(e){}
      // #endregion
      if (!isNaN(agentIdNum) && agentIdNum > 0) {
        query += ` AND v.agent_id = $${valueIndex}`;
        values.push(agentIdNum);
        valueIndex++;
      }
    }

    if (filters.property_id) {
      // Ensure property_id is a number (convert string to number if needed)
      const propertyIdNum = typeof filters.property_id === 'string' ? parseInt(filters.property_id, 10) : filters.property_id;
      // #region debug log
      try {
        fs.appendFileSync(logPath, JSON.stringify({location:'viewingModel.js:352',message:'Processing property_id filter',data:{originalValue:filters.property_id,originalType:typeof filters.property_id,convertedValue:propertyIdNum,convertedType:typeof propertyIdNum,isNaN:isNaN(propertyIdNum)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'R'})+'\n');
      } catch(e){}
      // #endregion
      if (!isNaN(propertyIdNum) && propertyIdNum > 0) {
        query += ` AND v.property_id = $${valueIndex}`;
        values.push(propertyIdNum);
        valueIndex++;
      }
    }
    
    // #region debug log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'viewingModel.js:356',message:'SQL query built',data:{query:query.substring(0,200)+'...',values,hasAgentIdFilter:!!filters.agent_id,hasPropertyIdFilter:!!filters.property_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P'})+'\n');
    } catch(e){}
    // #endregion

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

    // Exclude sub-viewings from main list (they should only show when viewing a parent)
    query += ` AND (v.parent_viewing_id IS NULL)`;

    query += ` 
      ORDER BY v.is_serious DESC, v.viewing_date DESC, v.viewing_time DESC
    `;
    
    // #region debug log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'viewingModel.js:388',message:'Executing SQL query',data:{queryLength:query.length,paramCount:values.length,values,hasAgentIdFilter:!!filters.agent_id,hasPropertyIdFilter:!!filters.property_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})+'\n');
    } catch(e){}
    // #endregion

    const result = await pool.query(query, values);
    // #region debug log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'viewingModel.js:391',message:'Query results',data:{rowCount:result.rows.length,viewingIds:result.rows.map(r=>r.id),viewingAgentIds:result.rows.map(r=>r.agent_id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Q'})+'\n');
    } catch(e){}
    // #endregion
    
    // Attach sub-viewings to filtered results
    return await Viewing.attachSubViewings(result.rows);
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
    const { update_text, update_date, created_by, status } = updateData;
    
    const result = await pool.query(
      `INSERT INTO viewing_updates (viewing_id, update_text, update_date, created_by, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        viewingId, 
        update_text, 
        update_date || new Date().toISOString().split('T')[0], 
        created_by,
        status || 'Initial Contact'
      ]
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
        vu.status,
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

    if (Object.prototype.hasOwnProperty.call(updateData, 'status')) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
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
        vu.status,
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

  // Get sub-viewings (follow-up viewings) for a parent viewing
  static async getSubViewings(parentViewingId) {
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
        v.parent_viewing_id,
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
      WHERE v.parent_viewing_id = $1
      GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
               v.status, v.is_serious, v.description, v.notes, v.parent_viewing_id, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
      ORDER BY v.viewing_date DESC, v.viewing_time DESC
    `, [parentViewingId]);
    return result.rows;
  }

  // Attach sub-viewings to parent viewings
  static async attachSubViewings(viewings) {
    if (!viewings || viewings.length === 0) {
      return viewings;
    }

    // Get all parent viewing IDs
    const parentViewingIds = viewings
      .filter(v => !v.parent_viewing_id)
      .map(v => v.id);

    if (parentViewingIds.length === 0) {
      return viewings;
    }

    // Fetch all sub-viewings for these parents
    const subViewingsResult = await pool.query(`
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
        v.parent_viewing_id,
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
      WHERE v.parent_viewing_id = ANY($1::int[])
      GROUP BY v.id, v.property_id, v.lead_id, v.agent_id, v.viewing_date, v.viewing_time,
               v.status, v.is_serious, v.description, v.notes, v.parent_viewing_id, v.created_at, v.updated_at,
               p.reference_number, p.location, p.property_type,
               l.customer_name, l.phone_number, u.name, u.role
      ORDER BY v.viewing_date DESC, v.viewing_time DESC
    `, [parentViewingIds]);

    // Group sub-viewings by parent_id
    const subViewingsByParent = {};
    subViewingsResult.rows.forEach(subViewing => {
      const parentId = subViewing.parent_viewing_id;
      if (!subViewingsByParent[parentId]) {
        subViewingsByParent[parentId] = [];
      }
      subViewingsByParent[parentId].push(subViewing);
    });

    // Attach sub-viewings to parent viewings
    return viewings.map(viewing => {
      if (viewing.parent_viewing_id) {
        // This is a sub-viewing, don't attach anything
        return viewing;
      }
      viewing.sub_viewings = subViewingsByParent[viewing.id] || [];
      return viewing;
    });
  }
}

module.exports = Viewing;

