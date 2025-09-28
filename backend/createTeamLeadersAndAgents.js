// createTeamLeadersAndAgents.js
const bcrypt = require('bcryptjs');
const userModel = require('./models/userModel');

async function createTeamLeadersAndAgents() {
  try {
    console.log('🚀 Creating team leaders and agents...');
    
    // Team Leaders Data
    const teamLeaders = [
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@finderscrm.com',
        password: 'teamleader123',
        role: 'team_leader',
        location: 'Downtown Office',
        phone: '+1 (555) 100-0001',
        dob: '1980-03-15'
      },
      {
        name: 'Michael Chen',
        email: 'michael.chen@finderscrm.com',
        password: 'teamleader123',
        role: 'team_leader',
        location: 'Midtown Office',
        phone: '+1 (555) 100-0002',
        dob: '1978-07-22'
      }
    ];

    // Agents Data
    const agents = [
      {
        name: 'Emma Davis',
        email: 'emma.davis@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Downtown Office',
        phone: '+1 (555) 200-0001',
        dob: '1990-05-10'
      },
      {
        name: 'James Wilson',
        email: 'james.wilson@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Downtown Office',
        phone: '+1 (555) 200-0002',
        dob: '1988-12-03'
      },
      {
        name: 'Lisa Anderson',
        email: 'lisa.anderson@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Midtown Office',
        phone: '+1 (555) 200-0003',
        dob: '1992-08-18'
      },
      {
        name: 'Robert Taylor',
        email: 'robert.taylor@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Midtown Office',
        phone: '+1 (555) 200-0004',
        dob: '1985-11-25'
      },
      {
        name: 'Jennifer Brown',
        email: 'jennifer.brown@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Downtown Office',
        phone: '+1 (555) 200-0005',
        dob: '1987-04-12'
      },
      {
        name: 'David Martinez',
        email: 'david.martinez@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Midtown Office',
        phone: '+1 (555) 200-0006',
        dob: '1991-09-07'
      }
    ];

    // Create Team Leaders
    console.log('\n📋 Creating Team Leaders...');
    const createdTeamLeaders = [];
    
    for (const teamLeaderData of teamLeaders) {
      // Check if team leader already exists
      const existingUser = await userModel.findByEmail(teamLeaderData.email);
      if (existingUser) {
        console.log(`⚠️  Team leader already exists: ${teamLeaderData.email}`);
        createdTeamLeaders.push(existingUser);
        continue;
      }

      // Generate unique user code
      const userCode = await userModel.generateUniqueUserCode();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(teamLeaderData.password, 10);
      
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
        is_assigned: false,
        assigned_to: null
      });

      createdTeamLeaders.push(newTeamLeader);
      console.log(`✅ Team Leader created: ${newTeamLeader.name} (ID: ${newTeamLeader.id})`);
    }

    // Create Agents
    console.log('\n👥 Creating Agents...');
    const createdAgents = [];
    
    for (const agentData of agents) {
      // Check if agent already exists
      const existingUser = await userModel.findByEmail(agentData.email);
      if (existingUser) {
        console.log(`⚠️  Agent already exists: ${agentData.email}`);
        createdAgents.push(existingUser);
        continue;
      }

      // Generate unique user code
      const userCode = await userModel.generateUniqueUserCode();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(agentData.password, 10);
      
      // Create agent
      const newAgent = await userModel.createUser({
        name: agentData.name,
        email: agentData.email,
        password: hashedPassword,
        role: agentData.role,
        location: agentData.location,
        phone: agentData.phone,
        dob: agentData.dob,
        user_code: userCode,
        is_assigned: false,
        assigned_to: null
      });

      createdAgents.push(newAgent);
      console.log(`✅ Agent created: ${newAgent.name} (ID: ${newAgent.id})`);
    }

    // Assign agents to team leaders
    console.log('\n🔗 Assigning agents to team leaders...');
    
    if (createdTeamLeaders.length >= 2 && createdAgents.length >= 4) {
      // Assign first 3 agents to first team leader
      const teamLeader1 = createdTeamLeaders[0];
      const agentsForTeamLeader1 = createdAgents.slice(0, 3);
      
      for (const agent of agentsForTeamLeader1) {
        try {
          await userModel.assignAgentToTeamLeader(teamLeader1.id, agent.id, null);
          console.log(`✅ Assigned ${agent.name} to ${teamLeader1.name}`);
        } catch (error) {
          console.log(`❌ Failed to assign ${agent.name} to ${teamLeader1.name}: ${error.message}`);
        }
      }
      
      // Assign remaining agents to second team leader
      const teamLeader2 = createdTeamLeaders[1];
      const agentsForTeamLeader2 = createdAgents.slice(3);
      
      for (const agent of agentsForTeamLeader2) {
        try {
          await userModel.assignAgentToTeamLeader(teamLeader2.id, agent.id, null);
          console.log(`✅ Assigned ${agent.name} to ${teamLeader2.name}`);
        } catch (error) {
          console.log(`❌ Failed to assign ${agent.name} to ${teamLeader2.name}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Team Leaders: ${createdTeamLeaders.length}`);
    console.log(`   Agents: ${createdAgents.length}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Team Leaders: teamleader123');
    console.log('   Agents: agent123');
    console.log('\n⚠️  Remember to change passwords after first login!');

  } catch (error) {
    console.error('❌ Error creating team leaders and agents:', error);
  }
}

// Run the function
createTeamLeadersAndAgents();

