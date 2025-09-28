const pool = require('./config/db');
const bcrypt = require('bcrypt');

// Generate a random password
function generatePassword(length = 8) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Generate a simple password for easier testing
function generateSimplePassword() {
  const adjectives = ['Happy', 'Bright', 'Swift', 'Smart', 'Quick', 'Bold', 'Cool', 'Wise'];
  const nouns = ['Tiger', 'Eagle', 'Lion', 'Wolf', 'Bear', 'Fox', 'Hawk', 'Falcon'];
  const numbers = Math.floor(Math.random() * 999) + 100;
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}${numbers}`;
}

async function updateUserCredentials() {
  try {
    console.log('🔍 Fetching all non-admin users...');
    
    // Get all users except admins
    const result = await pool.query(`
      SELECT id, name, email, role 
      FROM users 
      WHERE role != 'admin' 
      ORDER BY role, name
    `);
    
    console.log(`📋 Found ${result.rows.length} non-admin users to update`);
    
    const updatedUsers = [];
    
    for (const user of result.rows) {
      // Generate a new password
      const newPassword = generateSimplePassword();
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update the user's password
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      updatedUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: newPassword
      });
      
      console.log(`✅ Updated credentials for ${user.name} (${user.email})`);
    }
    
    console.log('\n📋 UPDATED USER CREDENTIALS:');
    console.log('=' .repeat(80));
    console.log('| Name                    | Email                              | Role                 | Password        |');
    console.log('|' + '-'.repeat(78) + '|');
    
    updatedUsers.forEach(user => {
      const name = user.name.padEnd(24);
      const email = user.email.padEnd(32);
      const role = user.role.padEnd(20);
      const password = user.password.padEnd(14);
      console.log(`| ${name} | ${email} | ${role} | ${password} |`);
    });
    
    console.log('=' .repeat(80));
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total users updated: ${updatedUsers.length}`);
    
    // Group by role
    const roleGroups = {};
    updatedUsers.forEach(user => {
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      roleGroups[user.role].push(user);
    });
    
    Object.keys(roleGroups).forEach(role => {
      console.log(`${role}: ${roleGroups[role].length} users`);
    });
    
    console.log('\n🔐 All passwords have been hashed and stored securely in the database.');
    console.log('💡 Users can now log in with their email and the new password shown above.');
    
  } catch (error) {
    console.error('❌ Error updating user credentials:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
updateUserCredentials();
