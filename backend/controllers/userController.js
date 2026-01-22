// controllers/userController.js
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const jwtUtil = require('../utils/jwt');
const logger = require('../utils/logger');
const { sanitizeInput, sanitizeObject } = require('../utils/sanitize');

// Normalize role to handle both 'operations_manager' and 'operations manager' formats
// Converts to space format for consistent comparisons
const normalizeRole = (role) =>
  role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';

const registerUser = async (req, res) => {
  try {
    // Check if user is authenticated (for creating new users, only admin and HR can do this)
    if (!req.user || !req.user.role) {
      logger.security('User registration attempt without authentication', {
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const currentUserRole = req.user.role;
    const normalizedRole = normalizeRole(currentUserRole);
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    
    // Only admin, HR, and operations manager can create users
    if (normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      logger.security('User registration access denied', {
        userId: req.user.id,
        role: req.user.role,
        normalizedRole,
        url: req.url,
        method: req.method,
        ip: clientIP
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only admin, HR, and operations manager can create users.' 
      });
    }

    // Sanitize input to prevent XSS and SQL injection
    const { name, email, password, role, phone, dob, work_location, address } = sanitizeObject(req.body);

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      logger.security('User registration attempt with existing email', {
        email,
        attemptedBy: req.user.id,
        ip: clientIP
      });
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    // Generate unique user code from name initials
    const userCode = await userModel.generateUniqueUserCode(name);

    // Hash password with explicit rounds (10-12 recommended, using 12 for better security)
    const SALT_ROUNDS = 12;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Get the current user's ID (the user creating this account)
    const addedBy = req.user.id;

    // Create user
    const newUser = await userModel.createUser({
      name: sanitizeInput(name),
      email: sanitizeInput(email).toLowerCase(),
      password: hashedPassword,
      role: sanitizeInput(role),
      phone: phone ? sanitizeInput(phone) : null,
      dob: dob || null,
      work_location: work_location ? sanitizeInput(work_location) : null,
      user_code: userCode,
      address: address ? sanitizeInput(address) : null,
      added_by: addedBy,
    });

    // Audit log: User created
    logger.security('User created', {
      createdUserId: newUser.id,
      createdUserEmail: newUser.email,
      createdUserRole: newUser.role,
      createdBy: req.user.id,
      createdByName: req.user.name,
      ip: clientIP
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
    logger.error('User registration error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const startTime = Date.now();
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    // Always perform both user lookup and password check to prevent timing attacks
    // Use a consistent delay to prevent user enumeration
    const user = await userModel.findByEmail(email);
    let isMatch = false;
    
    if (user) {
      // Check if account is locked
      if (user.lockout_until) {
        const lockoutUntil = new Date(user.lockout_until);
        const now = new Date();
        
        if (lockoutUntil > now) {
          const remainingMinutes = Math.ceil((lockoutUntil - now) / (60 * 1000));
          logger.security('Login attempt on locked account', {
            email,
            ip: clientIP,
            lockoutUntil: lockoutUntil.toISOString(),
            remainingMinutes
          });
          
          // Add artificial delay to prevent timing attacks
          const elapsed = Date.now() - startTime;
          const minDelay = 100; // Minimum 100ms delay
          if (elapsed < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
          }
          
          return res.status(423).json({ 
            message: `Account temporarily locked. Please try again in ${remainingMinutes} minute(s).` 
          });
        } else {
          // Lockout expired, reset attempts
          await userModel.resetLoginAttempts(user.id);
        }
      }

      // Check if user account is active
      if (user.is_active === false) {
        logger.security('Login attempt on inactive account', { email, ip: clientIP });
        
        // Add artificial delay
        const elapsed = Date.now() - startTime;
        const minDelay = 100;
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        return res.status(403).json({ 
          message: 'Your account has been disabled. Please contact an administrator.' 
        });
      }

      // Check password
      isMatch = await bcrypt.compare(password, user.password);
    }

    // Add artificial delay to prevent timing attacks and user enumeration
    // Always take at least 100ms regardless of whether user exists or password matches
    const elapsed = Date.now() - startTime;
    const minDelay = 100;
    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
    }

    // Use generic error message for both "user not found" and "wrong password"
    // This prevents user enumeration
    if (!user || !isMatch) {
      if (user) {
        // Increment failed login attempts
        const failedAttempts = await userModel.incrementFailedLoginAttempts(user.id);
        
        logger.security('Failed login attempt', {
          email,
          ip: clientIP,
          failedAttempts,
          userId: user.id
        });

        // Lock account if max attempts reached
        if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
          await userModel.lockAccount(user.id, LOCKOUT_DURATION_MS);
          logger.security('Account locked due to failed login attempts', {
            email,
            ip: clientIP,
            userId: user.id,
            failedAttempts
          });
        }
      } else {
        // Log failed attempt even if user doesn't exist (for security monitoring)
        logger.security('Failed login attempt - user not found', {
          email,
          ip: clientIP
        });
      }
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful login - reset failed attempts
    await userModel.resetLoginAttempts(user.id);

    // Generate token
    const token = jwtUtil.generateToken(user);

    logger.security('Successful login', {
      email,
      ip: clientIP,
      userId: user.id,
      role: user.role
    });

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
    logger.error('Login error', err);
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
      logger.error('Database error checking user existence', dbError);
      // When database is not available, return an error instead of a mock response
      res.status(503).json({
        success: false,
        exists: false,
        message: 'Database service unavailable. Please try again later.'
      });
    }

  } catch (error) {
    logger.error('Error checking user existence', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.security('getAllUsers called without authentication', {
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;
    const normalizedRole = normalizeRole(currentUserRole);

    // Get all users from database
    const allUsers = await userModel.getAllUsers();
    logger.debug('Fetched users from database', { count: allUsers.length });

    // Filter users based on role
    // Only admin, HR, and operations manager can see all users (aligned with permissions middleware)
    let filteredUsers = allUsers;
    const canViewAllUsers = ['admin', 'hr', 'operations manager'].includes(normalizedRole);
    
    if (!canViewAllUsers) {
      // Other users can only see themselves
      filteredUsers = allUsers.filter(user => user.id === currentUserId);
    }

    res.json({
      success: true,
      users: filteredUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        dob: user.dob,
        work_location: user.work_location,
        user_code: user.user_code,
        address: user.address,
        is_assigned: user.is_assigned || false,
        assigned_to: user.assigned_to || null,
        agent_count: user.agent_count || null,
        properties_count: user.properties_count || 0,
        leads_count: user.leads_count || 0,
        team_leader_code: user.team_leader_code || null,
        team_leader_name: user.team_leader_name || null,
        is_active: user.is_active !== false, // Default to true if null
        added_by: user.added_by || null,
        added_by_name: user.added_by_name || null,
        added_by_code: user.added_by_code || null,
        created_at: user.created_at,
        updated_at: user.updated_at
      }))
    });
  } catch (error) {
    logger.error('Error fetching users', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.security('updateUser called without authentication', {
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    const { id } = req.params;
    // Sanitize input to prevent XSS and SQL injection
    const { name, email, role, phone, dob, work_location, user_code, is_active, password, address } = sanitizeObject(req.body);
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    // Check if user exists
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Permission check: Only admin, HR, and operations manager can update other users
    // Users can only update themselves (read-only fields only)
    if (parseInt(id) !== currentUserId) {
      const normalizedRole = normalizeRole(currentUserRole);
      if (normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
        logger.security('User update access denied', {
          userId: req.user.id,
          role: req.user.role,
          targetUserId: id,
          ip: clientIP
        });
        return res.status(403).json({ 
          success: false,
          message: 'Access denied. Only admin, HR, and operations manager can update other users.' 
        });
      }
    } else {
      // Users updating themselves can only update certain fields (not role, is_active, etc.)
      // For now, we'll allow self-updates but restrict sensitive fields
      if (role && role !== existingUser.role) {
        return res.status(403).json({ 
          success: false,
          message: 'You cannot change your own role.' 
        });
      }
      if (is_active !== undefined && is_active !== existingUser.is_active) {
        return res.status(403).json({ 
          success: false,
          message: 'You cannot change your own account status.' 
        });
      }
    }

    // Check email uniqueness if email is being changed
    if (email && email !== existingUser.email) {
      const emailUser = await userModel.findByEmail(email);
      if (emailUser && emailUser.id !== parseInt(id)) {
        logger.security('User update attempt with existing email', {
          email,
          attemptedBy: req.user.id,
          targetUserId: id,
          ip: clientIP
        });
        return res.status(409).json({ 
          success: false,
          message: 'Email already in use' 
        });
      }
    }

    // If updating user_code, check if it's already taken by another user
    if (user_code && user_code !== existingUser.user_code) {
      const userWithCode = await userModel.findByUserCode(user_code);
      if (userWithCode && userWithCode.id !== parseInt(id)) {
        return res.status(409).json({ 
          success: false,
          message: 'User code already taken' 
        });
      }
    }

    // Track what changed for audit logging
    const changes = {};
    if (name && name !== existingUser.name) changes.name = { from: existingUser.name, to: name };
    if (email && email !== existingUser.email) changes.email = { from: existingUser.email, to: email };
    if (role && role !== existingUser.role) changes.role = { from: existingUser.role, to: role };
    if (is_active !== undefined && is_active !== existingUser.is_active) changes.is_active = { from: existingUser.is_active, to: is_active };
    if (password && password.trim() !== '') changes.password = { changed: true };

    // Prepare update data with sanitization
    const updateData = {
      name: name ? sanitizeInput(name) : undefined,
      email: email ? sanitizeInput(email).toLowerCase() : undefined,
      role: role ? sanitizeInput(role) : undefined,
      phone: phone ? sanitizeInput(phone) : null,
      dob: dob || null,
      work_location: work_location ? sanitizeInput(work_location) : null,
      user_code: user_code || undefined,
      is_active: is_active !== undefined ? is_active : undefined,
      address: address ? sanitizeInput(address) : null
    };

    // If password is provided, hash it and include in update
    if (password && password.trim() !== '') {
      const SALT_ROUNDS = 12;
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updateData.password = hashedPassword;
    }

    // Update user
    const updatedUser = await userModel.updateUser(id, updateData);

    // Audit log: User updated
    logger.security('User updated', {
      updatedUserId: id,
      updatedUserEmail: existingUser.email,
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      changes: Object.keys(changes).length > 0 ? changes : null,
      ip: clientIP
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.security('deleteUser called without authentication', {
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { id } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    // Check if user exists
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Permission check: Only admin, HR, and operations manager can delete users
    const normalizedRole = normalizeRole(currentUserRole);
    if (normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      logger.security('User deletion access denied', {
        userId: req.user.id,
        role: req.user.role,
        targetUserId: id,
        targetUserEmail: existingUser.email,
        ip: clientIP
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin, HR, and operations manager can delete users.'
      });
    }

    // Prevent users from deleting themselves
    if (parseInt(id) === currentUserId) {
      logger.security('User deletion attempt on own account', {
        userId: req.user.id,
        ip: clientIP
      });
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Prevent deletion of admins (optional safety check)
    if (normalizeRole(existingUser.role) === 'admin') {
      logger.security('User deletion attempt on admin account', {
        userId: req.user.id,
        targetUserId: id,
        targetUserEmail: existingUser.email,
        ip: clientIP
      });
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

    // Audit log: User deleted
    logger.security('User deleted', {
      deletedUserId: deletedUser.id,
      deletedUserEmail: deletedUser.email,
      deletedUserRole: deletedUser.role,
      deletedUserName: deletedUser.name,
      deletedBy: req.user.id,
      deletedByName: req.user.name,
      ip: clientIP
    });

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
    logger.error('Error deleting user', error);
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
        phone: user.phone,
        user_code: user.user_code,
        address: user.address
      }))
    });
  } catch (error) {
    logger.error('Error fetching agents', error);
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
          phone: user.phone,
          user_code: user.user_code,
          address: user.address,
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
          phone: user.phone,
          user_code: user.user_code,
          address: user.address,
          is_assigned: user.is_assigned || false,
          created_at: user.created_at,
          updated_at: user.updated_at
      }))
    });
  } catch (error) {
    logger.error('Error fetching users by role', error);
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
        phone: teamLeader.phone,
        user_code: teamLeader.user_code,
        created_at: teamLeader.created_at,
        updated_at: teamLeader.updated_at
      }))
    });
  } catch (error) {
    logger.error('Error fetching team leaders', error);
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
        phone: agent.phone,
        user_code: agent.user_code,
        address: agent.address,
        assigned_at: agent.assigned_at
      }))
    });
  } catch (error) {
    logger.error('Error fetching team leader agents', error);
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
        phone: teamLeader.phone,
        user_code: teamLeader.user_code,
        address: teamLeader.address,
        assigned_at: teamLeader.assigned_at
      }
    });
  } catch (error) {
    logger.error('Error fetching agent team leader', error);
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
        phone: agent.phone,
        user_code: agent.user_code,
        address: agent.address
      }))
    });
  } catch (error) {
    logger.error('Error fetching available agents', error);
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
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    
    if (!teamLeaderId || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'Team leader ID and agent ID are required'
      });
    }

    // Verify team leader exists and has correct role
    const teamLeader = await userModel.findById(teamLeaderId);
    if (!teamLeader || normalizeRole(teamLeader.role) !== 'team leader') {
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
    
    // Audit log: Agent assignment
    logger.security('Agent assigned to team leader', {
      teamLeaderId,
      agentId,
      assignedBy: req.user?.id,
      assignedByName: req.user?.name,
      ip: clientIP
    });
    
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
    logger.error('Error assigning agent to team leader', error);
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
    logger.error('Error removing agent from team leader', error);
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
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    
    if (!currentTeamLeaderId || !agentId || !newTeamLeaderId) {
      return res.status(400).json({
        success: false,
        message: 'Current team leader ID, agent ID, and new team leader ID are required'
      });
    }

    // Verify new team leader exists and has correct role
    const newTeamLeader = await userModel.findById(newTeamLeaderId);
    if (!newTeamLeader || normalizeRole(newTeamLeader.role) !== 'team leader') {
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
    
    // Audit log: Agent transfer
    logger.security('Agent transferred between team leaders', {
      agentId,
      fromTeamLeaderId: currentTeamLeaderId,
      toTeamLeaderId: newTeamLeaderId,
      transferredBy: req.user?.id,
      transferredByName: req.user?.name,
      ip: clientIP
    });
    
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
    logger.error('Error transferring agent', error);
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
