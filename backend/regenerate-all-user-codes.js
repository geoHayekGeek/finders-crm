// Regenerate all user codes based on names
const pool = require('./config/db');

async function regenerateAllUserCodes() {
  console.log('🔄 Regenerating all user codes from names...\n');
  
  try {
    // First, temporarily remove all unique constraints on user_code
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_code_unique');
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_code_key');
    
    // Get all users
    const users = await pool.query('SELECT id, name FROM users ORDER BY id');
    
    const usedCodes = new Set();
    const updates = [];
    
    for (const user of users.rows) {
      const nameParts = user.name.trim().split(/\s+/);
      let initials = '';
      
      if (nameParts.length === 1) {
        // Single name: use first 2 letters
        initials = nameParts[0].substring(0, 2).toUpperCase();
      } else {
        // Multiple names: first + last initial
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
      }
      
      // Find unique code
      let userCode = initials;
      let counter = 1;
      
      while (usedCodes.has(userCode)) {
        userCode = initials + counter;
        counter++;
      }
      
      usedCodes.add(userCode);
      updates.push({ id: user.id, name: user.name, code: userCode });
      
      // Update in database
      await pool.query('UPDATE users SET user_code = $1 WHERE id = $2', [userCode, user.id]);
      console.log(`✅ ${user.name.padEnd(30)} → ${userCode}`);
    }
    
    // Re-add the unique constraint
    await pool.query('ALTER TABLE users ADD CONSTRAINT users_user_code_unique UNIQUE (user_code)');
    
    console.log('\n✅ All user codes regenerated successfully!\n');
    
    // Show final result
    const finalUsers = await pool.query('SELECT id, name, email, user_code FROM users ORDER BY user_code');
    console.log('📊 Final user codes (sorted by code):');
    console.table(finalUsers.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

regenerateAllUserCodes();
