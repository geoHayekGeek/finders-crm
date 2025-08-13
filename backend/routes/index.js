const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const userRoutes = require('./userRoutes');
const passwordResetRoutes = require('./passwordResetRoutes');

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

module.exports = router;
