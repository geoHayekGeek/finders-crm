const pool = require('../config/db');

class LeadNote {
  static async createNote(leadId, user, noteText) {
    const result = await pool.query(
      `INSERT INTO lead_notes (lead_id, created_by, created_by_role, note_text)
       VALUES ($1, $2, $3, $4)
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

  static async getNoteById(noteId) {
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
       WHERE ln.id = $1`,
      [noteId]
    );
    return result.rows[0];
  }

  static async updateNote(noteId, noteText) {
    const result = await pool.query(
      `UPDATE lead_notes 
       SET note_text = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [noteText, noteId]
    );
    return result.rows[0];
  }

  static async deleteNote(noteId) {
    const result = await pool.query(
      `DELETE FROM lead_notes WHERE id = $1 RETURNING *`,
      [noteId]
    );
    return result.rows[0];
  }
}

module.exports = LeadNote;


