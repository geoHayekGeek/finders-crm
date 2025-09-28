// models/leadsModel.js
const pool = require('../config/db');

class Lead {
  static async createLead(leadData) {
    const {
      date,
      customer_name,
      phone_number,
      agent_id,
      agent_name,
      price,
      reference_source_id,
      operations_id,
      notes,
      status
    } = leadData;

    const result = await pool.query(
      `INSERT INTO leads (
        date, customer_name, phone_number, agent_id, agent_name,
        price, reference_source_id, operations_id, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        date || new Date().toISOString().split('T')[0],
        customer_name,
        phone_number,
        agent_id,
        agent_name,
        price,
        reference_source_id,
        operations_id,
        notes,
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
          l.operations_id,
          op.name as operations_name,
          op.role as operations_role,
          l.notes,
          l.status,
          l.created_at,
          l.updated_at
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
        LEFT JOIN users op ON l.operations_id = op.id
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
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.operations_id,
        op.name as operations_name,
        op.role as operations_role,
        l.notes,
        l.status,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users op ON l.operations_id = op.id
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
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.operations_id,
        op.name as operations_name,
        op.role as operations_role,
        l.notes,
        l.status,
        l.created_at,
        l.updated_at,
        'assigned' as agent_relationship
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users op ON l.operations_id = op.id
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
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.operations_id,
        op.name as operations_name,
        op.role as operations_role,
        l.notes,
        l.status,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users op ON l.operations_id = op.id
      WHERE l.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async updateLead(id, updates) {
    console.log('🔧 [Backend] Updating lead:', id);
    console.log('🔧 [Backend] Raw updates:', updates);
    
    // Filter out undefined values and handle null values properly
    const cleanUpdates = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
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
        l.operations_id,
        op.name as operations_name,
        op.role as operations_role,
        l.notes,
        l.status,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users op ON l.operations_id = op.id
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
      query += ` AND (l.customer_name ILIKE $${valueIndex} OR l.phone_number ILIKE $${valueIndex} OR l.agent_name ILIKE $${valueIndex} OR l.notes ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    query += ` ORDER BY l.created_at DESC`;

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

  // Get leads assigned to a specific operations user
  static async getLeadsByOperations(operationsId) {
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
        l.reference_source_id,
        rs.source_name as reference_source_name,
        l.operations_id,
        op.name as operations_name,
        op.role as operations_role,
        l.notes,
        l.status,
        l.created_at,
        l.updated_at
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users op ON l.operations_id = op.id
      WHERE l.operations_id = $1
      ORDER BY l.created_at DESC
    `, [operationsId]);
    return result.rows;
  }

  // Get leads for a specific agent based on role permissions
  static async getLeadsForAgent(agentId, userRole) {
    // Agents see leads assigned to them or that they referred
    if (userRole === 'agent') {
      return this.getLeadsAssignedOrReferredByAgent(agentId);
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

  // Get operations users (operations employees and operations managers)
  static async getOperationsUsers() {
    const result = await pool.query(`
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('operations', 'operations_manager')
      ORDER BY name
    `);
    return result.rows;
  }
}

module.exports = Lead;
