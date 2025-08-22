// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 10000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Serve static files from the public directory
app.use('/assets', express.static('public/assets'));

app.use('/api', indexRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  console.error('📊 Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  res.status(500).json({ 
    message: 'Internal server error',
    error: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
