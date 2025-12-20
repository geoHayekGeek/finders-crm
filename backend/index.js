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

// CORS MUST be first - before any other middleware that might interfere
// CORS configuration - allow all origins (you can restrict this later for security)
app.use(cors({
  origin: true, // Allow all origins - change to specific origins in production
  credentials: true,
  exposedHeaders: ['X-CSRF-Token'], // Expose CSRF token header to frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Apply security headers to all routes (after CORS)
app.use(securityHeaders);

// Apply error logging middleware
app.use(errorLoggingMiddleware);
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

// Health check endpoints for Railway and monitoring
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

app.use('/api', indexRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

// Listen on all interfaces (0.0.0.0) for Railway deployment
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start the reminder scheduler
  try {
    reminderScheduler.start();
    console.log('📅 Reminder scheduler started successfully');
  } catch (error) {
    console.error('❌ Failed to start reminder scheduler:', error);
  }
});
