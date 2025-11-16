const pool = require('../config/db');

class LeadNote {
  static async createOrUpdateNote(leadId, user, noteText) {
    const result = await pool.query(
      `INSERT INTO lead_notes (lead_id, created_by, created_by_role, note_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lead_id, created_by)
       DO UPDATE SET 
         note_text = EXCLUDED.note_text,
         created_by_role = EXCLUDED.created_by_role,
         updated_at = NOW()
       RETURNING *`,
      [leadId, user.id, user.role, noteText]
    );
    return result.rows[0];
  }

  static async getNotesForLead(leadId) {
    const result = await pool.query(
      `SELECT 
        ln.id,
        ln.lead_id,
        ln.note_text,
        ln.created_by,
        u.name as created_by_name,
        ln.created_by_role,
        ln.created_at,
        ln.updated_at
       FROM lead_notes ln
       LEFT JOIN users u ON ln.created_by = u.id
       WHERE ln.lead_id = $1
       ORDER BY ln.created_at DESC`,
      [leadId]
    );
    return result.rows;
  }
}

module.exports = LeadNote;


