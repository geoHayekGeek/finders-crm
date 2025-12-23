const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const userRoutes = require('./userRoutes');
const userDocumentRoutes = require('./userDocumentRoutes');
const passwordResetRoutes = require('./passwordResetRoutes');
const propertyRoutes = require('./propertyRoutes');
const leadsRoutes = require('./leadsRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const calendarRoutes = require('./calendarRoutes');
const categoryRoutes = require('./categoryRoutes');
const statusRoutes = require('./statusRoutes');
const leadStatusRoutes = require('./leadStatusRoutes');
const notificationRoutes = require('./notificationRoutes');
const viewingsRoutes = require('./viewingsRoutes');
const settingsRoutes = require('./settingsRoutes');
const reportsRoutes = require('./reportsRoutes');
const dcsrReportsRoutes = require('./dcsrReportsRoutes');
const operationsCommissionRoutes = require('./operationsCommissionRoutes');
const operationsDailyRoutes = require('./operationsDailyRoutes');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`API is running! DB time: ${result.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection error');
  }
});

// Serve branding files through API (fallback for static file serving)
// This handles /api/uploads/branding/:filename
router.get('/uploads/branding/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    // Security: Only allow files from branding directory
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'branding', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving branding file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file'
    });
  }
});

// Mount route modules
router.use('/users', userRoutes);
router.use('/users', userDocumentRoutes);
router.use('/password-reset', passwordResetRoutes);
router.use('/properties', propertyRoutes);
router.use('/leads', leadsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/calendar', calendarRoutes);
router.use('/categories', categoryRoutes);
router.use('/statuses', statusRoutes);
router.use('/lead-statuses', leadStatusRoutes);
router.use('/notifications', notificationRoutes);
router.use('/viewings', viewingsRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportsRoutes);
router.use('/dcsr-reports', dcsrReportsRoutes);
router.use('/operations-commission', operationsCommissionRoutes);
router.use('/operations-daily', operationsDailyRoutes);

module.exports = router;
