const pool = require('../config/db');
const { normalizeRole } = require('../utils/roleUtils');

class Complaint {
  static async createComplaint({ lead_id, target_user_id, title, description, created_by }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO complaints (lead_id, target_user_id, title, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [lead_id, target_user_id, title, description, created_by]
      );

      const complaintId = insertResult.rows[0].id;

      const detailResult = await client.query(
        `SELECT
           c.*,
           l.customer_name AS lead_name,
           l.phone_number AS lead_phone,
           target.name AS target_user_name,
           target.role AS target_user_role,
           target.assigned_to AS target_assigned_to,
           creator.name AS created_by_name,
           creator.role AS created_by_role
         FROM complaints c
         LEFT JOIN leads l ON l.id = c.lead_id
         LEFT JOIN users target ON target.id = c.target_user_id
         LEFT JOIN users creator ON creator.id = c.created_by
         WHERE c.id = $1
         LIMIT 1`,
        [complaintId]
      );

      await client.query('COMMIT');
      return detailResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getComplaints({
    search,
    targetRole,
    leadId,
    targetUserId,
    targetUserIds,
    limit = 200,
    offset = 0
  } = {}) {
    const params = [];
    const where = [];

    let query = `
      SELECT
        c.*,
        l.customer_name AS lead_name,
        l.phone_number AS lead_phone,
        target.name AS target_user_name,
        target.role AS target_user_role,
        target.assigned_to AS target_assigned_to,
        creator.name AS created_by_name,
        creator.role AS created_by_role
      FROM complaints c
      LEFT JOIN leads l ON l.id = c.lead_id
      LEFT JOIN users target ON target.id = c.target_user_id
      LEFT JOIN users creator ON creator.id = c.created_by
    `;

    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      params.push(targetUserIds);
      where.push(`c.target_user_id = ANY($${params.length}::int[])`);
    }

    if (leadId) {
      params.push(leadId);
      where.push(`c.lead_id = $${params.length}`);
    }

    if (targetUserId) {
      params.push(targetUserId);
      where.push(`c.target_user_id = $${params.length}`);
    }

    if (targetRole) {
      const normalizedTargetRole = normalizeRole(targetRole);

      if (normalizedTargetRole === 'agent') {
        where.push(`target.role IN ('agent', 'consultant')`);
      } else if (normalizedTargetRole === 'consultant') {
        where.push(`target.role = 'consultant'`);
      } else {
        params.push(normalizedTargetRole);
        where.push(`LOWER(REPLACE(target.role, '_', ' ')) = $${params.length}`);
      }
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      params.push(q);
      const idx = params.length;
      where.push(
        `(c.title ILIKE $${idx} OR c.description ILIKE $${idx} OR l.customer_name ILIKE $${idx} OR target.name ILIKE $${idx} OR creator.name ILIKE $${idx})`
      );
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    if (limit !== null && limit !== undefined) {
      params.push(limit);
      params.push(offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = Complaint;
