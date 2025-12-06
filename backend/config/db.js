const { Pool } = require('pg');
require('dotenv').config();

const isProduction = !!process.env.DATABASE_URL;

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // Needed for Railway or other cloud providers
        },
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        max: 20,
        min: 2,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        ...(process.env.DB_PASSWORD !== undefined && { password: String(process.env.DB_PASSWORD) }),
        database: process.env.DB_NAME || 'mydatabase',
        port: process.env.DB_PORT || 5432,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        max: 10, // You can keep it lower for local dev
      }
);

module.exports = pool;
