const bcrypt = require('bcryptjs');
const { createUser } = require('./models/userModel');

async function createAdminUser() {
  try {
    const adminData = {
      name: 'Admin User',
      email: 'admin@finderscrm.com',
      password: 'admin123',
      role: 'admin',
      location: 'Headquarters',
      phone: '+1 (555) 000-0000'
    };

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    // Create admin user
    const result = await createUser({
      ...adminData,
      password: hashedPassword
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Role:', adminData.role);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdminUser();

