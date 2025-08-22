const bcrypt = require('bcryptjs');
const pool = require('./config/db');
require('dotenv').config();

async function createTestAgents() {
  try {
    console.log('🏢 Creating test agents...');
    
    // Test agents data
    const agents = [
      {
        name: 'John Smith',
        email: 'john.smith@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Beirut Central',
        phone: '+961 70 111 222'
      },
      {
        name: 'Sarah Johnson', 
        email: 'sarah.johnson@finderscrm.com',
        password: 'agent123',
        role: 'agent',
        location: 'Jounieh',
        phone: '+961 71 333 444'
      },
      {
        name: 'Mike Davis',
        email: 'mike.davis@finderscrm.com', 
        password: 'agent123',
        role: 'agent',
        location: 'Hamra',
        phone: '+961 70 555 666'
      },
      {
        name: 'Lisa Anderson',
        email: 'lisa.anderson@finderscrm.com',
        password: 'agent123', 
        role: 'agent',
        location: 'Achrafieh',
        phone: '+961 71 777 888'
      }
    ];
    
    let createdCount = 0;
    
    for (const agent of agents) {
      try {
        // Check if agent already exists
        const existingAgent = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [agent.email]
        );
        
        if (existingAgent.rows.length > 0) {
          console.log(`⚠️  Agent already exists: ${agent.email}`);
          continue;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(agent.password, 10);
        
        // Generate unique user code
        const userCode = 'AGT' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
        
        // Create agent
        const result = await pool.query(
          `INSERT INTO users (name, email, password, role, location, phone, user_code, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
           RETURNING id, name, email, role, user_code`,
          [agent.name, agent.email, hashedPassword, agent.role, agent.location, agent.phone, userCode]
        );
        
        const createdAgent = result.rows[0];
        console.log(`✅ Created agent: ${createdAgent.name} (${createdAgent.email}) - Code: ${createdAgent.user_code}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating agent ${agent.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully created ${createdCount} test agents!`);
    
    // Show all agents
    const allAgents = await pool.query(
      "SELECT id, name, email, role, location, phone, user_code FROM users WHERE role = 'agent' ORDER BY name"
    );
    
    console.log('\n📋 All agents in database:');
    allAgents.rows.forEach(agent => {
      console.log(`   ${agent.name} - ${agent.email} - ${agent.location} (${agent.user_code})`);
    });
    
    console.log('\n🔑 Default password for all test agents: agent123');
    
  } catch (error) {
    console.error('💥 Error creating test agents:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createTestAgents();
