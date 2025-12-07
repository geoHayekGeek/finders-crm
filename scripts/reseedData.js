// scripts/reseedData.js
// Script to delete all properties, leads, viewings, referrals and re-add them randomly to agents and team leaders

const path = require('path');
const fs = require('fs');

// Try to load .env from root first, then backend directory
const rootEnvPath = path.join(__dirname, '..', '.env');
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  // Try default location (current working directory)
  require('dotenv').config();
}

// Verify database configuration
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('❌ Error: Database configuration not found!');
  console.error('Please create a .env file with database credentials.');
  console.error('Required variables:');
  console.error('  - DATABASE_URL (for production) OR');
  console.error('  - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (for local)');
  console.error('\nChecked locations:');
  console.error(`  - ${rootEnvPath}`);
  console.error(`  - ${backendEnvPath}`);
  process.exit(1);
}

// Check if password is set (even if empty string, it should be explicitly set)
if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_PASSWORD === undefined) {
  console.warn('⚠️  Warning: DB_PASSWORD is not set. If your database requires no password, set DB_PASSWORD=""');
}

const pool = require('../backend/config/db');
const Property = require('../backend/models/propertyModel');
const Lead = require('../backend/models/leadsModel');
const Viewing = require('../backend/models/viewingModel');
const User = require('../backend/models/userModel');

// Sample data generators
const locations = [
  'Beirut, Lebanon', 'Jounieh, Lebanon', 'Byblos, Lebanon', 'Tripoli, Lebanon',
  'Zahle, Lebanon', 'Sidon, Lebanon', 'Tyre, Lebanon', 'Baalbek, Lebanon',
  'Achrafieh, Beirut', 'Hamra, Beirut', 'Verdun, Beirut', 'Downtown Beirut'
];

const buildingNames = [
  'Marina Towers', 'Skyline Residences', 'Ocean View Complex', 'Garden Heights',
  'Sunset Apartments', 'Royal Plaza', 'Elite Towers', 'Paradise Villas',
  'Crystal Palace', 'Emerald Building', 'Diamond Residences', null, null, null
];

const firstNames = [
  'Ahmad', 'Mohammad', 'Ali', 'Hassan', 'Hussein', 'Omar', 'Khaled', 'Youssef',
  'Sarah', 'Layla', 'Maya', 'Nour', 'Zeina', 'Rania', 'Dina', 'Lina',
  'John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Joseph',
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Charlotte', 'Amelia', 'Mia', 'Harper'
];

const lastNames = [
  'Khoury', 'Saad', 'Haddad', 'Fadel', 'Khalil', 'Nassar', 'Mansour', 'Tannous',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris'
];

const phonePrefixes = ['+961 3', '+961 70', '+961 76', '+961 78', '+961 79', '+961 81'];

const viewTypes = ['open view', 'sea view', 'mountain view', 'no view'];
const propertyTypes = ['sale', 'rent'];
const leadStatuses = ['Active', 'Contacted', 'Qualified', 'Converted', 'Closed'];
const viewingStatuses = ['Scheduled', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'];
const referralTypes = ['employee', 'custom'];
const customReferralNames = ['John Doe', 'Jane Smith', 'External Agency', 'Partner Company', 'Friend Referral'];

// Helper functions
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(Math.floor(date.getMinutes() / 15) * 15).padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

function generatePhoneNumber() {
  return `${randomElement(phonePrefixes)} ${randomInt(100000, 999999)}`;
}

function generateCustomerName() {
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

function generatePropertyDetails() {
  // Return as object - Property.createProperty will handle conversion to JSONB
  return {
    floor_number: randomInt(0, 20).toString(),
    balcony: randomInt(0, 3).toString(),
    covered_parking: randomInt(0, 2).toString(),
    outdoor_parking: randomInt(0, 2).toString(),
    cave: Math.random() > 0.5 ? 'Yes' : 'No'
  };
}

function generateInteriorDetails() {
  // Return as object - Property.createProperty will handle conversion to JSONB
  return {
    living_rooms: randomInt(1, 3).toString(),
    bedrooms: randomInt(1, 5).toString(),
    bathrooms: randomInt(1, 4).toString(),
    maid_room: Math.random() > 0.7 ? 'Yes' : 'No'
  };
}

async function deleteAllData() {
  console.log('🗑️  Starting data deletion...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete in order due to foreign key constraints
    console.log('  Deleting viewing_updates...');
    await client.query('DELETE FROM viewing_updates');
    
    console.log('  Deleting viewings...');
    await client.query('DELETE FROM viewings');
    
    console.log('  Deleting referrals...');
    await client.query('DELETE FROM referrals');
    
    console.log('  Deleting properties...');
    await client.query('DELETE FROM properties');
    
    console.log('  Deleting lead_referrals...');
    await client.query('DELETE FROM lead_referrals');
    
    console.log('  Deleting leads...');
    await client.query('DELETE FROM leads');
    
    // Reset sequences (handle cases where sequences might not exist)
    console.log('  Resetting sequences...');
    const sequences = [
      'properties_id_seq',
      'leads_id_seq',
      'viewings_id_seq',
      'referrals_id_seq',
      'lead_referrals_id_seq',
      'viewing_updates_id_seq'
    ];
    
    for (const seqName of sequences) {
      try {
        await client.query(`ALTER SEQUENCE IF EXISTS ${seqName} RESTART WITH 1`);
      } catch (error) {
        // Sequence might not exist, which is okay
        console.log(`  ⚠️  Could not reset sequence ${seqName}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ All data deleted successfully!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getReferenceData() {
  console.log('📊 Fetching reference data...');
  
  const [statuses, categories, referenceSources, operationsUsers] = await Promise.all([
    pool.query('SELECT id, name, code FROM statuses WHERE is_active = true ORDER BY id'),
    pool.query('SELECT id, name, code FROM categories WHERE is_active = true ORDER BY id'),
    pool.query('SELECT id, source_name FROM reference_sources ORDER BY id'),
    pool.query("SELECT id, name FROM users WHERE role IN ('operations', 'operations_manager') ORDER BY id")
  ]);
  
  if (statuses.rows.length === 0) {
    throw new Error('No statuses found in database');
  }
  if (categories.rows.length === 0) {
    throw new Error('No categories found in database');
  }
  if (operationsUsers.rows.length === 0) {
    throw new Error('No operations users found in database');
  }
  
  console.log(`  Found ${statuses.rows.length} statuses, ${categories.rows.length} categories, ${referenceSources.rows.length} reference sources, ${operationsUsers.rows.length} operations users\n`);
  
  return {
    statuses: statuses.rows,
    categories: categories.rows,
    referenceSources: referenceSources.rows,
    operationsUsers: operationsUsers.rows
  };
}

async function getAgentsAndTeamLeaders() {
  console.log('👥 Fetching agents and team leaders...');
  
  const [agents, teamLeaders] = await Promise.all([
    User.getUsersByRole('agent'),
    User.getUsersByRole('team_leader')
  ]);
  
  if (agents.length === 0 && teamLeaders.length === 0) {
    throw new Error('No agents or team leaders found in database');
  }
  
  // Combine agents and team leaders for assignment
  const allAssignableUsers = [...agents, ...teamLeaders];
  
  console.log(`  Found ${agents.length} agents and ${teamLeaders.length} team leaders\n`);
  
  return {
    agents,
    teamLeaders,
    allAssignableUsers
  };
}

// Helper function to check if status is closed
function isClosedStatus(status) {
  const statusCode = status.code?.toLowerCase() || '';
  const statusName = status.name?.toLowerCase() || '';
  return ['sold', 'rented', 'closed'].includes(statusCode) || 
         ['sold', 'rented', 'closed'].includes(statusName);
}

async function createRandomProperties(count, referenceData, assignableUsers, leads) {
  console.log(`🏠 Creating ${count} random properties...`);
  
  const properties = [];
  
  // Use all statuses for variety
  const allStatuses = referenceData.statuses;
  
  try {
    for (let i = 0; i < count; i++) {
      const status = randomElement(allStatuses);
      const category = randomElement(referenceData.categories);
      const agent = randomElement(assignableUsers);
      const propertyType = randomElement(propertyTypes);
      const viewType = randomElement(viewTypes);
      
      // Determine if this is a closed status
      const closed = isClosedStatus(status);
      
      // For closed properties, generate a closed date in the past
      const closedDate = closed ? formatDate(randomDate(new Date(2020, 0, 1), new Date())) : null;
      
      // For closed properties, sometimes add sold_amount and buyer_id
      const soldAmount = closed && Math.random() > 0.3 
        ? randomInt(40000, 4500000) // Usually slightly less than asking price
        : null;
      
      // Randomly assign a buyer from leads (if available and closed)
      const buyerId = closed && leads && leads.length > 0 && Math.random() > 0.5
        ? randomElement(leads).id
        : null;
      
      // Generate owner information
      const ownerName = generateCustomerName();
      const ownerPhone = generatePhoneNumber();
      
      // Create a lead for the owner (owners are connected to leads)
      let ownerId = null;
      try {
        const operationsUser = randomElement(referenceData.operationsUsers);
        const ownerLeadData = {
          date: formatDate(randomDate(new Date(2023, 0, 1), new Date())),
          customer_name: ownerName,
          phone_number: ownerPhone,
          agent_id: agent.id, // Assign the same agent to the owner lead
          agent_name: agent.name,
          price: null, // Owner leads don't need price
          reference_source_id: null,
          operations_id: operationsUser.id,
          status: 'Active'
        };
        
        const ownerLead = await Lead.createLead(ownerLeadData);
        ownerId = ownerLead.id;
      } catch (error) {
        console.error(`  ⚠️  Error creating owner lead for property ${i + 1}:`, error.message);
        // Continue without owner_id if lead creation fails
      }
      
      // Generate property details and interior details as objects
      const propertyDetails = generatePropertyDetails();
      const interiorDetails = generateInteriorDetails();
      
      // Generate property data
      const propertyData = {
        status_id: status.id,
        property_type: propertyType,
        location: randomElement(locations),
        category_id: category.id,
        building_name: randomElement(buildingNames),
        owner_id: ownerId, // Link to the owner lead
        owner_name: ownerName, // Keep for backward compatibility
        phone_number: ownerPhone, // Keep for backward compatibility
        surface: randomFloat(50, 500),
        details: propertyDetails, // Object - will be converted to JSONB
        interior_details: interiorDetails, // Object - will be converted to JSONB
        built_year: randomInt(1980, 2024), // Wider year range
        view_type: viewType,
        concierge: Math.random() > 0.5, // More variety
        agent_id: agent.id, // Assign agent to property
        price: randomInt(30000, 8000000), // Wider price range
        notes: Math.random() > 0.6 ? `Property notes for ${ownerName}` : null,
        closed_date: closedDate,
        sold_amount: soldAmount,
        buyer_id: buyerId,
        referrals: []
      };
      
      // Add referrals randomly (40% chance for more variety)
      if (Math.random() < 0.4) {
        const referralCount = randomInt(1, 4); // Up to 4 referrals
        for (let j = 0; j < referralCount; j++) {
          const referralType = randomElement(referralTypes);
          // For closed properties, referrals should be in the past
          const referralDateRange = closed 
            ? { start: new Date(2020, 0, 1), end: closedDate ? new Date(closedDate) : new Date() }
            : { start: new Date(2023, 0, 1), end: new Date() };
          
          const referral = {
            name: referralType === 'employee' 
              ? randomElement(assignableUsers).name 
              : randomElement(customReferralNames),
            type: referralType,
            employee_id: referralType === 'employee' ? randomElement(assignableUsers).id : null,
            date: formatDate(randomDate(referralDateRange.start, referralDateRange.end))
          };
          propertyData.referrals.push(referral);
        }
      }
      
      try {
        const property = await Property.createProperty(propertyData);
        properties.push(property);
        
        if ((i + 1) % 10 === 0) {
          console.log(`  Created ${i + 1}/${count} properties...`);
        }
      } catch (error) {
        console.error(`  Error creating property ${i + 1}:`, error.message);
      }
    }
    
    console.log(`✅ Created ${properties.length} properties\n`);
    return properties;
  } catch (error) {
    console.error('Error creating properties:', error);
    throw error;
  }
}

async function createRandomLeads(count, referenceData, assignableUsers) {
  console.log(`📋 Creating ${count} random leads...`);
  
  const leads = [];
  
  try {
    for (let i = 0; i < count; i++) {
      const agent = randomElement(assignableUsers);
      const operationsUser = randomElement(referenceData.operationsUsers);
      const status = randomElement(leadStatuses);
      const referenceSource = Math.random() > 0.3 ? randomElement(referenceData.referenceSources) : null;
      
      const leadData = {
        date: formatDate(randomDate(new Date(2023, 0, 1), new Date())),
        customer_name: generateCustomerName(),
        phone_number: generatePhoneNumber(),
        agent_id: agent.id,
        agent_name: agent.name,
        price: Math.random() > 0.5 ? randomInt(100000, 2000000) : null,
        reference_source_id: referenceSource ? referenceSource.id : null,
        operations_id: operationsUser.id,
        status: status
      };
      
      try {
        const lead = await Lead.createLead(leadData);
        leads.push(lead);
        
        if ((i + 1) % 10 === 0) {
          console.log(`  Created ${i + 1}/${count} leads...`);
        }
      } catch (error) {
        console.error(`  Error creating lead ${i + 1}:`, error.message);
      }
    }
    
    console.log(`✅ Created ${leads.length} leads\n`);
    return leads;
  } catch (error) {
    console.error('Error creating leads:', error);
    throw error;
  }
}

async function createRandomViewings(count, properties, leads, assignableUsers) {
  console.log(`📅 Creating ${count} random viewings...`);
  
  if (properties.length === 0 || leads.length === 0) {
    console.log('⚠️  Skipping viewings - need at least one property and one lead');
    return [];
  }
  
  const viewings = [];
  
  try {
    for (let i = 0; i < count; i++) {
      const property = randomElement(properties);
      const lead = randomElement(leads);
      const agent = randomElement(assignableUsers);
      const status = randomElement(viewingStatuses);
      
      // More variety in viewing dates - some in past, some future, some today
      let viewingDate;
      const dateType = Math.random();
      if (dateType < 0.3) {
        // 30% past viewings
        viewingDate = randomDate(new Date(2023, 0, 1), new Date(Date.now() - 86400000));
      } else if (dateType < 0.6) {
        // 30% today
        viewingDate = new Date();
      } else {
        // 40% future viewings
        viewingDate = randomDate(new Date(), new Date(Date.now() + 90 * 86400000)); // Up to 90 days in future
      }
      
      const viewingTime = new Date(viewingDate);
      viewingTime.setHours(randomInt(8, 19)); // Wider time range
      viewingTime.setMinutes(randomInt(0, 3) * 15);
      
      const viewingData = {
        property_id: property.id,
        lead_id: lead.id,
        agent_id: agent.id,
        viewing_date: formatDate(viewingDate),
        viewing_time: formatTime(viewingTime),
        status: status,
        is_serious: Math.random() > 0.5, // More variety
        description: Math.random() > 0.4 ? `Viewing scheduled for ${lead.customer_name}` : null,
        notes: Math.random() > 0.6 ? `Notes for viewing at ${property.location}` : null
      };
      
      try {
        const viewing = await Viewing.createViewing(viewingData);
        viewings.push(viewing);
        
        if ((i + 1) % 10 === 0) {
          console.log(`  Created ${i + 1}/${count} viewings...`);
        }
      } catch (error) {
        console.error(`  Error creating viewing ${i + 1}:`, error.message);
      }
    }
    
    console.log(`✅ Created ${viewings.length} viewings\n`);
    return viewings;
  } catch (error) {
    console.error('Error creating viewings:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting data reseeding process...\n');
  
  try {
    // Step 1: Delete all existing data
    await deleteAllData();
    
    // Step 2: Get reference data
    const referenceData = await getReferenceData();
    
    // Step 3: Get agents and team leaders
    const { agents, teamLeaders, allAssignableUsers } = await getAgentsAndTeamLeaders();
    
    if (allAssignableUsers.length === 0) {
      throw new Error('No agents or team leaders available for assignment');
    }
    
    // Step 4: Create random data
    // Adjust counts as needed - more variety
    const propertyCount = randomInt(80, 150);
    const leadCount = randomInt(100, 200);
    const viewingCount = randomInt(40, 80);
    
    // Create leads first (needed for buyer_id in closed properties)
    const leads = await createRandomLeads(leadCount, referenceData, allAssignableUsers);
    const properties = await createRandomProperties(propertyCount, referenceData, allAssignableUsers, leads);
    const viewings = await createRandomViewings(viewingCount, properties, leads, allAssignableUsers);
    
    // Summary
    console.log('📊 Reseeding Summary:');
    console.log(`  ✅ Properties: ${properties.length}`);
    console.log(`  ✅ Leads: ${leads.length}`);
    console.log(`  ✅ Viewings: ${viewings.length}`);
    console.log(`  ✅ Assigned to ${allAssignableUsers.length} agents/team leaders`);
    console.log('\n🎉 Data reseeding completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during reseeding:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

