import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

let pool: Pool | null = null;

/**
 * Get database connection pool
 */
export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'finders_crm_test',
    });
  }
  return pool;
}

/**
 * Close database connection
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute a query
 */
export async function query(text: string, params?: any[]): Promise<any> {
  const db = getDbPool();
  return db.query(text, params);
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<any> {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

/**
 * Get a property by reference number
 */
export async function getPropertyByReference(refNumber: string): Promise<any> {
  const result = await query('SELECT * FROM properties WHERE reference_number = $1', [refNumber]);
  return result.rows[0] || null;
}

/**
 * Get a lead by customer name
 */
export async function getLeadByCustomerName(customerName: string): Promise<any> {
  const result = await query('SELECT * FROM leads WHERE customer_name = $1', [customerName]);
  return result.rows[0] || null;
}

/**
 * Get a category by code
 */
export async function getCategoryByCode(code: string): Promise<any> {
  const result = await query('SELECT * FROM categories WHERE code = $1', [code]);
  return result.rows[0] || null;
}

/**
 * Get a status by code
 */
export async function getStatusByCode(code: string): Promise<any> {
  const result = await query('SELECT * FROM statuses WHERE code = $1', [code]);
  return result.rows[0] || null;
}

/**
 * Clean up test data (delete specific records)
 */
export async function cleanupTestData(table: string, condition: string, params: any[] = []): Promise<void> {
  await query(`DELETE FROM ${table} WHERE ${condition}`, params);
}

/**
 * Reset sequences (useful after deleting test data)
 */
export async function resetSequences(): Promise<void> {
  const sequencesResult = await query(`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public';
  `);

  for (const seq of sequencesResult.rows) {
    try {
      await query(`ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1;`);
    } catch (error) {
      // Ignore errors for sequences that might not exist
    }
  }
}

