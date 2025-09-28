// models/userModel.js
const pool = require('../config/db');

class User {
  static async createUser({ name, email, password, role, location, phone, dob, user_code, is_assigned = false, assigned_to = null }) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, location, phone, dob, user_code, is_assigned, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, email, password, role, location, phone, dob, user_code, is_assigned, assigned_to]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async updatePassword(email, hashedPassword) {
    console.log('🔄 Updating password for email:', email);
    console.log('🔐 New hash length:', hashedPassword.length);
    
    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING *`,
      [hashedPassword, email]
    );
    
    console.log('📊 Update query result:', {
      rowCount: result.rowCount,
      returnedRows: result.rows.length,
      email: result.rows[0]?.email
    });
    
    return result.rows[0];
  }

  static async getAllUsers() {
    const result = await pool.query(
      `SELECT id, name, email, role, location, phone, dob, user_code, is_assigned, assigned_to, created_at, updated_at FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async getUsersByRole(role) {
    const result = await pool.query(
      `SELECT id, name, email, role, location, phone, dob, user_code, created_at, updated_at FROM users WHERE role = $1 ORDER BY name`,
      [role]
    );
    return result.rows;
  }

  static async updateUser(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, role, location, phone, dob, user_code, created_at, updated_at
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteUser(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async findByUserCode(userCode) {
    const result = await pool.query(
      `SELECT * FROM users WHERE user_code = $1`,
      [userCode]
    );
    return result.rows[0];
  }

  static async generateUniqueUserCode() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      // Generate a random 6-character alphanumeric code
      const userCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Check if it already exists
      const existing = await this.findByUserCode(userCode);
      if (!existing) {
        return userCode;
      }
      
      attempts++;
    }
    
    // Fallback: use timestamp-based code
    return 'U' + Date.now().toString(36).toUpperCase();
  }

  // Team Leader Methods
  static async assignAgentToTeamLeader(teamLeaderId, agentId, assignedBy = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if agent is already assigned
      const agentCheck = await client.query(
        `SELECT is_assigned, assigned_to FROM users WHERE id = $1 AND role = 'agent'`,
        [agentId]
      );
      
      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found');
      }
      
      if (agentCheck.rows[0].is_assigned) {
        throw new Error('Agent is already assigned to a team leader');
      }
      
      // Update agent's assignment status
      await client.query(
        `UPDATE users SET is_assigned = TRUE, assigned_to = $1, updated_at = NOW() WHERE id = $2`,
        [teamLeaderId, agentId]
      );
      
      // Insert into team_agents table
      const result = await client.query(
        `INSERT INTO team_agents (team_leader_id, agent_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (team_leader_id, agent_id) 
         DO UPDATE SET is_active = TRUE, updated_at = NOW()
         RETURNING *`,
        [teamLeaderId, agentId, assignedBy]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async removeAgentFromTeamLeader(teamLeaderId, agentId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update team_agents table
      const result = await client.query(
        `UPDATE team_agents 
         SET is_active = FALSE, updated_at = NOW()
         WHERE team_leader_id = $1 AND agent_id = $2
         RETURNING *`,
        [teamLeaderId, agentId]
      );
      
      // Update agent's assignment status
      await client.query(
        `UPDATE users SET is_assigned = FALSE, assigned_to = NULL, updated_at = NOW() WHERE id = $1`,
        [agentId]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTeamLeaderAgents(teamLeaderId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.location, u.phone, u.user_code, ta.assigned_at
       FROM users u
       INNER JOIN team_agents ta ON u.id = ta.agent_id
       WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
       ORDER BY ta.assigned_at DESC`,
      [teamLeaderId]
    );
    return result.rows;
  }

  static async getAgentTeamLeader(agentId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.location, u.phone, u.user_code, ta.assigned_at
       FROM users u
       INNER JOIN team_agents ta ON u.id = ta.team_leader_id
       WHERE ta.agent_id = $1 AND ta.is_active = TRUE
       ORDER BY ta.assigned_at DESC
       LIMIT 1`,
      [agentId]
    );
    return result.rows[0];
  }

  static async getTeamLeaders() {
    const result = await pool.query(
      `SELECT id, name, email, role, location, phone, user_code, created_at, updated_at 
       FROM users 
       WHERE role = 'team_leader' 
       ORDER BY name`
    );
    return result.rows;
  }

  static async getAvailableAgentsForTeamLeader(teamLeaderId = null) {
    let query, params;
    
    if (teamLeaderId) {
      // Get agents not already assigned to any team leader
      query = `
        SELECT u.id, u.name, u.email, u.role, u.location, u.phone, u.user_code, u.is_assigned, u.assigned_to
        FROM users u
        WHERE u.role = 'agent' AND u.is_assigned = FALSE
        ORDER BY u.name
      `;
      params = [];
    } else {
      // Get all agents with assignment status
      query = `
        SELECT u.id, u.name, u.email, u.role, u.location, u.phone, u.user_code, u.is_assigned, u.assigned_to
        FROM users u
        WHERE u.role = 'agent'
        ORDER BY u.name
      `;
      params = [];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async updateTeamLeaderAgentAssignment(teamLeaderId, agentId, newTeamLeaderId, assignedBy = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove from current team leader
      await client.query(
        `UPDATE team_agents 
         SET is_active = FALSE, updated_at = NOW()
         WHERE team_leader_id = $1 AND agent_id = $2`,
        [teamLeaderId, agentId]
      );
      
      // Update agent's assignment to new team leader
      await client.query(
        `UPDATE users SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
        [newTeamLeaderId, agentId]
      );
      
      // Assign to new team leader
      const result = await client.query(
        `INSERT INTO team_agents (team_leader_id, agent_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (team_leader_id, agent_id) 
         DO UPDATE SET is_active = TRUE, updated_at = NOW()
         RETURNING *`,
        [newTeamLeaderId, agentId, assignedBy]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = User;
