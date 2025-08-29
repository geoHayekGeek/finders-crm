// create-operations-users.js
const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function createOperationsUsers() {
  try {
    console.log('👥 Creating operations users for testing...');
    
    // Hash password for test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create operations users
    const operationsUsers = [
      {
        name: 'Operations Employee 1',
        email: 'ops1@test.com',
        role: 'operations',
        location: 'Dubai',
        phone: '+971-50-123-4567'
      },
      {
        name: 'Operations Employee 2', 
        email: 'ops2@test.com',
        role: 'operations',
        location: 'Abu Dhabi',
        phone: '+971-50-123-4568'
      },
      {
        name: 'Operations Manager',
        email: 'ops-manager@test.com',
        role: 'operations_manager',
        location: 'Dubai',
        phone: '+971-50-123-4569'
      }
    ];
    
    for (const user of operationsUsers) {
      try {
        const result = await pool.query(
          `INSERT INTO users (name, email, password, role, location, phone) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (email) DO NOTHING
           RETURNING id, name, email, role`,
          [user.name, user.email, hashedPassword, user.role, user.location, user.phone]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ Created user: ${result.rows[0].name} (${result.rows[0].role})`);
        } else {
          console.log(`ℹ️ User already exists: ${user.email}`);
        }
      } catch (userError) {
        console.error(`❌ Error creating user ${user.email}:`, userError.message);
      }
    }
    
    // Verify operations users were created
    const operationsUsersResult = await pool.query(`
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('operations', 'operations_manager')
      ORDER BY role, name
    `);
    
    console.log('\n📋 Current operations users:');
    operationsUsersResult.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log('\n🎉 Operations users setup completed!');
    
  } catch (error) {
    console.error('❌ Error creating operations users:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  createOperationsUsers()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = createOperationsUsers;
