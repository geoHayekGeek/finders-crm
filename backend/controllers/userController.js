// controllers/userController.js
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const jwtUtil = require('../utils/jwt');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, location, phone } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

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

module.exports = {
  registerUser,
  loginUser,
  checkUserExists
};
