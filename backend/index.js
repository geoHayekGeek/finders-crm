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
const HOST = process.env.HOST || '0.0.0.0';

// Log port configuration for debugging
console.log('🔧 Server Configuration:');
console.log(`  - PORT from env: ${process.env.PORT || 'NOT SET (using default 10000)'}`);
console.log(`  - Final PORT: ${PORT}`);
console.log(`  - HOST: ${HOST}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

app.set('trust proxy', 1);

// CORS MUST be first - before any other middleware that might interfere
// CORS configuration - explicitly allow frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://vibrant-energy-production-5483.up.railway.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow if origin is in the allowed list
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // Log for debugging
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(null, true); // Temporarily allow all for debugging
    }
  },
  credentials: true,
  exposedHeaders: ['X-CSRF-Token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Apply security headers to all routes (after CORS)
app.use(securityHeaders);

// Apply error logging middleware
app.use(errorLoggingMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add request logging middleware (BEFORE static files to catch all requests)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'} - ${new Date().toISOString()}`);
  next();
});

// Serve static files from the public directory
app.use('/assets', express.static('public/assets'));
app.use('/images', express.static('public/images'));
app.use('/uploads', express.static('public/uploads'));

// Health check endpoints for Railway and monitoring
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is healthy',
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString()
  });
});

// Explicitly handle OPTIONS requests for all routes
app.options('*', (req, res) => {
  console.log(`🔍 OPTIONS preflight: ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  res.status(204).end();
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
app.listen(PORT, HOST, () => {
  console.log('✅ Server started successfully!');
  console.log(`🌐 Server is running on ${HOST}:${PORT}`);
  console.log(`📡 Accessible at: http://${HOST}:${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected (DATABASE_URL set)' : 'Using individual DB config'}`);
  
  // Start the reminder scheduler
  try {
    reminderScheduler.start();
    console.log('📅 Reminder scheduler started successfully');
  } catch (error) {
    console.error('❌ Failed to start reminder scheduler:', error);
  }
});

// Handle server errors
app.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
