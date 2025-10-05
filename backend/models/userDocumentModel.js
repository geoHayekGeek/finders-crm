// models/userDocumentModel.js
const pool = require('../config/db');

class UserDocument {
  /**
   * Create a new user document record
   */
  static async create({ 
    user_id, 
    document_name, 
    document_label, 
    file_path, 
    file_type, 
    file_size, 
    uploaded_by, 
    notes 
  }) {
    const result = await pool.query(
      `INSERT INTO user_documents 
        (user_id, document_name, document_label, file_path, file_type, file_size, uploaded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, document_name, document_label, file_path, file_type, file_size, uploaded_by, notes]
    );
    return result.rows[0];
  }

  /**
   * Get all documents for a specific user
   */
  static async getUserDocuments(userId) {
    const result = await pool.query(
      `SELECT 
        ud.*,
        u.name as uploaded_by_name
       FROM user_documents ud
       LEFT JOIN users u ON ud.uploaded_by = u.id
       WHERE ud.user_id = $1 AND ud.is_active = TRUE
       ORDER BY ud.upload_date DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get a specific document by ID
   */
  static async getById(documentId) {
    const result = await pool.query(
      `SELECT 
        ud.*,
        u.name as uploaded_by_name
       FROM user_documents ud
       LEFT JOIN users u ON ud.uploaded_by = u.id
       WHERE ud.id = $1`,
      [documentId]
    );
    return result.rows[0];
  }

  /**
   * Update document metadata
   */
  static async update(documentId, { document_label, notes }) {
    const result = await pool.query(
      `UPDATE user_documents 
       SET document_label = $1, notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [document_label, notes, documentId]
    );
    return result.rows[0];
  }

  /**
   * Soft delete a document
   */
  static async delete(documentId) {
    const result = await pool.query(
      `UPDATE user_documents 
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [documentId]
    );
    return result.rows[0];
  }

  /**
   * Hard delete a document (use with caution)
   */
  static async hardDelete(documentId) {
    const result = await pool.query(
      'DELETE FROM user_documents WHERE id = $1 RETURNING *',
      [documentId]
    );
    return result.rows[0];
  }

  /**
   * Get document count for a user
   */
  static async getUserDocumentCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM user_documents WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Search documents by label or filename
   */
  static async search(userId, searchTerm) {
    const result = await pool.query(
      `SELECT 
        ud.*,
        u.name as uploaded_by_name
       FROM user_documents ud
       LEFT JOIN users u ON ud.uploaded_by = u.id
       WHERE ud.user_id = $1 
         AND ud.is_active = TRUE
         AND (ud.document_label ILIKE $2 OR ud.document_name ILIKE $2)
       ORDER BY ud.upload_date DESC`,
      [userId, `%${searchTerm}%`]
    );
    return result.rows;
  }
}

module.exports = UserDocument;
