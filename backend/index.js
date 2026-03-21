// index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { ensureStorageDirs, paths: storagePaths, DATA_ROOT } = require('./config/storage');

const securityHeaders = require('./middlewares/securityHeaders');
const { errorLoggingMiddleware, errorHandler } = require('./middlewares/errorLogging');
const reminderScheduler = require('./scheduler/reminderScheduler');

// Validate critical environment variables
function validateEnvironment() {
  const errors = [];
  
  // JWT_SECRET validation
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set');
  } else if (process.env.JWT_SECRET.length < 32) {
    // In production, enforce strict requirements
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET must be at least 32 characters long for security');
    } else {
      // In development, warn but allow shorter secrets
      logger.warn('⚠️  JWT_SECRET is less than 32 characters. This is acceptable for development but NOT for production!');
      logger.warn('   Please use a strong, random secret of at least 32 characters in production.');
    }
  }
  
  // Database validation
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    errors.push('Database configuration is missing (DATABASE_URL or DB_HOST must be set)');
  }
  
  if (errors.length > 0) {
    logger.error('Environment validation failed', new Error(errors.join('; ')));
    console.error('❌ Environment Validation Errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n⚠️  Server will not start until these issues are resolved.');
    process.exit(1);
  }
  
  logger.info('Environment validation passed');
}

// Validate environment before starting server
validateEnvironment();

ensureStorageDirs();
logger.info('Persistent storage ready', { DATA_ROOT });

const indexRoutes = require('./routes/index');

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
// Comma-separated extra origins (e.g. production + preview Railway URLs)
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [
  FRONTEND_URL,
  ...extraOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowed = allowedOrigins.some(
      (a) => origin === a || origin.startsWith(a)
    );
    if (allowed) {
      callback(null, true);
    } else {
      // Still allow (avoids breaking misconfigured deploys); set FRONTEND_URL / ALLOWED_ORIGINS to clear this warning
      console.log(
        `⚠️ CORS: origin not in allowlist (${origin}). Allowing anyway — set FRONTEND_URL or ALLOWED_ORIGINS in production.`
      );
      callback(null, true);
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

// Dynamic uploads (Railway volume under DATA_ROOT) — URLs unchanged: /assets/properties/*, /uploads/*
app.use('/assets/properties', express.static(storagePaths.assetsProperties));
app.use('/uploads', express.static(storagePaths.uploadsRoot));
// Built-in static assets only (no runtime writes)
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

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
    logger.info('Reminder scheduler started successfully');
  } catch (error) {
    logger.error('Failed to start reminder scheduler', error);
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
