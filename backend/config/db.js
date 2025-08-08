const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Railway
  },
  idleTimeoutMillis: 30000,  // 30 seconds
  connectionTimeoutMillis: 2000 // 2 seconds
});

module.exports = pool;
