// test-server.js - Simple test server without database
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

// Password reset test route
app.post('/api/password-reset/request', (req, res) => {
  console.log('Password reset request received:', req.body);
  res.json({ 
    success: true, 
    message: 'If an account with this email exists, a password reset code will be sent.',
    email: req.body.email 
  });
});

app.listen(PORT, () => {
  console.log(`Test server is running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
});
