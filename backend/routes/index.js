const express = require('express');
const router = express.Router();
const pool = require('../config/db');
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

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`API is running! DB time: ${result.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection error');
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

module.exports = router;
