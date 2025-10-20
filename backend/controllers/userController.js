// controllers/userController.js
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const jwtUtil = require('../utils/jwt');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, location, phone, dob, work_location } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    // Generate unique user code from name initials
    const userCode = await userModel.generateUniqueUserCode(name);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await userModel.createUser({
      name,
      email,
      password: hashedPassword,
      role,
      location,
      phone,
      dob,
      work_location,
      user_code: userCode,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        work_location: newUser.work_location,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check if user account is active
    if (user.is_active === false) {
      return res.status(403).json({ 
        message: 'Your account has been disabled. Please contact an administrator.' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Generate token
    const token = jwtUtil.generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkUserExists = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Request body is missing' 
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if user exists in database
    try {
      const user = await userModel.findByEmail(email);
      res.json({
        success: true,
        exists: !!user,
        message: user ? 'User found' : 'User not found'
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message);
      // When database is not available, return an error instead of a mock response
      res.status(503).json({
        success: false,
        exists: false,
        message: 'Database service unavailable. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Error checking user existence:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    console.log('📊 Fetched users from database:', users.length);
    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        dob: user.dob,
        work_location: user.work_location,
        user_code: user.user_code,
        is_assigned: user.is_assigned || false,
        assigned_to: user.assigned_to || null,
        agent_count: user.agent_count || null,
        is_active: user.is_active !== false, // Default to true if null
        created_at: user.created_at,
        updated_at: user.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, location, phone, dob, work_location, user_code, is_active, password } = req.body;

    // Check if user exists
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If updating user_code, check if it's already taken by another user
    if (user_code && user_code !== existingUser.user_code) {
      const userWithCode = await userModel.findByUserCode(user_code);
      if (userWithCode && userWithCode.id !== parseInt(id)) {
        return res.status(409).json({ message: 'User code already taken' });
      }
    }

    // Prepare update data
    const updateData = {
      name,
      email,
      role,
      location,
      phone,
      dob,
      work_location,
      user_code,
      is_active
    };

    // If password is provided, hash it and include in update
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const updatedUser = await userModel.updateUser(id, updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting user:', id);

    // Check if user exists
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of admins (optional safety check)
    if (existingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete the user
    const deletedUser = await userModel.deleteUser(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User deleted successfully:', deletedUser.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      user: {
        id: deletedUser.id,
        name: deletedUser.name,
        email: deletedUser.email
      }
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

const getAgents = async (req, res) => {
  try {
    // Get both agents and team leaders for property assignment
    const [agents, teamLeaders] = await Promise.all([
      userModel.getUsersByRole('agent'),
      userModel.getUsersByRole('team_leader')
    ]);
    
    const allUsers = [...agents, ...teamLeaders];
    
    res.json({
      success: true,
      agents: allUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        user_code: user.user_code
      }))
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { teamLeaderId, forAssignment } = req.query; // Optional: to get available agents for a specific team leader
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role parameter is required'
      });
    }
    
    // If requesting agents for team leader assignment (either editing existing or creating new)
    if (role === 'agent' && forAssignment === 'true') {
      // If teamLeaderId provided: show unassigned agents + agents already assigned to THIS team leader
      // If no teamLeaderId (new team leader): show only unassigned agents
      const agents = await userModel.getAvailableAgentsForTeamLeader(teamLeaderId || null);
      
      return res.json({
        success: true,
        data: agents.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          phone: user.phone,
          user_code: user.user_code,
          is_assigned: user.is_assigned || false,
          assigned_to: user.assigned_to || null,
          created_at: user.created_at,
          updated_at: user.updated_at
        }))
      });
    }
    
    // Default: get all users by role
    const users = await userModel.getUsersByRole(role);
    
    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        user_code: user.user_code,
        is_assigned: user.is_assigned || false,
        created_at: user.created_at,
        updated_at: user.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by role'
    });
  }
};

// Team Leader Operations
const getTeamLeaders = async (req, res) => {
  try {
    const teamLeaders = await userModel.getTeamLeaders();
    res.json({
      success: true,
      teamLeaders: teamLeaders.map(teamLeader => ({
        id: teamLeader.id,
        name: teamLeader.name,
        email: teamLeader.email,
        role: teamLeader.role,
        location: teamLeader.location,
        phone: teamLeader.phone,
        user_code: teamLeader.user_code,
        created_at: teamLeader.created_at,
        updated_at: teamLeader.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching team leaders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team leaders'
    });
  }
};

const getTeamLeaderAgents = async (req, res) => {
  try {
    const { teamLeaderId } = req.params;
    
    if (!teamLeaderId) {
      return res.status(400).json({
        success: false,
        message: 'Team leader ID is required'
      });
    }

    const agents = await userModel.getTeamLeaderAgents(teamLeaderId);
    res.json({
      success: true,
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        location: agent.location,
        phone: agent.phone,
        user_code: agent.user_code,
        assigned_at: agent.assigned_at
      }))
    });
  } catch (error) {
    console.error('Error fetching team leader agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team leader agents'
    });
  }
};

const getAgentTeamLeader = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
    }

    const teamLeader = await userModel.getAgentTeamLeader(agentId);
    
    if (!teamLeader) {
      return res.json({
        success: true,
        teamLeader: null,
        message: 'Agent is not assigned to any team leader'
      });
    }

    res.json({
      success: true,
      teamLeader: {
        id: teamLeader.id,
        name: teamLeader.name,
        email: teamLeader.email,
        role: teamLeader.role,
        location: teamLeader.location,
        phone: teamLeader.phone,
        user_code: teamLeader.user_code,
        assigned_at: teamLeader.assigned_at
      }
    });
  } catch (error) {
    console.error('Error fetching agent team leader:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent team leader'
    });
  }
};

const getAvailableAgents = async (req, res) => {
  try {
    const { teamLeaderId } = req.query;
    
    const agents = await userModel.getAvailableAgentsForTeamLeader(teamLeaderId);
    res.json({
      success: true,
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        location: agent.location,
        phone: agent.phone,
        user_code: agent.user_code
      }))
    });
  } catch (error) {
    console.error('Error fetching available agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available agents'
    });
  }
};

const assignAgentToTeamLeader = async (req, res) => {
  try {
    const { teamLeaderId, agentId } = req.body;
    const assignedBy = req.user?.id; // From JWT token
    
    if (!teamLeaderId || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'Team leader ID and agent ID are required'
      });
    }

    // Verify team leader exists and has correct role
    const teamLeader = await userModel.findById(teamLeaderId);
    if (!teamLeader || teamLeader.role !== 'team_leader') {
      return res.status(400).json({
        success: false,
        message: 'Invalid team leader'
      });
    }

    // Verify agent exists and has correct role
    const agent = await userModel.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent'
      });
    }

    const assignment = await userModel.assignAgentToTeamLeader(teamLeaderId, agentId, assignedBy);
    
    res.json({
      success: true,
      message: 'Agent assigned to team leader successfully',
      assignment: {
        id: assignment.id,
        team_leader_id: assignment.team_leader_id,
        agent_id: assignment.agent_id,
        assigned_at: assignment.assigned_at,
        is_active: assignment.is_active
      }
    });
  } catch (error) {
    console.error('Error assigning agent to team leader:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign agent to team leader'
    });
  }
};

const removeAgentFromTeamLeader = async (req, res) => {
  try {
    const { teamLeaderId, agentId } = req.params;
    
    if (!teamLeaderId || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'Team leader ID and agent ID are required'
      });
    }

    const result = await userModel.removeAgentFromTeamLeader(teamLeaderId, agentId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent removed from team leader successfully'
    });
  } catch (error) {
    console.error('Error removing agent from team leader:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove agent from team leader'
    });
  }
};

const transferAgent = async (req, res) => {
  try {
    const { currentTeamLeaderId, agentId, newTeamLeaderId } = req.body;
    const assignedBy = req.user?.id; // From JWT token
    
    if (!currentTeamLeaderId || !agentId || !newTeamLeaderId) {
      return res.status(400).json({
        success: false,
        message: 'Current team leader ID, agent ID, and new team leader ID are required'
      });
    }

    // Verify new team leader exists and has correct role
    const newTeamLeader = await userModel.findById(newTeamLeaderId);
    if (!newTeamLeader || newTeamLeader.role !== 'team_leader') {
      return res.status(400).json({
        success: false,
        message: 'Invalid new team leader'
      });
    }

    // Verify agent exists and has correct role
    const agent = await userModel.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent'
      });
    }

    const assignment = await userModel.updateTeamLeaderAgentAssignment(
      currentTeamLeaderId, 
      agentId, 
      newTeamLeaderId, 
      assignedBy
    );
    
    res.json({
      success: true,
      message: 'Agent transferred successfully',
      assignment: {
        id: assignment.id,
        team_leader_id: assignment.team_leader_id,
        agent_id: assignment.agent_id,
        assigned_at: assignment.assigned_at,
        is_active: assignment.is_active
      }
    });
  } catch (error) {
    console.error('Error transferring agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer agent'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  checkUserExists,
  getAllUsers,
  updateUser,
  deleteUser,
  getAgents,
  getUsersByRole,
  getTeamLeaders,
  getTeamLeaderAgents,
  getAgentTeamLeader,
  getAvailableAgents,
  assignAgentToTeamLeader,
  removeAgentFromTeamLeader,
  transferAgent
};
