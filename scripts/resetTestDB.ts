/**
 * Script to reset the test database
 * Usage: npx ts-node scripts/resetTestDB.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

async function resetTestDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'finders_crm_test',
  });

  try {
    console.log('🔄 Resetting test database...');

    // Get all table names
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = tablesResult.rows.map(row => row.tablename);

    if (tables.length === 0) {
      console.log('⚠️  No tables found. Database might be empty or not initialized.');
      return;
    }

    // Disable foreign key checks temporarily
    await pool.query('SET session_replication_role = replica;');

    // Truncate all tables
    for (const table of tables) {
      try {
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`  ✓ Truncated ${table}`);
      } catch (error: any) {
        console.warn(`  ⚠️  Could not truncate table ${table}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT;');

    // Reset sequences
    const sequencesResult = await pool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);

    for (const seq of sequencesResult.rows) {
      try {
        await pool.query(`ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1;`);
        console.log(`  ✓ Reset sequence ${seq.sequence_name}`);
      } catch (error: any) {
        console.warn(`  ⚠️  Could not reset sequence ${seq.sequence_name}: ${error.message}`);
      }
    }

    console.log('✅ Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetTestDatabase();

