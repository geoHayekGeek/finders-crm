// createHRUser.js
const bcrypt = require('bcryptjs');
const userModel = require('./models/userModel');

async function createHRUser() {
  try {
    console.log('🚀 Creating HR user...');
    
    const hrUserData = {
      name: 'HR User',
      email: 'hr@finderscrm.com',
      password: 'hr123456',
      role: 'hr',
      location: 'Main Office',
      phone: '+1 (555) 999-0000'
    };

    // Check if HR user already exists
    const existingUser = await userModel.findByEmail(hrUserData.email);
    if (existingUser) {
      console.log('✅ HR user already exists!');
      console.log('📋 HR User Details:');
      console.log('   ID:', existingUser.id);
      console.log('   Name:', existingUser.name);
      console.log('   Email:', existingUser.email);
      console.log('   Role:', existingUser.role);
      console.log('   User Code:', existingUser.user_code);
      console.log('');
      console.log('🔑 Login Credentials:');
      console.log('   Email:', hrUserData.email);
      console.log('   Password:', hrUserData.password);
      console.log('');
      return;
    }

    // Generate unique user code
    const userCode = await userModel.generateUniqueUserCode(hrUserData.name);
    console.log('📝 Generated user code:', userCode);

    // Hash password
    const hashedPassword = await bcrypt.hash(hrUserData.password, 10);
    console.log('🔐 Password hashed successfully');

    // Create HR user
    const newHRUser = await userModel.createUser({
      name: hrUserData.name,
      email: hrUserData.email,
      password: hashedPassword,
      role: hrUserData.role,
      location: hrUserData.location,
      phone: hrUserData.phone,
      user_code: userCode,
    });

    console.log('✅ HR user created successfully!');
    console.log('📋 HR User Details:');
    console.log('   ID:', newHRUser.id);
    console.log('   Name:', newHRUser.name);
    console.log('   Email:', newHRUser.email);
    console.log('   Role:', newHRUser.role);
    console.log('   User Code:', newHRUser.user_code);
    console.log('   Location:', newHRUser.location);
    console.log('   Phone:', newHRUser.phone);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Email:', hrUserData.email);
    console.log('   Password:', hrUserData.password);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating HR user:', error.message);
    process.exit(1);
  }
}

// Run the script
createHRUser();

