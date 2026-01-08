// reset-and-populate-dummy-data.js
// Script to reset database and populate with Lebanese dummy data
require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const Property = require('./models/propertyModel');
const Lead = require('./models/leadsModel');
const Viewing = require('./models/viewingModel');
const User = require('./models/userModel');

// Lebanese names and locations
const LEBANESE_FIRST_NAMES = [
  'Ahmad', 'Mohammad', 'Ali', 'Hassan', 'Hussein', 'Omar', 'Khaled', 'Youssef', 'Karim', 'Tarek',
  'Fatima', 'Layla', 'Mariam', 'Nour', 'Sara', 'Zeina', 'Rania', 'Dina', 'Lina', 'Nadia',
  'George', 'Joseph', 'Antoine', 'Pierre', 'Marc', 'Michel', 'Elie', 'Fadi', 'Tony', 'Rami',
  'Rita', 'Maya', 'Nour', 'Christina', 'Lara', 'Tania', 'Mira', 'Diana', 'Sandra', 'Natalie'
];

const LEBANESE_LAST_NAMES = [
  'Khoury', 'Saad', 'Haddad', 'Khalil', 'Nassar', 'Mansour', 'Fadel', 'Salloum', 'Tannous', 'Maalouf',
  'Chahine', 'Rizk', 'Daher', 'Hamdan', 'Kanaan', 'Sfeir', 'Rahhal', 'Bitar', 'Zoghbi', 'Mouawad',
  'Geagea', 'Frangieh', 'Jumblatt', 'Hariri', 'Berri', 'Aoun', 'Gemayel', 'Chamoun', 'Sleiman', 'Sarkis'
];

const LEBANESE_LOCATIONS = [
  'Beirut', 'Jounieh', 'Hamra', 'Achrafieh', 'Verdun', 'Raouche', 'Zahle', 'Tripoli', 'Sidon', 'Tyre',
  'Byblos', 'Batroun', 'Jbeil', 'Baalbek', 'Nabatieh', 'Marjayoun', 'Zgharta', 'Bcharre', 'Douma', 'Bhamdoun'
];

const LEBANESE_STREETS = [
  'Hamra Street', 'Corniche', 'Monot Street', 'Gouraud Street', 'Mar Mikhael', 'Gemmayze', 'Badaro',
  'Achrafieh', 'Sassine Square', 'Sodeco', 'Spears Street', 'Clemenceau', 'Riad El Solh', 'Martyrs Square'
];

// Helper function to get random element from array
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random Lebanese name
function generateLebaneseName() {
  return `${randomElement(LEBANESE_FIRST_NAMES)} ${randomElement(LEBANESE_LAST_NAMES)}`;
}

// Helper function to generate Lebanese phone number
function generateLebanesePhone() {
  const prefixes = ['70', '71', '76', '78', '79', '81', '03'];
  const prefix = randomElement(prefixes);
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `+961 ${prefix} ${number.toString().substring(0, 3)} ${number.toString().substring(3)}`;
}

// Helper function to generate random date within range
function randomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Helper function to generate random date in the past
function randomPastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

async function main() {
  let client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting database reset and population...\n');

    // Step 1: Delete all reports
    console.log('📊 Step 1: Deleting all reports...');
    await client.query('DELETE FROM monthly_agent_reports');
    await client.query('DELETE FROM operations_daily_reports');
    await client.query('DELETE FROM operations_commission_reports');
    await client.query('DELETE FROM dcsr_monthly_reports');
    console.log('✅ All reports deleted\n');

    // Step 2: Delete calendar events (they reference users)
    console.log('📅 Step 2: Deleting all calendar events...');
    await client.query('DELETE FROM calendar_events');
    console.log('✅ All calendar events deleted\n');

    // Step 3: Delete viewing updates (they reference viewings and users)
    console.log('📝 Step 3: Deleting all viewing updates...');
    await client.query('DELETE FROM viewing_updates');
    console.log('✅ All viewing updates deleted\n');

    // Step 4: Delete all viewings (must be before properties and leads due to foreign keys)
    console.log('👁️  Step 4: Deleting all viewings...');
    await client.query('DELETE FROM viewings');
    console.log('✅ All viewings deleted\n');

    // Step 5: Delete all properties (this will cascade delete referrals)
    console.log('🏠 Step 5: Deleting all properties...');
    await client.query('DELETE FROM properties');
    console.log('✅ All properties deleted\n');

    // Step 6: Delete all lead referrals
    console.log('📋 Step 6: Deleting all lead referrals...');
    await client.query('DELETE FROM lead_referrals');
    console.log('✅ All lead referrals deleted\n');

    // Step 7: Delete all leads
    console.log('👥 Step 7: Deleting all leads...');
    await client.query('DELETE FROM leads');
    console.log('✅ All leads deleted\n');

    // Step 8: Delete notifications (they reference users)
    console.log('🔔 Step 8: Deleting all notifications...');
    await client.query('DELETE FROM notifications');
    console.log('✅ All notifications deleted\n');

    // Step 9: Get the admin user to keep
    console.log('👤 Step 9: Finding admin user to keep...');
    const adminResult = await client.query(
      "SELECT id FROM users WHERE email = 'georgiohayek2002@gmail.com'"
    );
    
    if (adminResult.rows.length === 0) {
      throw new Error('Admin user georgiohayek2002@gmail.com not found!');
    }
    
    const adminId = adminResult.rows[0].id;
    console.log(`✅ Admin user found (ID: ${adminId})\n`);

    // Step 10: Delete all users except admin (handle team_agents first)
    console.log('👥 Step 10: Deleting team assignments...');
    await client.query('DELETE FROM team_agents');
    console.log('✅ Team assignments deleted\n');

    // Step 11: Delete user documents (they reference users)
    console.log('📄 Step 11: Deleting all user documents...');
    await client.query('DELETE FROM user_documents');
    console.log('✅ All user documents deleted\n');

    console.log('👥 Step 12: Deleting all users except admin...');
    await client.query('DELETE FROM users WHERE id != $1', [adminId]);
    console.log('✅ All users deleted except admin\n');

    // Step 13: Get required data (statuses, categories, operations users, reference sources)
    console.log('📋 Step 13: Fetching required data...');
    const statusesResult = await client.query('SELECT id, code, name FROM statuses WHERE is_active = true');
    const categoriesResult = await client.query('SELECT id, code, name FROM categories WHERE is_active = true');
    
    // Helper to generate unique user code within transaction
    const usedUserCodes = new Set();
    async function generateUniqueCodeInTransaction(name, usedCodes, dbClient) {
      const nameParts = name.trim().split(/\s+/);
      let initials = '';
      
      if (nameParts.length === 1) {
        initials = nameParts[0].substring(0, 2).toUpperCase();
      } else {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
      }
      
      // Check in database and used codes
      let userCode = initials;
      let counter = 0;
      
      while (usedCodes.has(userCode) || (await dbClient.query('SELECT id FROM users WHERE user_code = $1', [userCode])).rows.length > 0) {
        counter++;
        userCode = initials + counter;
        if (counter > 1000) {
          // Fallback with timestamp
          userCode = initials + Date.now().toString().slice(-4);
          break;
        }
      }
      
      usedCodes.add(userCode);
      return userCode;
    }
    
    // Create operations user if doesn't exist
    let operationsResult = await client.query(
      "SELECT id FROM users WHERE role IN ('operations', 'operations_manager') LIMIT 1"
    );
    
    let operationsId;
    if (operationsResult.rows.length === 0) {
      console.log('  Creating operations user...');
      const opsName = generateLebaneseName();
      const opsEmail = 'operations@finderscrm.com';
      const opsPassword = await bcrypt.hash('operations123', 10);
      
      const opsUserCode = await generateUniqueCodeInTransaction(opsName, usedUserCodes, client);
      
      const opsResult = await client.query(
        `INSERT INTO users (name, email, password, role, phone, user_code, is_assigned, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [opsName, opsEmail, opsPassword, 'operations', generateLebanesePhone(), opsUserCode, false, null]
      );
      operationsId = opsResult.rows[0].id;
      console.log(`  ✅ Created operations user (ID: ${operationsId})`);
    } else {
      operationsId = operationsResult.rows[0].id;
      console.log(`  ✅ Using existing operations user (ID: ${operationsId})`);
    }
    
    const referenceSourcesResult = await client.query('SELECT id FROM reference_sources LIMIT 5');

    const statuses = statusesResult.rows;
    const categories = categoriesResult.rows;
    const referenceSources = referenceSourcesResult.rows;

    if (statuses.length === 0 || categories.length === 0) {
      throw new Error('Missing required statuses or categories!');
    }

    const activeStatus = statuses.find(s => s.code?.toLowerCase() === 'active') || statuses[0];
    const soldStatus = statuses.find(s => s.code?.toLowerCase() === 'sold') || statuses.find(s => s.name?.toLowerCase().includes('sold'));
    const rentedStatus = statuses.find(s => s.code?.toLowerCase() === 'rented') || statuses.find(s => s.name?.toLowerCase().includes('rented'));
    const closedStatuses = statuses.filter(s => 
      ['sold', 'rented', 'closed'].includes(s.code?.toLowerCase()) ||
      ['sold', 'rented', 'closed'].some(word => s.name?.toLowerCase().includes(word))
    );

    console.log(`✅ Found ${statuses.length} statuses, ${categories.length} categories\n`);

    // Step 14: Create users for all roles
    console.log('👥 Step 14: Creating users for all roles...');
    
    // Create agent managers (2)
    console.log('  Creating agent managers...');
    const agentManagers = [];
    for (let i = 0; i < 2; i++) {
      const name = generateLebaneseName();
      const email = `agentmanager${i + 1}@finderscrm.com`;
      const hashedPassword = await bcrypt.hash('agentmanager123', 10);
      const userCode = await generateUniqueCodeInTransaction(name, usedUserCodes, client);
      
      const result = await client.query(
        `INSERT INTO users (name, email, password, role, phone, user_code, is_assigned, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name`,
        [name, email, hashedPassword, 'agent_manager', generateLebanesePhone(), userCode, false, null]
      );
      
      agentManagers.push(result.rows[0]);
      console.log(`    ✅ Created agent manager: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }
    console.log(`  ✅ All ${agentManagers.length} agent managers created\n`);

    // Create operations managers (2)
    console.log('  Creating operations managers...');
    const operationsManagers = [];
    for (let i = 0; i < 2; i++) {
      const name = generateLebaneseName();
      const email = `opsmanager${i + 1}@finderscrm.com`;
      const hashedPassword = await bcrypt.hash('operations123', 10);
      const userCode = await generateUniqueCodeInTransaction(name, usedUserCodes, client);
      
      const result = await client.query(
        `INSERT INTO users (name, email, password, role, phone, user_code, is_assigned, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name`,
        [name, email, hashedPassword, 'operations_manager', generateLebanesePhone(), userCode, false, null]
      );
      
      operationsManagers.push(result.rows[0]);
      console.log(`    ✅ Created operations manager: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }
    console.log(`  ✅ All ${operationsManagers.length} operations managers created\n`);

    // Create additional operations users (2)
    console.log('  Creating operations users...');
    const operationsUsers = [];
    for (let i = 0; i < 2; i++) {
      const name = generateLebaneseName();
      const email = `operations${i + 1}@finderscrm.com`;
      const hashedPassword = await bcrypt.hash('operations123', 10);
      const userCode = await generateUniqueCodeInTransaction(name, usedUserCodes, client);
      
      const result = await client.query(
        `INSERT INTO users (name, email, password, role, phone, user_code, is_assigned, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name`,
        [name, email, hashedPassword, 'operations', generateLebanesePhone(), userCode, false, null]
      );
      
      operationsUsers.push(result.rows[0]);
      console.log(`    ✅ Created operations user: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }
    console.log(`  ✅ All ${operationsUsers.length} operations users created\n`);

    // Step 15: Create 3 team leaders
    console.log('👔 Step 15: Creating 3 team leaders...');
    const teamLeaders = [];
    
    for (let i = 0; i < 3; i++) {
      const name = generateLebaneseName();
      const email = `teamleader${i + 1}@finderscrm.com`;
      const hashedPassword = await bcrypt.hash('teamleader123', 10);
      const userCode = await generateUniqueCodeInTransaction(name, usedUserCodes, client);
      
      const result = await client.query(
        `INSERT INTO users (name, email, password, role, phone, user_code, is_assigned, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name`,
        [name, email, hashedPassword, 'team_leader', generateLebanesePhone(), userCode, false, null]
      );
      
      teamLeaders.push(result.rows[0]);
      console.log(`  ✅ Created team leader: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }
    console.log('✅ All team leaders created\n');

    // Step 16: Create agents (at least 12 agents, 4 per team)
    console.log('👥 Step 16: Creating agents...');
    const agents = [];
    const agentsPerTeam = 4;
    
    for (let i = 0; i < teamLeaders.length; i++) {
      const teamLeader = teamLeaders[i];
      console.log(`  Creating agents for team ${i + 1} (${teamLeader.name})...`);
      
      for (let j = 0; j < agentsPerTeam; j++) {
        const name = generateLebaneseName();
        const email = `agent${i + 1}_${j + 1}@finderscrm.com`;
        const hashedPassword = await bcrypt.hash('agent123', 10);
        const userCode = await generateUniqueCodeInTransaction(name, usedUserCodes, client);
        
        const result = await client.query(
          `INSERT INTO users (name, email, password, role, phone, user_code, is_assigned, assigned_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name`,
          [name, email, hashedPassword, 'agent', generateLebanesePhone(), userCode, true, teamLeader.id]
        );
        
        const agent = result.rows[0];
        agents.push(agent);
        
        // Assign to team leader
        await client.query(
          `INSERT INTO team_agents (team_leader_id, agent_id, assigned_by, is_active)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (team_leader_id, agent_id) DO UPDATE SET is_active = true`,
          [teamLeader.id, agent.id, adminId, true]
        );
        
        console.log(`    ✅ Created agent: ${agent.name} (ID: ${agent.id})`);
      }
    }
    console.log(`✅ All ${agents.length} agents created\n`);

    // Commit transaction so Property.createProperty can see the users
    await client.query('COMMIT');
    console.log('✅ Transaction committed - users are now visible\n');
    
    // Release client since Property.createProperty uses its own connection
    client.release();

    // Step 17: Create 400 leads with referrals
    console.log('👥 Step 17: Creating 400 leads with referrals...');
    const allUsers = [...agentManagers, ...operationsManagers, ...operationsUsers, ...teamLeaders, ...agents];
    // For leads, prefer agents and team leaders, but can also use other roles
    const leadAssignableUsers = [...teamLeaders, ...agents, ...agentManagers];
    // Get operations users for leads (use created ones or fallback to operationsId)
    const availableOperationsUsers = [...operationsManagers, ...operationsUsers];
    const finalOperationsId = availableOperationsUsers.length > 0 ? availableOperationsUsers[0].id : operationsId;
    const createdLeads = [];
    
    for (let i = 0; i < 400; i++) {
      const customerName = generateLebaneseName();
      const phoneNumber = generateLebanesePhone();
      const agent = randomElement(leadAssignableUsers);
      const date = randomPastDate(365);
      const status = randomElement(['Active', 'Contacted', 'Qualified', 'Converted', 'Closed']);
      const referenceSource = referenceSources.length > 0 ? randomElement(referenceSources).id : null;
      const price = Math.floor(Math.random() * 500000) + 50000; // 50k to 550k
      // Randomly assign to different operations users
      const assignedOperationsId = availableOperationsUsers.length > 0 
        ? randomElement(availableOperationsUsers).id 
        : finalOperationsId;
      
      const leadResult = await pool.query(
        `INSERT INTO leads (date, customer_name, phone_number, agent_id, agent_name, price, reference_source_id, operations_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [date, customerName, phoneNumber, agent.id, agent.name, price, referenceSource, assignedOperationsId, status]
      );
      
      const leadId = leadResult.rows[0].id;
      createdLeads.push({ id: leadId, agent_id: agent.id });
      
      // Add 1-3 referrals per lead
      const numReferrals = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numReferrals; j++) {
        const referralAgent = randomElement(leadAssignableUsers);
        const referralDate = randomPastDate(90);
        const referralType = Math.random() > 0.7 ? 'custom' : 'employee';
        const referralName = referralType === 'employee' ? referralAgent.name : generateLebaneseName();
        const employeeId = referralType === 'employee' ? referralAgent.id : null;
        
        await pool.query(
          `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [leadId, employeeId, referralName, referralType, referralDate, false]
        );
      }
      
      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ Created ${i + 1}/400 leads...`);
      }
    }
    console.log('✅ All 400 leads created with referrals\n');

    // Step 18: Create 200 properties with referrals and viewings
    console.log('🏠 Step 18: Creating 200 properties with referrals and viewings...');
    const createdProperties = [];
    
    for (let i = 0; i < 200; i++) {
      const category = randomElement(categories);
      const propertyType = Math.random() > 0.5 ? 'sale' : 'rent';
      const location = `${randomElement(LEBANESE_STREETS)}, ${randomElement(LEBANESE_LOCATIONS)}, Lebanon`;
      const buildingName = Math.random() > 0.3 ? `${randomElement(LEBANESE_LAST_NAMES)} Building` : null;
      const ownerName = generateLebaneseName();
      const phoneNumber = generateLebanesePhone();
      const surface = Math.floor(Math.random() * 500) + 50; // 50 to 550 m²
      const price = propertyType === 'sale' 
        ? Math.floor(Math.random() * 2000000) + 100000 // 100k to 2.1M
        : Math.floor(Math.random() * 5000) + 500; // 500 to 5500 per month
      
      // Random status
      const isClosed = Math.random() > 0.6; // 40% closed
      let status = activeStatus;
      let closedDate = null;
      let soldAmount = null;
      let buyerId = null;
      let commission = null;
      let platformId = null;
      
      if (isClosed && closedStatuses.length > 0) {
        status = randomElement(closedStatuses);
        closedDate = randomPastDate(180);
        soldAmount = price + Math.floor(Math.random() * 50000) - 25000; // ±25k variation
        buyerId = createdLeads.length > 0 ? randomElement(createdLeads).id : null;
        commission = Math.floor(soldAmount * 0.02); // 2% commission
        platformId = referenceSources.length > 0 ? randomElement(referenceSources).id : null;
      }
      
      // For properties, prefer agents and team leaders
      const propertyAssignableUsers = [...teamLeaders, ...agents];
      const agent = randomElement(propertyAssignableUsers);
      const viewType = randomElement(['open view', 'sea view', 'mountain view', 'no view']);
      const concierge = Math.random() > 0.5;
      const builtYear = Math.floor(Math.random() * 50) + 1975; // 1975 to 2025
      
      const details = JSON.stringify({
        floor_number: Math.floor(Math.random() * 20) + 1,
        balcony: Math.random() > 0.3 ? 'Yes' : 'No',
        covered_parking: Math.random() > 0.5 ? '1' : '0',
        outdoor_parking: Math.random() > 0.5 ? '1' : '0',
        cave: Math.random() > 0.4 ? 'Yes' : 'No'
      });
      
      const interiorDetails = JSON.stringify({
        living_rooms: Math.floor(Math.random() * 3) + 1,
        bedrooms: Math.floor(Math.random() * 4) + 1,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        maid_room: Math.random() > 0.6 ? 'Yes' : 'No'
      });
      
      // Create property
      const propertyData = {
        status_id: status.id,
        property_type: propertyType,
        location: location,
        category_id: category.id,
        building_name: buildingName,
        owner_name: ownerName,
        phone_number: phoneNumber,
        surface: surface,
        details: details,
        interior_details: interiorDetails,
        built_year: builtYear,
        view_type: viewType,
        concierge: concierge,
        agent_id: agent.id,
        price: price,
        notes: `Property in ${location}`,
        closed_date: closedDate,
        sold_amount: soldAmount,
        buyer_id: buyerId,
        commission: commission,
        platform_id: platformId,
        referrals: []
      };
      
      const property = await Property.createProperty(propertyData);
      createdProperties.push({ id: property.id, agent_id: agent.id });
      
      // Add 1-3 referrals per property
      const numReferrals = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numReferrals; j++) {
        const referralAgent = randomElement(propertyAssignableUsers);
        const referralDate = randomPastDate(90);
        const referralType = Math.random() > 0.7 ? 'custom' : 'employee';
        const referralName = referralType === 'employee' ? referralAgent.name : generateLebaneseName();
        const employeeId = referralType === 'employee' ? referralAgent.id : null;
        
        await pool.query(
          `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [property.id, referralName, referralType, employeeId, referralDate, false]
        );
      }
      
      // Add 1-2 viewings per property (if property is not closed or randomly)
      if (!isClosed || Math.random() > 0.7) {
        const numViewings = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numViewings; j++) {
          const lead = randomElement(createdLeads);
          const viewingDate = randomPastDate(60);
          const viewingTime = `${String(Math.floor(Math.random() * 12) + 9).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
          const status = randomElement(['Scheduled', 'Completed', 'Cancelled', 'No Show', 'Rescheduled']);
          
          await Viewing.createViewing({
            property_id: property.id,
            lead_id: lead.id,
            agent_id: agent.id,
            viewing_date: viewingDate,
            viewing_time: viewingTime,
            status: status,
            is_serious: Math.random() > 0.7,
            notes: `Viewing for ${property.reference_number}`,
            parent_viewing_id: null
          });
        }
      }
      
      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ Created ${i + 1}/200 properties...`);
      }
    }
    
    // Update referrals_count for properties
    await pool.query(`
      UPDATE properties p
      SET referrals_count = (
        SELECT COUNT(*) FROM referrals r WHERE r.property_id = p.id
      )
    `);
    
    console.log('✅ All 200 properties created with referrals and viewings\n');

    // Step 19: Create credentials file
    console.log('📝 Step 19: Generating credentials file...');
    const credentials = {
      generated_at: new Date().toISOString(),
      users: []
    };

    // Add admin user
    const adminUser = await pool.query("SELECT id, name, email, role FROM users WHERE email = 'georgiohayek2002@gmail.com'");
    if (adminUser.rows.length > 0) {
      credentials.users.push({
        id: adminUser.rows[0].id,
        name: adminUser.rows[0].name,
        email: adminUser.rows[0].email,
        role: adminUser.rows[0].role,
        password: 'Your existing password'
      });
    }

    // Add all created users (excluding admin)
    const allCreatedUsers = await pool.query(`
      SELECT id, name, email, role 
      FROM users 
      WHERE email != 'georgiohayek2002@gmail.com'
      ORDER BY 
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'agent_manager' THEN 2
          WHEN 'operations_manager' THEN 3
          WHEN 'operations' THEN 4
          WHEN 'team_leader' THEN 5
          WHEN 'agent' THEN 6
          ELSE 7
        END,
        name
    `);

    allCreatedUsers.rows.forEach(user => {
      let password = '';
      if (user.role === 'team_leader') {
        password = 'teamleader123';
      } else if (user.role === 'agent') {
        password = 'agent123';
      } else if (user.role === 'operations' || user.role === 'operations_manager') {
        password = 'operations123';
      } else if (user.role === 'agent_manager') {
        password = 'agentmanager123';
      } else if (user.role === 'admin') {
        password = 'admin123';
      }

      credentials.users.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: password
      });
    });

    // Write credentials file (override if exists)
    const credentialsPath = path.join(__dirname, 'credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), 'utf8');
    console.log(`✅ Credentials file created: ${credentialsPath}\n`);
    
    console.log('🎉 Database reset and population completed successfully!\n');
    // Group users by role for summary
    const usersByRole = {};
    credentials.users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    console.log('📊 Summary:');
    console.log(`   - Agent Managers: ${usersByRole['agent_manager']?.length || 0}`);
    console.log(`   - Operations Managers: ${usersByRole['operations_manager']?.length || 0}`);
    console.log(`   - Operations Users: ${usersByRole['operations']?.length || 0}`);
    console.log(`   - Team Leaders: ${teamLeaders.length}`);
    console.log(`   - Agents: ${agents.length}`);
    console.log(`   - Leads: ${createdLeads.length}`);
    console.log(`   - Properties: ${createdProperties.length}`);
    console.log(`   - Total Users: ${credentials.users.length}`);
    console.log(`\n📄 Credentials saved to: ${credentialsPath}`);
    console.log('\n🔑 Login Credentials by Role:');
    console.log('   Admin: Your existing password');
    console.log('   Agent Managers: agentmanager123');
    console.log('   Operations Managers: operations123');
    console.log('   Operations Users: operations123');
    console.log('   Team Leaders: teamleader123');
    console.log('   Agents: agent123');
    console.log(`\n📋 Full credentials list available in: ${credentialsPath}`);
    
  } catch (error) {
    try {
      if (client && !client.released) {
        await client.query('ROLLBACK');
        client.release();
      }
    } catch (rollbackError) {
      // Ignore rollback errors if transaction was already committed
    }
    console.error('❌ Error:', error);
    throw error;
  } finally {
    try {
      if (client && !client.released) {
        client.release();
      }
    } catch (releaseError) {
      // Ignore if already released
    }
    await pool.end();
  }
}

main().catch(console.error);

