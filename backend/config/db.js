const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Railway
  },
  idleTimeoutMillis: 30000,  // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds - more reasonable for Railway
  max: 20, // Maximum number of clients in the pool
  min: 2,  // Minimum number of clients in the pool
});

module.exports = pool;
