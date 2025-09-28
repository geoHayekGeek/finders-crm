// createTeamLeader.js
const bcrypt = require('bcryptjs');
const userModel = require('./models/userModel');

async function createTeamLeader() {
  try {
    console.log('🚀 Creating team leader...');
    
    const teamLeaderData = {
      name: 'John Team Leader',
      email: 'teamleader@finderscrm.com',
      password: 'teamleader123',
      role: 'team_leader',
      location: 'Main Office',
      phone: '+1 (555) 123-4567',
      dob: '1985-06-15'
    };

    // Check if team leader already exists
    const existingUser = await userModel.findByEmail(teamLeaderData.email);
    if (existingUser) {
      console.log('❌ Team leader already exists with this email');
      return;
    }

    // Generate unique user code
    const userCode = await userModel.generateUniqueUserCode();
    console.log('📝 Generated user code:', userCode);

    // Hash password
    const hashedPassword = await bcrypt.hash(teamLeaderData.password, 10);
    console.log('🔐 Password hashed successfully');

    // Create team leader
    const newTeamLeader = await userModel.createUser({
      name: teamLeaderData.name,
      email: teamLeaderData.email,
      password: hashedPassword,
      role: teamLeaderData.role,
      location: teamLeaderData.location,
      phone: teamLeaderData.phone,
      dob: teamLeaderData.dob,
      user_code: userCode,
    });

    console.log('✅ Team leader created successfully!');
    console.log('📋 Team Leader Details:');
    console.log('   ID:', newTeamLeader.id);
    console.log('   Name:', newTeamLeader.name);
    console.log('   Email:', newTeamLeader.email);
    console.log('   Role:', newTeamLeader.role);
    console.log('   User Code:', newTeamLeader.user_code);
    console.log('   Location:', newTeamLeader.location);
    console.log('   Phone:', newTeamLeader.phone);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Email:', teamLeaderData.email);
    console.log('   Password:', teamLeaderData.password);
    console.log('');
    console.log('⚠️  Remember to change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating team leader:', error);
  }
}

// Run the function
createTeamLeader();

