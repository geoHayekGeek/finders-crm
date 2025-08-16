const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const userRoutes = require('./userRoutes');
const passwordResetRoutes = require('./passwordResetRoutes');
const propertyRoutes = require('./propertyRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const calendarRoutes = require('./calendarRoutes');

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
router.use('/password-reset', passwordResetRoutes);
router.use('/properties', propertyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/calendar', calendarRoutes);

module.exports = router;
