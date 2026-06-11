// models/leadsModel.js
const pool = require('../config/db');
const {
  buildLeadRoleWhereClause,
  isTruthyLeadRole,
} = require('../utils/leadRoles');
const { normalizeRole, isAgentLikeRole } = require('../utils/roleUtils');

const LEAD_SELECT_COLUMNS = `
  l.id,
  l.date,
  l.customer_name,
  l.phone_number,
  l.agent_id,
  l.agent_name,
  u.name as assigned_agent_name,
  u.role as agent_role,
  l.price,
  l.is_buyer,
  l.is_seller,
  CASE
    WHEN l.is_buyer = TRUE AND l.is_seller = TRUE THEN 'both'
    WHEN l.is_buyer = TRUE THEN 'buyer'
    WHEN l.is_seller = TRUE THEN 'seller'
    ELSE NULL
  END as lead_role,
  l.reference_source_id,
  rs.source_name as reference_source_name,
  l.added_by_id,
  added_by.name as added_by_name,
  added_by.role as added_by_role,
  (SELECT COUNT(*) FROM viewings v WHERE v.lead_id = l.id) as total_viewings,
  l.created_at,
  l.updated_at
`;

class Lead {
  static buildLeadsFilters(filters = {}, values = [], valueIndex = 1) {
    let whereClause = '';

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

    whereClause += buildLeadRoleWhereClause(filters.lead_role);

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
      is_buyer,
      is_seller,
      reference_source_id,
      added_by_id,
    } = leadData;

    if (!added_by_id) {
      throw new Error('added_by_id is required and cannot be null');
    }

    const resolvedIsBuyer = Object.prototype.hasOwnProperty.call(leadData, 'is_buyer')
      ? isTruthyLeadRole(is_buyer)
      : true;
    const resolvedIsSeller = Object.prototype.hasOwnProperty.call(leadData, 'is_seller')
      ? isTruthyLeadRole(is_seller)
      : false;

    if (!resolvedIsBuyer && !resolvedIsSeller) {
      throw new Error('Lead must be buyer, seller, or both');
    }

    const result = await pool.query(
      `INSERT INTO leads (
        date, customer_name, phone_number, agent_id, agent_name,
        price, is_buyer, is_seller, reference_source_id, added_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        date || new Date().toISOString().split('T')[0],
        customer_name,
        phone_number,
        agent_id,
        agent_name,
        price,
        resolvedIsBuyer,
        resolvedIsSeller,
        reference_source_id,
        added_by_id,
      ]
    );

    return result.rows[0];
  }

  static async getAllLeads() {
    const result = await pool.query(`
      SELECT
        ${LEAD_SELECT_COLUMNS}
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      ORDER BY l.created_at DESC
    `);

    return result.rows;
  }

  static async getLeadsByAgent(agentId) {
    const result = await pool.query(
      `
      SELECT
        ${LEAD_SELECT_COLUMNS}
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      WHERE l.agent_id = $1
      ORDER BY l.created_at DESC
    `,
      [agentId]
    );

    return result.rows;
  }

  // Get leads that are assigned to a specific agent.
  static async getLeadsAssignedOrReferredByAgent(agentId) {
    const result = await pool.query(
      `
      SELECT
        ${LEAD_SELECT_COLUMNS},
        'assigned' as agent_relationship
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      WHERE l.agent_id = $1
      ORDER BY l.created_at DESC
    `,
      [agentId]
    );

    return result.rows;
  }

  static async getLeadById(id) {
    const result = await pool.query(
      `
      SELECT
        ${LEAD_SELECT_COLUMNS},
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
      LEFT JOIN lead_referrals lr ON l.id = lr.lead_id
      LEFT JOIN users ref_agent ON lr.agent_id = ref_agent.id
      LEFT JOIN users referred_by ON lr.referred_by_user_id = referred_by.id
      LEFT JOIN users referred_to ON lr.referred_to_agent_id = referred_to.id
      WHERE l.id = $1
      GROUP BY
        l.id, l.date, l.customer_name, l.phone_number, l.agent_id, l.agent_name,
        u.name, u.role, l.price, l.is_buyer, l.is_seller, l.reference_source_id, rs.source_name, l.added_by_id,
        added_by.name, added_by.role, l.created_at, l.updated_at
    `,
      [id]
    );

    return result.rows[0];
  }

  static async updateLead(id, updates) {
    if (Object.prototype.hasOwnProperty.call(updates, 'added_by_id') && (!updates.added_by_id || updates.added_by_id === null)) {
      throw new Error('added_by_id is required and cannot be null');
    }

    const roleFieldsPresent = Object.prototype.hasOwnProperty.call(updates, 'is_buyer') ||
      Object.prototype.hasOwnProperty.call(updates, 'is_seller');

    if (roleFieldsPresent) {
      const currentLead = await Lead.getLeadById(id);
      const nextIsBuyer = Object.prototype.hasOwnProperty.call(updates, 'is_buyer')
        ? isTruthyLeadRole(updates.is_buyer)
        : !!currentLead?.is_buyer;
      const nextIsSeller = Object.prototype.hasOwnProperty.call(updates, 'is_seller')
        ? isTruthyLeadRole(updates.is_seller)
        : !!currentLead?.is_seller;

      if (!nextIsBuyer && !nextIsSeller) {
        throw new Error('Lead must be buyer, seller, or both');
      }
    }

    const cleanUpdates = {};
    const nonTableFields = ['referrals', 'notes', 'status', 'status_id', 'status_can_be_referred'];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !nonTableFields.includes(key)) {
        cleanUpdates[key] = value;
      }
    });

    const fields = Object.keys(cleanUpdates);
    const values = Object.values(cleanUpdates);

    if (fields.length === 0) {
      return Lead.getLeadById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE leads
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteLead(id) {
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async getLeadsWithFilters(filters = {}) {
    let query = `
      SELECT
        ${LEAD_SELECT_COLUMNS},
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
      LEFT JOIN lead_referrals lr ON l.id = lr.lead_id
      LEFT JOIN users ref_agent ON lr.agent_id = ref_agent.id
      WHERE 1=1
    `;

    const values = [];
    const { whereClause } = this.buildLeadsFilters(filters, values, 1);
    query += whereClause;

    query += `
      GROUP BY
        l.id, l.date, l.customer_name, l.phone_number, l.agent_id, l.agent_name,
        u.name, u.role, l.price, l.is_buyer, l.is_seller, l.reference_source_id, rs.source_name, l.added_by_id,
        added_by.name, added_by.role, l.created_at, l.updated_at
      ORDER BY l.created_at DESC
    `;

    const result = await pool.query(query, values);
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
        ${LEAD_SELECT_COLUMNS}
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
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

  static async getLeadViewings(leadId) {
    const result = await pool.query(
      `
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
    `,
      [leadId]
    );

    return result.rows;
  }

  static async getLeadOwnedProperties(leadId) {
    const result = await pool.query(
      `
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
    `,
      [leadId]
    );

    return result.rows;
  }

  static async getLeadStats() {
    const result = await pool.query(`SELECT COUNT(*)::int as total_leads FROM leads`);
    const totalLeads = result.rows[0]?.total_leads || 0;

    return {
      total_leads: totalLeads,
      active: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      closed: 0,
    };
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
    return [];
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

  static async getLeadsByAddedBy(addedById) {
    const result = await pool.query(
      `
      SELECT
        ${LEAD_SELECT_COLUMNS}
      FROM leads l
      LEFT JOIN users u ON l.agent_id = u.id
      LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
      LEFT JOIN users added_by ON l.added_by_id = added_by.id
      WHERE l.added_by_id = $1
      ORDER BY l.created_at DESC
    `,
      [addedById]
    );

    return result.rows;
  }

  static async getLeadsForAgent(agentId, userRole) {
    const normalizedRole = normalizeRole(userRole);

    if (isAgentLikeRole(normalizedRole)) {
      return this.getLeadsAssignedOrReferredByAgent(agentId);
    }

    if (normalizedRole === 'team leader') {
      const teamLeaderLeads = await this.getLeadsAssignedOrReferredByAgent(agentId);
      const teamAgentsResult = await pool.query(
        `SELECT agent_id FROM team_agents
         WHERE team_leader_id = $1 AND is_active = TRUE`,
        [agentId]
      );

      const teamAgentIds = teamAgentsResult.rows.map((row) => row.agent_id);
      if (teamAgentIds.length === 0) return teamLeaderLeads;

      const teamLeadsResult = await pool.query(
        `
        SELECT
          ${LEAD_SELECT_COLUMNS}
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
        LEFT JOIN users added_by ON l.added_by_id = added_by.id
        WHERE l.agent_id = ANY($1::int[])
        ORDER BY l.created_at DESC
      `,
        [teamAgentIds]
      );

      const existingIds = new Set(teamLeaderLeads.map((lead) => lead.id));
      const uniqueTeamLeads = teamLeadsResult.rows.filter((lead) => !existingIds.has(lead.id));
      return [...teamLeaderLeads, ...uniqueTeamLeads];
    }

    return this.getAllLeads();
  }

  static async getReferenceSources() {
    const result = await pool.query(`
      SELECT id, source_name, created_at, modified_at
      FROM reference_sources
      ORDER BY source_name
    `);

    return result.rows;
  }

  static async getUsersWhoCanAddLeads() {
    const result = await pool.query(`
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('admin', 'operations_manager', 'operations', 'agent', 'consultant', 'team_leader')
      ORDER BY name
    `);

    return result.rows;
  }
}

module.exports = Lead;
