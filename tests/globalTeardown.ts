import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  try {
    // Clean up test database (optional - we reset in setup, but can clean here too)
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'finders_crm_test',
    });

    // Optionally truncate tables (or leave data for debugging)
    if (process.env.CLEAN_DB_ON_TEARDOWN === 'true') {
      console.log('  → Cleaning test database...');
      
      const tablesResult = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);

      const tables = tablesResult.rows.map(row => row.tablename);

      await pool.query('SET session_replication_role = replica;');

      for (const table of tables) {
        try {
          await pool.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (error) {
          // Ignore errors for tables that might not exist
        }
      }

      await pool.query('SET session_replication_role = DEFAULT;');
      console.log('  ✅ Database cleaned');
    }

    await pool.end();
    console.log('✅ Global teardown completed!');
  } catch (error) {
    console.error('❌ Error during teardown:', error);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

export default globalTeardown;

