// Unit tests for single team assignment constraint
const pool = require('../../config/db');
const User = require('../../models/userModel');

describe('Single Team Assignment Constraint', () => {
  let testTeamLeader1, testTeamLeader2, testAgent;
  
  beforeAll(async () => {
    // Create test team leaders
    const tl1Result = await pool.query(
      `INSERT INTO users (name, email, password, role, user_code, is_active)
       VALUES ('Test Team Leader 1', 'tl1@test.com', 'hashed', 'team_leader', 'TL1', true)
       RETURNING id, name, user_code`
    );
    testTeamLeader1 = tl1Result.rows[0];
    
    const tl2Result = await pool.query(
      `INSERT INTO users (name, email, password, role, user_code, is_active)
       VALUES ('Test Team Leader 2', 'tl2@test.com', 'hashed', 'team_leader', 'TL2', true)
       RETURNING id, name, user_code`
    );
    testTeamLeader2 = tl2Result.rows[0];
    
    // Create test agent
    const agentResult = await pool.query(
      `INSERT INTO users (name, email, password, role, user_code, is_active, is_assigned, assigned_to)
       VALUES ('Test Agent', 'agent@test.com', 'hashed', 'agent', 'TA1', true, false, null)
       RETURNING id, name, user_code`
    );
    testAgent = agentResult.rows[0];
  });
  
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM team_agents WHERE agent_id = $1 OR team_leader_id IN ($2, $3)',
      [testAgent.id, testTeamLeader1.id, testTeamLeader2.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)',
      [testAgent.id, testTeamLeader1.id, testTeamLeader2.id]);
    await pool.end();
  });
  
  describe('assignAgentToTeamLeader', () => {
    it('should assign agent to first team leader successfully', async () => {
      const result = await User.assignAgentToTeamLeader(testTeamLeader1.id, testAgent.id);
      expect(result).toBeDefined();
      expect(result.team_leader_id).toBe(testTeamLeader1.id);
      expect(result.agent_id).toBe(testAgent.id);
      expect(result.is_active).toBe(true);
      
      // Verify users table is updated
      const agentCheck = await pool.query(
        'SELECT is_assigned, assigned_to FROM users WHERE id = $1',
        [testAgent.id]
      );
      expect(agentCheck.rows[0].is_assigned).toBe(true);
      expect(agentCheck.rows[0].assigned_to).toBe(testTeamLeader1.id);
    });
    
    it('should prevent assigning agent to second team leader while already assigned', async () => {
      // Try to assign to second team leader
      await expect(
        User.assignAgentToTeamLeader(testTeamLeader2.id, testAgent.id)
      ).rejects.toThrow();
      
      // Verify agent is still assigned to first team leader
      const agentCheck = await pool.query(
        'SELECT assigned_to FROM users WHERE id = $1',
        [testAgent.id]
      );
      expect(agentCheck.rows[0].assigned_to).toBe(testTeamLeader1.id);
      
      // Verify only one active assignment exists
      const activeAssignments = await pool.query(
        'SELECT COUNT(*) as count FROM team_agents WHERE agent_id = $1 AND is_active = TRUE',
        [testAgent.id]
      );
      expect(parseInt(activeAssignments.rows[0].count)).toBe(1);
    });
    
    it('should allow reassigning agent to different team leader after removing from first', async () => {
      // Remove from first team leader
      await User.removeAgentFromTeamLeader(testTeamLeader1.id, testAgent.id);
      
      // Now assign to second team leader
      const result = await User.assignAgentToTeamLeader(testTeamLeader2.id, testAgent.id);
      expect(result).toBeDefined();
      expect(result.team_leader_id).toBe(testTeamLeader2.id);
      
      // Verify users table is updated
      const agentCheck = await pool.query(
        'SELECT assigned_to FROM users WHERE id = $1',
        [testAgent.id]
      );
      expect(agentCheck.rows[0].assigned_to).toBe(testTeamLeader2.id);
    });
  });
  
  describe('getAgentTeamLeader', () => {
    it('should return the correct team leader based on users.assigned_to', async () => {
      const teamLeader = await User.getAgentTeamLeader(testAgent.id);
      expect(teamLeader).toBeDefined();
      expect(teamLeader.id).toBe(testTeamLeader2.id);
      expect(teamLeader.name).toBe(testTeamLeader2.name);
    });
  });
  
  describe('Database constraint', () => {
    it('should prevent creating multiple active assignments via direct SQL', async () => {
      // Try to insert a second active assignment directly
      await expect(
        pool.query(
          `INSERT INTO team_agents (team_leader_id, agent_id, is_active)
           VALUES ($1, $2, TRUE)`,
          [testTeamLeader1.id, testAgent.id]
        )
      ).rejects.toThrow();
    });
  });
});

