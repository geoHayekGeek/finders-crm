// index-simple.js - Simple working version
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Simple password reset test route (without database)
app.post('/api/password-reset/request', (req, res) => {
  console.log('Password reset request received:', req.body);
  res.json({ 
    success: true, 
    message: 'If an account with this email exists, a password reset code will be sent.',
    email: req.body.email 
  });
});

// Simple verify route
app.post('/api/password-reset/verify', (req, res) => {
  console.log('Verify request received:', req.body);
  res.json({ 
    success: true, 
    message: 'Reset code verified successfully'
  });
});

// Simple reset route
app.post('/api/password-reset/reset', (req, res) => {
  console.log('Reset request received:', req.body);
  res.json({ 
    success: true, 
    message: 'Password reset successfully'
  });
});

// Simple resend route
app.post('/api/password-reset/resend', (req, res) => {
  console.log('Resend request received:', req.body);
  res.json({ 
    success: true, 
    message: 'New password reset code sent successfully'
  });
});

app.listen(PORT, () => {
  console.log(`Simple server is running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`Password reset endpoint: http://localhost:${PORT}/api/password-reset/request`);
});
