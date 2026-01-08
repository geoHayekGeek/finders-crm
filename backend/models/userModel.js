// models/userModel.js
const pool = require('../config/db');

class User {
  static async createUser({ name, email, password, role, phone, dob, work_location, user_code, is_assigned = false, assigned_to = null, address = null }) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, dob, work_location, user_code, is_assigned, assigned_to, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, email, password, role, phone, dob, work_location, user_code, is_assigned, assigned_to, address]
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
      `SELECT 
        u.id, u.name, u.email, u.role, u.phone, u.dob, 
        u.work_location, u.user_code, u.is_assigned, u.assigned_to, 
        u.is_active, u.address, u.created_at, u.updated_at,
        CASE 
          WHEN u.role = 'team_leader' THEN (
            SELECT COUNT(*)::integer 
            FROM team_agents ta 
            WHERE ta.team_leader_id = u.id AND ta.is_active = TRUE
          )
          ELSE NULL
        END as agent_count,
        (
          SELECT COUNT(*)::integer 
          FROM properties p 
          WHERE p.agent_id = u.id
        ) as properties_count,
        (
          SELECT COUNT(*)::integer 
          FROM leads l 
          WHERE l.agent_id = u.id
        ) as leads_count,
        (
          SELECT tl.user_code 
          FROM users tl
          WHERE tl.id = u.assigned_to
          LIMIT 1
        ) as team_leader_code,
        (
          SELECT tl.name 
          FROM users tl
          WHERE tl.id = u.assigned_to
          LIMIT 1
        ) as team_leader_name
      FROM users u 
      ORDER BY u.created_at DESC`
    );
    return result.rows;
  }

  static async getUsersByRole(role) {
    const result = await pool.query(
      `SELECT id, name, email, role, phone, dob, user_code, address, created_at, updated_at FROM users WHERE role = $1 ORDER BY name`,
      [role]
    );
    return result.rows;
  }

  static async updateUser(id, updates) {
    const fields = Object.keys(updates).filter(key => updates[key] !== undefined);
    const values = fields.map(key => updates[key]);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, role, phone, dob, work_location, user_code, is_active, address, created_at, updated_at
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

  static async generateUniqueUserCode(name) {
    // Extract first and last name
    const nameParts = name.trim().split(/\s+/);
    let initials = '';
    
    if (nameParts.length === 1) {
      // If only one name, use first 2 letters
      initials = nameParts[0].substring(0, 2).toUpperCase();
    } else {
      // Use first letter of first name and first letter of last name
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    
    // Try the base initials first
    let userCode = initials;
    let existing = await this.findByUserCode(userCode);
    
    if (!existing) {
      return userCode;
    }
    
    // If initials already exist, add numbers starting from 1
    let counter = 1;
    const maxAttempts = 100;
    
    while (counter < maxAttempts) {
      userCode = initials + counter;
      existing = await this.findByUserCode(userCode);
      
      if (!existing) {
        return userCode;
      }
      
      counter++;
    }
    
    // Fallback: use timestamp-based code (should rarely happen)
    return initials + Date.now().toString().slice(-4);
  }

  // Team Leader Methods
  static async assignAgentToTeamLeader(teamLeaderId, agentId, assignedBy = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if agent exists
      const agentCheck = await client.query(
        `SELECT is_assigned, assigned_to FROM users WHERE id = $1 AND role = 'agent'`,
        [agentId]
      );
      
      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found');
      }
      
      // If agent is already assigned to a different team leader, throw error
      if (agentCheck.rows[0].is_assigned && agentCheck.rows[0].assigned_to !== teamLeaderId) {
        throw new Error('Agent is already assigned to a different team leader. Please remove them from the current team first.');
      }
      
      // If agent is already assigned to this team leader, just ensure it's active
      if (agentCheck.rows[0].assigned_to === teamLeaderId) {
        // Reactivate if it exists, or create if it doesn't
        const result = await client.query(
          `INSERT INTO team_agents (team_leader_id, agent_id, assigned_by, is_active)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (team_leader_id, agent_id) 
           DO UPDATE SET is_active = TRUE, updated_at = NOW()
           RETURNING *`,
          [teamLeaderId, agentId, assignedBy]
        );
        await client.query('COMMIT');
        return result.rows[0];
      }
      
      // Update agent's assignment status
      await client.query(
        `UPDATE users SET is_assigned = TRUE, assigned_to = $1, updated_at = NOW() WHERE id = $2`,
        [teamLeaderId, agentId]
      );
      
      // Insert into team_agents table (will be unique due to constraint)
      const result = await client.query(
        `INSERT INTO team_agents (team_leader_id, agent_id, assigned_by, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (team_leader_id, agent_id) 
         DO UPDATE SET is_active = TRUE, updated_at = NOW()
         RETURNING *`,
        [teamLeaderId, agentId, assignedBy]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      // Check if it's a unique constraint violation from the partial index
      if (error.code === '23505' && error.constraint === 'idx_team_agents_single_active_assignment') {
        throw new Error('Agent is already assigned to another team leader. Please remove them from the current team first.');
      }
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
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.user_code, u.address, ta.assigned_at
       FROM users u
       INNER JOIN team_agents ta ON u.id = ta.agent_id
       WHERE ta.team_leader_id = $1 AND ta.is_active = TRUE
       ORDER BY ta.assigned_at DESC`,
      [teamLeaderId]
    );
    return result.rows;
  }

  static async getAgentTeamLeader(agentId) {
    // Use users.assigned_to as the source of truth for consistency
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.user_code, u.address, ta.assigned_at
       FROM users u
       INNER JOIN users agent ON agent.id = $1 AND agent.role = 'agent'
       LEFT JOIN team_agents ta ON ta.team_leader_id = u.id AND ta.agent_id = $1 AND ta.is_active = TRUE
       WHERE u.id = agent.assigned_to
       LIMIT 1`,
      [agentId]
    );
    return result.rows[0];
  }

  static async getTeamLeaders() {
    const result = await pool.query(
      `SELECT id, name, email, role, phone, user_code, address, created_at, updated_at 
       FROM users 
       WHERE role = 'team_leader' 
       ORDER BY name`
    );
    return result.rows;
  }

  static async getAvailableAgentsForTeamLeader(teamLeaderId = null) {
    let query, params;
    
    if (teamLeaderId) {
      // Get agents that are either:
      // 1. Not assigned to anyone (is_assigned = FALSE)
      // 2. Already assigned to THIS team leader (assigned_to = teamLeaderId)
      // This excludes agents assigned to OTHER team leaders
      query = `
        SELECT u.id, u.name, u.email, u.role, u.phone, u.user_code, u.is_assigned, u.assigned_to, u.address
        FROM users u
        WHERE u.role = 'agent' 
          AND (u.is_assigned = FALSE OR u.assigned_to = $1)
        ORDER BY u.name
      `;
      params = [teamLeaderId];
    } else {
      // Get all agents with assignment status
      query = `
        SELECT u.id, u.name, u.email, u.role, u.phone, u.user_code, u.is_assigned, u.assigned_to, u.address
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
