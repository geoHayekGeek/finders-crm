// add-lebanese-dummy-data.js
// Script to add comprehensive Lebanese dummy data for the CRM system
const pool = require('./config/db');
const bcrypt = require('bcryptjs');
const Property = require('./models/propertyModel');
const Lead = require('./models/leadsModel');
const Viewing = require('./models/viewingModel');
const CalendarEvent = require('./models/calendarEventModel');
const User = require('./models/userModel');

// Lebanese names and locations
const lebaneseNames = {
  male: [
    'Ahmad Khoury', 'Mohammad Saad', 'Hassan Fadel', 'Ali Moussa', 'Karim Nasser',
    'Omar Younes', 'Bilal Hamdan', 'Tarek Jaber', 'Rami El-Hajj', 'Fadi Mansour',
    'Walid Daher', 'Nader Saliba', 'Sami Haddad', 'Ziad Kanaan', 'Rayan Chahine'
  ],
  female: [
    'Layla Khoury', 'Maya Saad', 'Nour Fadel', 'Sara Moussa', 'Rana Nasser',
    'Dina Younes', 'Lina Hamdan', 'Zeina Jaber', 'Mira El-Hajj', 'Rita Mansour',
    'Nadine Daher', 'Mona Saliba', 'Hala Haddad', 'Rania Kanaan', 'Yara Chahine'
  ]
};

const lebaneseLocations = [
  'Beirut, Lebanon', 'Jounieh, Mount Lebanon', 'Zahle, Bekaa Valley', 'Tripoli, North Lebanon',
  'Saida, South Lebanon', 'Byblos, Mount Lebanon', 'Baalbek, Bekaa Valley', 'Tyre, South Lebanon',
  'Hamra, Beirut', 'Achrafieh, Beirut', 'Gemmayze, Beirut', 'Verdun, Beirut',
  'Broumana, Mount Lebanon', 'Faraya, Mount Lebanon', 'Batroun, North Lebanon',
  'Jbeil, Mount Lebanon', 'Zouk Mosbeh, Mount Lebanon', 'Dbayeh, Mount Lebanon'
];

const lebanesePhoneNumbers = [
  '+961 70 123 456', '+961 71 234 567', '+961 76 345 678', '+961 78 456 789',
  '+961 79 567 890', '+961 3 123 456', '+961 1 234 567', '+961 4 345 678',
  '+961 5 456 789', '+961 6 567 890', '+961 7 678 901', '+961 8 789 012'
];

// Helper function to get random element from array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random date in the past N days
function getRandomPastDate(daysAgo = 30) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// Helper function to get random future date in the next N days
function getRandomFutureDate(daysAhead = 30) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return date.toISOString().split('T')[0];
}

// Helper function to get random time
function getRandomTime() {
  const hours = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
  const minutes = Math.floor(Math.random() * 4) * 15; // 00, 15, 30, 45
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

async function cleanupExistingData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🧹 Cleaning up existing dummy data (keeping employees)...\n');
    
    // Delete in reverse order of dependencies
    await client.query('DELETE FROM calendar_events');
    console.log('  ✅ Deleted calendar events');
    
    await client.query('DELETE FROM viewing_updates');
    await client.query('DELETE FROM viewings');
    console.log('  ✅ Deleted viewings');
    
    await client.query('DELETE FROM lead_referrals');
    await client.query('DELETE FROM leads');
    console.log('  ✅ Deleted leads');
    
    await client.query('DELETE FROM referrals');
    await client.query('DELETE FROM properties');
    console.log('  ✅ Deleted properties and referrals');
    
    // Keep employees - don't delete them
    console.log('  ℹ️  Keeping existing employees');
    
    await client.query('COMMIT');
    console.log('✅ Cleanup completed!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function addLebaneseDummyData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting Lebanese dummy data insertion...\n');

    // Get categories and statuses
    const categories = await client.query('SELECT id, name, code FROM categories WHERE is_active = true');
    const statuses = await client.query('SELECT id, name, code FROM statuses WHERE is_active = true');
    
    // Try to get reference sources, but don't fail if table doesn't exist
    let referenceSources = { rows: [] };
    try {
      referenceSources = await client.query('SELECT id, source_name FROM reference_sources LIMIT 10');
    } catch (error) {
      console.log('  ⚠️  Reference sources table not found or empty, continuing without it');
    }
    
    console.log(`📋 Found ${categories.rows.length} categories and ${statuses.rows.length} statuses`);

    // 1. GET EXISTING EMPLOYEES
    console.log('\n👥 Using existing employees...');
    const existingEmployees = await client.query(`
      SELECT id, name, email, role, work_location 
      FROM users 
      WHERE role IN ('agent', 'team_leader', 'operations') 
      AND is_active = true
      ORDER BY role, name
    `);
    
    const employees = existingEmployees.rows;
    console.log(`  ✅ Found ${employees.length} existing employees`);
    console.log(`     - Team Leaders: ${employees.filter(e => e.role === 'team_leader').length}`);
    console.log(`     - Agents: ${employees.filter(e => e.role === 'agent').length}`);
    console.log(`     - Operations: ${employees.filter(e => e.role === 'operations').length}`);
    
    if (employees.length === 0) {
      throw new Error('No employees found! Please create employees first or run the script without keeping existing employees.');
    }
    
    // Get agent and team leader IDs for assignments
    const agentIds = employees.filter(e => e.role === 'agent').map(e => e.id);
    const teamLeaderIds = employees.filter(e => e.role === 'team_leader').map(e => e.id);
    
    // If no agents, use any employee for agent assignments
    if (agentIds.length === 0) {
      console.log('  ⚠️  No agents found, using any available employees for assignments');
      agentIds.push(...employees.map(e => e.id));
    }
    
    // Ensure agents are assigned to team leaders if not already
    if (agentIds.length > 0 && teamLeaderIds.length > 0) {
      for (let i = 0; i < agentIds.length; i++) {
        const teamLeaderId = teamLeaderIds[i % teamLeaderIds.length];
        await client.query(
          `UPDATE users SET is_assigned = true, assigned_to = $1 WHERE id = $2 AND (is_assigned = false OR assigned_to IS NULL)`,
          [teamLeaderId, agentIds[i]]
        );
        await client.query(
          `INSERT INTO team_agents (team_leader_id, agent_id, is_active) VALUES ($1, $2, true)
           ON CONFLICT (team_leader_id, agent_id) DO UPDATE SET is_active = true`,
          [teamLeaderId, agentIds[i]]
        );
      }
      console.log(`  ✅ Ensured agents are assigned to team leaders`);
    }

    // 2. CREATE PROPERTIES
    console.log('\n🏠 Creating properties...');
    const properties = [];
    const propertyTypes = ['sale', 'rent'];
    const viewTypes = ['open view', 'sea view', 'mountain view', 'no view'];
    const categoryCodes = ['A', 'V', 'O', 'ST', 'C', 'R', 'W', 'L', 'D'];
    
    const propertyData = [
      { location: 'Beirut Central District, Lebanon', category: 'A', type: 'sale', price: 450000, surface: 150, building: 'Marina Towers' },
      { location: 'Jounieh, Mount Lebanon', category: 'V', type: 'sale', price: 1200000, surface: 350, building: 'Villa Paradise' },
      { location: 'Hamra, Beirut', category: 'O', type: 'sale', price: 800000, surface: 200, building: 'Business Center Hamra' },
      { location: 'Gemmayze, Beirut', category: 'ST', type: 'rent', price: 1200, surface: 45, building: 'Gemmayze Studios' },
      { location: 'Broumana, Mount Lebanon', category: 'C', type: 'sale', price: 750000, surface: 180, building: 'Mountain Chalet Resort' },
      { location: 'Saida, South Lebanon', category: 'R', type: 'sale', price: 600000, surface: 120, building: 'Saida Seafood Restaurant' },
      { location: 'Achrafieh, Beirut', category: 'A', type: 'rent', price: 2500, surface: 120, building: 'Achrafieh Heights' },
      { location: 'Byblos, Mount Lebanon', category: 'V', type: 'sale', price: 950000, surface: 280, building: 'Byblos Villa' },
      { location: 'Verdun, Beirut', category: 'A', type: 'sale', price: 380000, surface: 110, building: 'Verdun Residences' },
      { location: 'Zahle, Bekaa Valley', category: 'L', type: 'sale', price: 350000, surface: 2500, building: null },
      { location: 'Tripoli, North Lebanon', category: 'W', type: 'sale', price: 950000, surface: 800, building: 'Tripoli Industrial Zone' },
      { location: 'Batroun, North Lebanon', category: 'A', type: 'rent', price: 1800, surface: 85, building: 'Batroun Beach Apartments' },
      { location: 'Faraya, Mount Lebanon', category: 'C', type: 'rent', price: 3000, surface: 150, building: 'Ski Chalet Faraya' },
      { location: 'Dbayeh, Mount Lebanon', category: 'A', type: 'sale', price: 420000, surface: 140, building: 'Dbayeh Towers' },
      { location: 'Jbeil, Mount Lebanon', category: 'D', type: 'sale', price: 680000, surface: 220, building: 'Jbeil Duplex' }
    ];

    for (const prop of propertyData) {
      const category = categories.rows.find(c => c.code === prop.category);
      if (!category) continue;

      const status = getRandomElement(statuses.rows);
      const agent = getRandomElement(agentIds);
      const ownerName = getRandomElement([...lebaneseNames.male, ...lebaneseNames.female]);
      const viewType = getRandomElement(viewTypes);
      
      const details = `Floor: ${Math.floor(Math.random() * 10) + 1}, Balcony: ${Math.random() > 0.3 ? 'Yes' : 'No'}, Parking: ${Math.floor(Math.random() * 3) + 1} spaces, Cave: ${Math.random() > 0.5 ? 'Yes' : 'No'}`;
      const interiorDetails = prop.category === 'A' ? 'Fully furnished with modern appliances' :
                             prop.category === 'V' ? 'Spacious villa with garden and modern amenities' :
                             prop.category === 'O' ? 'Modern office space with meeting rooms' :
                             prop.category === 'ST' ? 'Cozy studio apartment with modern amenities' :
                             prop.category === 'C' ? 'Charming chalet with fireplace and wooden interior' :
                             prop.category === 'R' ? 'Fully equipped restaurant kitchen with dining area' :
                             prop.category === 'W' ? 'Large warehouse space with loading docks' :
                             prop.category === 'L' ? 'Agricultural land suitable for farming' :
                             'Modern interior with quality finishes';

      // Generate reference number
      const refNumber = await client.query(
        'SELECT generate_reference_number($1, $2)',
        [category.code, prop.type]
      );

      const result = await client.query(
        `INSERT INTO properties (
          reference_number, status_id, property_type, location, category_id, building_name,
          owner_name, phone_number, surface, details, interior_details,
          built_year, view_type, concierge, agent_id, price, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, reference_number, location`,
        [
          refNumber.rows[0].generate_reference_number,
          status.id,
          prop.type,
          prop.location,
          category.id,
          prop.building,
          ownerName,
          getRandomElement(lebanesePhoneNumbers),
          prop.surface,
          details,
          interiorDetails,
          Math.floor(Math.random() * 10) + 2015, // 2015-2025
          viewType,
          Math.random() > 0.6,
          agent,
          prop.price,
          `Beautiful property in ${prop.location}`
        ]
      );
      properties.push(result.rows[0]);
      console.log(`  ✅ Created property: ${result.rows[0].reference_number} - ${result.rows[0].location}`);
    }

    // 3. CREATE REFERRALS (mix of internal and external)
    console.log('\n📞 Creating referrals...');
    const referralCount = Math.floor(properties.length * 0.7); // 70% of properties have referrals
    
    for (let i = 0; i < referralCount; i++) {
      const property = properties[i];
      const numReferrals = Math.floor(Math.random() * 2) + 1; // 1-2 referrals per property
      
      for (let j = 0; j < numReferrals; j++) {
        const isExternal = Math.random() > 0.5; // 50% external, 50% internal
        
        if (isExternal) {
          // External referral
          const externalName = getRandomElement([
            'Lebanon Real Estate Agency', 'Beirut Properties', 'Mount Lebanon Realty',
            'Coastal Properties Lebanon', 'Premium Real Estate Services', 'Elite Property Group'
          ]);
          
          await client.query(
            `INSERT INTO referrals (property_id, name, type, date, external)
             VALUES ($1, $2, 'custom', $3, true)`,
            [property.id, externalName, getRandomPastDate(60)]
          );
        } else {
          // Internal referral (employee)
          const employee = getRandomElement(employees.filter(e => ['agent', 'team_leader'].includes(e.role)));
          
          await client.query(
            `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
             VALUES ($1, $2, 'employee', $3, $4, false)`,
            [property.id, employee.name, employee.id, getRandomPastDate(60)]
          );
        }
      }
    }
    console.log(`  ✅ Created referrals for ${referralCount} properties`);

    // 4. CREATE LEADS
    console.log('\n👤 Creating leads...');
    const leads = [];
    const operationsIds = employees.filter(e => e.role === 'operations').map(e => e.id);
    
    // If no operations users exist, use any available employee or throw error
    if (operationsIds.length === 0) {
      console.log('  ⚠️  No operations users found, using any available employee');
      // Use any employee if no operations user exists
      if (employees.length > 0) {
        operationsIds.push(employees[0].id);
      } else {
        throw new Error('No employees found to assign as operations user for leads!');
      }
    }
    
    for (let i = 0; i < 25; i++) {
      const customerName = getRandomElement([...lebaneseNames.male, ...lebaneseNames.female]);
      const agent = getRandomElement(agentIds);
      const operations = getRandomElement(operationsIds);
      const referenceSource = referenceSources.rows.length > 0 ? getRandomElement(referenceSources.rows).id : null;
      const contactSource = getRandomElement(['call', 'unknown']); // Only valid values
      
      const result = await client.query(
        `INSERT INTO leads (date, customer_name, phone_number, agent_id, agent_name, operations_id, reference_source_id, contact_source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, customer_name`,
        [
          getRandomPastDate(90),
          customerName,
          getRandomElement(lebanesePhoneNumbers),
          agent,
          employees.find(e => e.id === agent)?.name || 'Unknown',
          operations,
          referenceSource,
          contactSource,
          getRandomElement(['active', 'contacted', 'qualified', 'converted', 'closed'])
        ]
      );
      leads.push(result.rows[0]);
      console.log(`  ✅ Created lead: ${result.rows[0].customer_name}`);
    }

    // 5. CREATE VIEWINGS
    console.log('\n👁️  Creating viewings...');
    const viewingStatuses = ['Scheduled', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'];
    
    for (let i = 0; i < 20; i++) {
      const property = getRandomElement(properties);
      const lead = getRandomElement(leads);
      const agent = getRandomElement(agentIds);
      const viewingDate = getRandomFutureDate(30);
      const viewingTime = getRandomTime();
      const status = getRandomElement(viewingStatuses);
      
      await client.query(
        `INSERT INTO viewings (property_id, lead_id, agent_id, viewing_date, viewing_time, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          property.id,
          lead.id,
          agent,
          viewingDate,
          viewingTime,
          status,
          `Viewing scheduled for ${property.reference_number} with ${lead.customer_name}`
        ]
      );
    }
    console.log(`  ✅ Created 20 viewings`);

    // 6. CREATE CALENDAR EVENTS
    console.log('\n📅 Creating calendar events...');
    const eventTypes = ['viewing', 'meeting', 'follow-up', 'property_visit', 'client_meeting', 'other'];
    const eventColors = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'];
    
    // Create events for viewings
    const viewings = await client.query('SELECT * FROM viewings LIMIT 10');
    for (const viewing of viewings.rows) {
      const property = properties.find(p => p.id === viewing.property_id);
      const lead = leads.find(l => l.id === viewing.lead_id);
      
      // Parse dates properly - viewing_date is a Date object, viewing_time is a string
      const viewingDate = viewing.viewing_date instanceof Date 
        ? viewing.viewing_date.toISOString().split('T')[0]
        : viewing.viewing_date;
      const viewingTime = viewing.viewing_time || '10:00:00';
      
      const startTime = new Date(`${viewingDate}T${viewingTime}`);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);
      
      await client.query(
        `INSERT INTO calendar_events (title, description, start_time, end_time, all_day, color, type, location, created_by, assigned_to, property_id, lead_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          `Viewing: ${property?.reference_number || 'Property'}`,
          `Property viewing with ${lead?.customer_name || 'client'}`,
          startTime.toISOString(),
          endTime.toISOString(),
          false,
          'blue',
          'viewing',
          property?.location || 'Location TBD',
          viewing.agent_id,
          viewing.agent_id,
          viewing.property_id,
          viewing.lead_id
        ]
      );
    }

    // Create other calendar events
    for (let i = 0; i < 15; i++) {
      const eventDate = getRandomFutureDate(60);
      const startHour = Math.floor(Math.random() * 8) + 9;
      const startTime = new Date(eventDate);
      startTime.setHours(startHour, Math.floor(Math.random() * 4) * 15, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(Math.random() * 3) + 1);
      
      const eventType = getRandomElement(eventTypes);
      const assignedUser = getRandomElement(employees.map(e => e.id));
      const createdBy = getRandomElement(employees.map(e => e.id));
      
      const titles = {
        'meeting': 'Team Meeting',
        'follow-up': 'Client Follow-up',
        'property_visit': 'Property Visit',
        'client_meeting': 'Client Meeting',
        'viewing': 'Property Viewing',
        'other': 'General Event'
      };
      
      await client.query(
        `INSERT INTO calendar_events (title, description, start_time, end_time, all_day, color, type, location, created_by, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          titles[eventType] || 'Event',
          `Scheduled ${eventType} event`,
          startTime.toISOString(),
          endTime.toISOString(),
          false,
          getRandomElement(eventColors),
          eventType,
          getRandomElement(lebaneseLocations),
          createdBy,
          assignedUser
        ]
      );
    }
    console.log(`  ✅ Created calendar events`);

    // 7. ADD OCTOBER DATA FOR REPORTS (Listings, Closures, Leads)
    console.log('\n📅 Adding October data for reports...');
    
    // Get October dates (2024 or current year)
    const currentYear = new Date().getFullYear();
    const octoberStart = `${currentYear}-10-01`;
    const octoberEnd = `${currentYear}-10-31`;
    
    // Helper to get random October date
    function getRandomOctoberDate() {
      const day = Math.floor(Math.random() * 31) + 1;
      return `${currentYear}-10-${day.toString().padStart(2, '0')}`;
    }
    
    // Create October listings (properties) - at least 2-3 per agent
    console.log('  📋 Creating October listings...');
    const octoberListings = [];
    const listingCountPerAgent = 3;
    
    for (const agent of employees.filter(e => e.role === 'agent')) {
      for (let i = 0; i < listingCountPerAgent; i++) {
        const category = getRandomElement(categories.rows);
        const status = statuses.rows.find(s => s.code === 'active') || statuses.rows[0];
        const propertyType = getRandomElement(['sale', 'rent']);
        const ownerName = getRandomElement([...lebaneseNames.male, ...lebaneseNames.female]);
        const viewType = getRandomElement(['open view', 'sea view', 'mountain view', 'no view']);
        
        const surface = Math.floor(Math.random() * 200) + 50; // 50-250 sqm
        const price = propertyType === 'rent' 
          ? Math.floor(Math.random() * 2000) + 500 // 500-2500 for rent
          : Math.floor(Math.random() * 800000) + 200000; // 200k-1M for sale
        
        const details = `Floor: ${Math.floor(Math.random() * 10) + 1}, Balcony: ${Math.random() > 0.3 ? 'Yes' : 'No'}, Parking: ${Math.floor(Math.random() * 3) + 1} spaces, Cave: ${Math.random() > 0.5 ? 'Yes' : 'No'}`;
        const interiorDetails = category.code === 'A' ? 'Fully furnished with modern appliances' :
                               category.code === 'V' ? 'Spacious villa with garden and modern amenities' :
                               category.code === 'O' ? 'Modern office space with meeting rooms' :
                               'Modern interior with quality finishes';

        // Generate reference number
        const refNumber = await client.query(
          'SELECT generate_reference_number($1, $2)',
          [category.code, propertyType === 'rent' ? 'R' : 'S']
        );

        const octoberDate = getRandomOctoberDate();
        const result = await client.query(
          `INSERT INTO properties (
            reference_number, status_id, property_type, location, category_id, building_name,
            owner_name, phone_number, surface, details, interior_details,
            built_year, view_type, concierge, agent_id, price, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id, reference_number`,
          [
            refNumber.rows[0].generate_reference_number,
            status.id,
            propertyType,
            getRandomElement(lebaneseLocations),
            category.id,
            `Building ${Math.floor(Math.random() * 100)}`,
            ownerName,
            getRandomElement(lebanesePhoneNumbers),
            surface,
            details,
            interiorDetails,
            Math.floor(Math.random() * 10) + 2015,
            viewType,
            Math.random() > 0.6,
            agent.id,
            price,
            `October listing - ${propertyType}`,
            new Date(octoberDate + 'T10:00:00').toISOString()
          ]
        );
        octoberListings.push(result.rows[0]);
      }
    }
    console.log(`  ✅ Created ${octoberListings.length} October listings`);

    // Create October closures (sold/rented properties) - at least 1-2 per agent
    console.log('  🏁 Creating October closures...');
    // Get all statuses including inactive ones for closures
    const allStatuses = await client.query('SELECT id, name, code FROM statuses');
    const soldStatus = allStatuses.rows.find(s => s.code === 'sold' || s.name.toLowerCase() === 'sold');
    const rentedStatus = allStatuses.rows.find(s => s.code === 'rented' || s.name.toLowerCase() === 'rented');
    const closedStatuses = [soldStatus, rentedStatus].filter(s => s);
    let octoberClosures = [];
    
    if (closedStatuses.length > 0) {
      const closureCountPerAgent = 2;
      
      for (const agent of employees.filter(e => e.role === 'agent')) {
        for (let i = 0; i < closureCountPerAgent; i++) {
          const category = getRandomElement(categories.rows);
          const status = getRandomElement(closedStatuses);
          const propertyType = status.code === 'rented' ? 'rent' : 'sale';
          const ownerName = getRandomElement([...lebaneseNames.male, ...lebaneseNames.female]);
          const viewType = getRandomElement(['open view', 'sea view', 'mountain view', 'no view']);
          
          const surface = Math.floor(Math.random() * 200) + 50;
          const price = propertyType === 'rent' 
            ? Math.floor(Math.random() * 2000) + 500
            : Math.floor(Math.random() * 800000) + 200000;
          
          const details = `Floor: ${Math.floor(Math.random() * 10) + 1}, Balcony: ${Math.random() > 0.3 ? 'Yes' : 'No'}, Parking: ${Math.floor(Math.random() * 3) + 1} spaces, Cave: ${Math.random() > 0.5 ? 'Yes' : 'No'}`;
          const interiorDetails = 'Modern interior with quality finishes';
          const octoberDate = getRandomOctoberDate();
          const closedDate = octoberDate; // Closed in October

          // Generate reference number
          const refNumber = await client.query(
            'SELECT generate_reference_number($1, $2)',
            [category.code, propertyType === 'rent' ? 'R' : 'S']
          );

          const result = await client.query(
            `INSERT INTO properties (
              reference_number, status_id, property_type, location, category_id, building_name,
              owner_name, phone_number, surface, details, interior_details,
              built_year, view_type, concierge, agent_id, price, notes, created_at, closed_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING id, reference_number`,
            [
              refNumber.rows[0].generate_reference_number,
              status.id,
              propertyType,
              getRandomElement(lebaneseLocations),
              category.id,
              `Building ${Math.floor(Math.random() * 100)}`,
              ownerName,
              getRandomElement(lebanesePhoneNumbers),
              surface,
              details,
              interiorDetails,
              Math.floor(Math.random() * 10) + 2015,
              viewType,
              Math.random() > 0.6,
              agent.id,
              price,
              `October closure - ${status.code}`,
              new Date(octoberDate + 'T10:00:00').toISOString(),
              closedDate
            ]
          );
          octoberClosures.push(result.rows[0]);
        }
      }
      console.log(`  ✅ Created ${octoberClosures.length} October closures`);
      
      // Add MORE October closures with internal referrals (3-4 per agent)
      console.log('  🏁 Creating additional October closures with internal referrals...');
      const additionalClosuresPerAgent = 3;
      const additionalClosures = [];
      
      for (const agent of employees.filter(e => e.role === 'agent')) {
        for (let i = 0; i < additionalClosuresPerAgent; i++) {
          const category = getRandomElement(categories.rows);
          const status = getRandomElement(closedStatuses);
          const propertyType = status.code === 'rented' ? 'rent' : 'sale';
          const ownerName = getRandomElement([...lebaneseNames.male, ...lebaneseNames.female]);
          const viewType = getRandomElement(['open view', 'sea view', 'mountain view', 'no view']);
          
          const surface = Math.floor(Math.random() * 200) + 50;
          const price = propertyType === 'rent' 
            ? Math.floor(Math.random() * 2000) + 500
            : Math.floor(Math.random() * 800000) + 200000;
          
          const details = `Floor: ${Math.floor(Math.random() * 10) + 1}, Balcony: ${Math.random() > 0.3 ? 'Yes' : 'No'}, Parking: ${Math.floor(Math.random() * 3) + 1} spaces, Cave: ${Math.random() > 0.5 ? 'Yes' : 'No'}`;
          const interiorDetails = 'Modern interior with quality finishes';
          const octoberDate = getRandomOctoberDate();
          const closedDate = octoberDate;

          // Generate reference number
          const refNumber = await client.query(
            'SELECT generate_reference_number($1, $2)',
            [category.code, propertyType === 'rent' ? 'R' : 'S']
          );

          const result = await client.query(
            `INSERT INTO properties (
              reference_number, status_id, property_type, location, category_id, building_name,
              owner_name, phone_number, surface, details, interior_details,
              built_year, view_type, concierge, agent_id, price, notes, created_at, closed_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING id, reference_number`,
            [
              refNumber.rows[0].generate_reference_number,
              status.id,
              propertyType,
              getRandomElement(lebaneseLocations),
              category.id,
              `Building ${Math.floor(Math.random() * 100)}`,
              ownerName,
              getRandomElement(lebanesePhoneNumbers),
              surface,
              details,
              interiorDetails,
              Math.floor(Math.random() * 10) + 2015,
              viewType,
              Math.random() > 0.6,
              agent.id,
              price,
              `October closure with internal referral - ${status.code}`,
              new Date(octoberDate + 'T10:00:00').toISOString(),
              closedDate
            ]
          );
          additionalClosures.push(result.rows[0]);
          
          // Add internal referrals (1-2 per property)
          const numReferrals = Math.floor(Math.random() * 2) + 1; // 1-2 referrals
          for (let j = 0; j < numReferrals; j++) {
            // Pick a random employee (agent or team leader) as the referrer
            const referrerEmployee = getRandomElement(employees.filter(e => ['agent', 'team_leader'].includes(e.role)));
            const referralDate = getRandomOctoberDate();
            
            await client.query(
              `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
               VALUES ($1, $2, 'employee', $3, $4, false)`,
              [result.rows[0].id, referrerEmployee.name, referrerEmployee.id, referralDate]
            );
          }
        }
      }
      console.log(`  ✅ Created ${additionalClosures.length} additional October closures with internal referrals`);
      octoberClosures = [...octoberClosures, ...additionalClosures];
    } else {
      console.log('  ⚠️  No sold/rented statuses found, skipping closures');
    }

    // Create October leads - at least 3-5 per agent
    console.log('  👤 Creating October leads...');
    const octoberLeads = [];
    const leadsPerAgent = 4;
    
    for (const agent of employees.filter(e => e.role === 'agent')) {
      for (let i = 0; i < leadsPerAgent; i++) {
        const customerName = getRandomElement([...lebaneseNames.male, ...lebaneseNames.female]);
        const operations = getRandomElement(operationsIds);
        const referenceSource = referenceSources.rows.length > 0 ? getRandomElement(referenceSources.rows).id : null;
        const contactSource = getRandomElement(['call', 'unknown']);
        const octoberDate = getRandomOctoberDate();
        
        const result = await client.query(
          `INSERT INTO leads (date, customer_name, phone_number, agent_id, agent_name, operations_id, reference_source_id, contact_source, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, customer_name`,
          [
            octoberDate,
            customerName,
            getRandomElement(lebanesePhoneNumbers),
            agent.id,
            agent.name,
            operations,
            referenceSource,
            contactSource,
            getRandomElement(['active', 'contacted', 'qualified', 'converted', 'closed']),
            new Date(octoberDate + 'T10:00:00').toISOString()
          ]
        );
        octoberLeads.push(result.rows[0]);
      }
    }
    console.log(`  ✅ Created ${octoberLeads.length} October leads`);

    await client.query('COMMIT');
    console.log('\n✅ Successfully added all Lebanese dummy data!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Employees used: ${employees.length} (existing)`);
    console.log(`   - Properties: ${properties.length}`);
    console.log(`   - October Listings: ${octoberListings.length}`);
    console.log(`   - October Closures: ${closedStatuses.length > 0 ? octoberClosures.length : 0}`);
    console.log(`   - Leads: ${leads.length}`);
    console.log(`   - October Leads: ${octoberLeads.length}`);
    console.log(`   - Viewings: 20`);
    console.log(`   - Calendar Events: ${viewings.rows.length + 15}`);
    console.log(`   - Referrals: ${referralCount} properties with referrals`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding dummy data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
async function run() {
  try {
    // First cleanup existing data
    await cleanupExistingData();
    
    // Then add new data
    await addLebaneseDummyData();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

run();

