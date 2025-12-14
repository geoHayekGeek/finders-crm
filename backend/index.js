// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const indexRoutes = require('./routes/index');
const securityHeaders = require('./middlewares/securityHeaders');
const { errorLoggingMiddleware, errorHandler } = require('./middlewares/errorLogging');
const reminderScheduler = require('./scheduler/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 10000;

app.set('trust proxy', 1);

// Apply security headers to all routes
app.use(securityHeaders);

// Apply error logging middleware
app.use(errorLoggingMiddleware);

app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  exposedHeaders: ['X-CSRF-Token'] // Expose CSRF token header to frontend
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Serve static files from the public directory
app.use('/assets', express.static('public/assets'));
app.use('/images', express.static('public/images'));
app.use('/uploads', express.static('public/uploads'));

// Health check endpoint for Playwright and monitoring
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.use('/api', indexRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start the reminder scheduler
  try {
    reminderScheduler.start();
    console.log('📅 Reminder scheduler started successfully');
  } catch (error) {
    console.error('❌ Failed to start reminder scheduler:', error);
  }
});
