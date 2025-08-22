// controllers/userController.js
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const jwtUtil = require('../utils/jwt');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, location, phone, dob } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Generate unique user code
    const userCode = await userModel.generateUniqueUserCode();

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
      user_code: userCode,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

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
        user_code: user.user_code
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, location, phone, dob, user_code } = req.body;

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

    // Update user
    const updatedUser = await userModel.updateUser(id, {
      name,
      email,
      role,
      location,
      phone,
      dob,
      user_code
    });

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

const getAgents = async (req, res) => {
  try {
    const agents = await userModel.getUsersByRole('agent');
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
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  checkUserExists,
  getAllUsers,
  updateUser,
  getAgents
};
