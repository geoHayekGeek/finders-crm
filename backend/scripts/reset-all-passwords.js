/**
 * Reset all user passwords to a single value.
 * Safe to run on Railway: uses DATABASE_URL from env.
 *
 * Usage (from backend folder):
 *   node scripts/reset-all-passwords.js
 *   npm run reset-all-passwords
 *
 * Default password: Password132 (override with RESET_PASSWORD env var)
 */

const pool = require('../config/db');
const bcrypt = require('bcrypt');

const TARGET_PASSWORD = process.env.RESET_PASSWORD || 'Password132';
const SALT_ROUNDS = 12;

async function resetAllPasswords() {
  try {
    console.log('Connecting to database...');
    const hashedPassword = await bcrypt.hash(TARGET_PASSWORD, SALT_ROUNDS);

    const result = await pool.query(
      `SELECT id, name, email, role FROM users ORDER BY id`
    );
    const users = result.rows;

    if (users.length === 0) {
      console.log('No users found.');
      await pool.end();
      return;
    }

    console.log(`Found ${users.length} user(s). Resetting passwords to "${TARGET_PASSWORD}" and clearing lockouts...`);

    for (const user of users) {
      await pool.query(
        `UPDATE users 
         SET password = $1, 
             updated_at = NOW(),
             failed_login_attempts = 0,
             lockout_until = NULL
         WHERE id = $2`,
        [hashedPassword, user.id]
      );
      console.log(`  ✓ ${user.email} (${user.role})`);
    }

    console.log(`\nDone. All ${users.length} user(s) can log in with password: ${TARGET_PASSWORD}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAllPasswords();
