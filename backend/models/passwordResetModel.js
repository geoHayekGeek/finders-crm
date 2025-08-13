const { Pool } = require('pg');
const db = require('../config/db');

class PasswordReset {
  static async createToken(email, token, expiresAt) {
    try {
      console.log('🔑 Creating password reset token:', { email, token, expiresAt });
      
      const query = `
        INSERT INTO password_resets (email, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
          token = $2, 
          expires_at = $3, 
          created_at = NOW()
      `;
      
      console.log('📝 Executing query with params:', [email, token, expiresAt]);
      const result = await db.query(query, [email, token, expiresAt]);
      console.log('✅ Token created successfully, rows affected:', result.rowCount);
      
      return true;
    } catch (error) {
      console.error('❌ Error creating password reset token:', error);
      throw error;
    }
  }

  static async findValidToken(email, token) {
    try {
      console.log('🔍 Finding valid token:', { email, token });
      
      const query = `
        SELECT * FROM password_resets 
        WHERE email = $1 AND token = $2 AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      console.log('📝 Executing query with params:', [email, token]);
      const result = await db.query(query, [email, token]);
      console.log('📊 Query result:', { 
        rowCount: result.rowCount, 
        foundToken: result.rows[0] ? 'Yes' : 'No',
        tokenData: result.rows[0] ? { id: result.rows[0].id, expires: result.rows[0].expires_at } : null
      });
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding password reset token:', error);
      throw error;
    }
  }

  static async deleteToken(email) {
    try {
      const query = 'DELETE FROM password_resets WHERE email = $1';
      await db.query(query, [email]);
      return true;
    } catch (error) {
      console.error('Error deleting password reset token:', error);
      throw error;
    }
  }

  static async cleanupExpiredTokens() {
    try {
      const query = 'DELETE FROM password_resets WHERE expires_at <= NOW()';
      await db.query(query);
      return true;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }
}

module.exports = PasswordReset;
