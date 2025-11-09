// Comprehensive seed script to create test data for reports
const pool = require('./config/db');
const Property = require('./models/propertyModel');
const Lead = require('./models/leadsModel');

// Random helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];
const randomBool = () => Math.random() > 0.5;

// Names for random data
const firstNames = ['John', 'Jane', 'Ahmed', 'Sarah', 'Mohammed', 'Layla', 'David', 'Maria', 'Omar', 'Fatima', 'James', 'Sophia', 'Ali', 'Emma', 'Hassan', 'Olivia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'];
const locations = [
  'Beirut Downtown', 'Hamra', 'Achrafieh', 'Badaro', 'Verdun', 'Mar Mikhael', 'Gemmayze', 'Saifi Village',
  'Raouche', 'Zaitunay Bay', 'ABC Achrafieh', 'Dora', 'Hazmieh', 'Baabda', 'Sin El Fil', 'Furn El Chebbak'
];
const buildingNames = [
  'Sky Tower', 'Ocean View', 'Mountain Heights', 'Beirut Plaza', 'City Center', 'Grand Residence', 
  'Luxury Apartments', 'Modern Complex', 'Royal Building', 'Elite Tower', 'Prestige Residences', 
  'Paradise View', 'Sunset Heights', 'Golden Tower', 'Platinum Complex'
];
const viewTypes = ['open view', 'sea view', 'mountain view', 'no view'];
const propertyTypes = ['sale', 'rent'];
const leadSources = ['Dubizzle', 'Facebook', 'Instagram', 'Website', 'TikTok', 'External'];

// Date helper
const randomDate = (start, end) => {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
};

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🗑️  Starting database cleanup...');
    
    // Ensure external column exists in referrals table
    try {
      await client.query(`
        ALTER TABLE referrals 
        ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL
      `);
      console.log('✅ Verified external column in referrals table');
    } catch (error) {
      // Column might already exist, continue
    }

    // Delete in correct order (respecting foreign keys)
    await client.query('DELETE FROM viewing_updates');
    await client.query('DELETE FROM viewings');
    await client.query('DELETE FROM referrals');
    await client.query('DELETE FROM lead_referrals');
    await client.query('DELETE FROM monthly_agent_reports');
    await client.query('DELETE FROM properties');
    await client.query('DELETE FROM leads');
    
    console.log('✅ Cleanup complete');

    // Get statuses
    const statusResult = await client.query("SELECT id, code, name FROM statuses WHERE is_active = true");
    const statuses = statusResult.rows;
    const activeStatus = statuses.find(s => 
      s.code === 'active' || s.code === 'ACTIVE' || s.name.toLowerCase() === 'active'
    ) || statuses.find(s => s.code !== 'closed' && s.code !== 'CLOSED');
    const closedStatus = statuses.find(s => 
      s.code === 'closed' || s.code === 'CLOSED' || s.name.toLowerCase() === 'closed' ||
      s.code === 'sold' || s.code === 'SOLD' || s.name.toLowerCase() === 'sold' ||
      s.code === 'rented' || s.code === 'RENTED' || s.name.toLowerCase() === 'rented'
    ) || statuses.find(s => s.id === 30); // Fallback to id 30 if exists
    
    if (!activeStatus) {
      throw new Error('No active status found. Please create statuses first.');
    }
    
    console.log(`📊 Using statuses: Active=${activeStatus.id} (${activeStatus.code || activeStatus.name}), Closed=${closedStatus ? closedStatus.id : 'NOT FOUND'} (${closedStatus ? (closedStatus.code || closedStatus.name) : 'N/A'})`);
    
    // Get categories
    const categoryResult = await client.query("SELECT id, code FROM categories WHERE is_active = true");
    const categories = categoryResult.rows;
    
    // Get agents
    const agentResult = await client.query("SELECT id, name FROM users WHERE role IN ('agent', 'team_leader')");
    const agents = agentResult.rows;
    
    // Get reference sources
    const sourceResult = await client.query("SELECT id, source_name FROM reference_sources");
    const sources = sourceResult.rows;
    
    if (agents.length === 0) {
      throw new Error('No agents found. Please create agents first.');
    }

    console.log(`\n📊 Found ${agents.length} agents, ${categories.length} categories, ${statuses.length} statuses`);

    // Create dates for the past year
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    // Find Ahmad Al Masri for special October data
    const ahmadAlMasri = agents.find(a => 
      a.name.toLowerCase().includes('ahmad') || 
      a.name.toLowerCase().includes('masri') ||
      a.name.toLowerCase().includes('masery')
    ) || agents[0];
    
    console.log(`\n👤 Found agent for special October data: ${ahmadAlMasri.name} (ID: ${ahmadAlMasri.id})`);

    // CREATE LEADS (150 leads)
    console.log('\n👥 Creating 150 leads...');
    const leads = [];
    
    // Create 15 leads for Ahmad Al Masri in October
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    console.log(`  🎯 Creating 15 October leads for ${ahmadAlMasri.name}...`);
    for (let i = 0; i < 15; i++) {
      const date = randomDate(currentMonthStart, currentMonthEnd);
      const source = randomChoice(sources);
      const price = randomInt(50000, 2000000);

      const leadData = {
        date: formatDate(date),
        customer_name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
        phone_number: `+961 ${randomInt(3, 9)}${randomInt(100000, 999999)}`,
        agent_id: ahmadAlMasri.id,
        agent_name: ahmadAlMasri.name,
        reference_source_id: source.id,
        price: price,
        notes: `Lead generated on ${formatDate(date)}`,
        status: randomChoice(['Active', 'Contacted', 'Follow-up', 'Converted', 'Lost'])
      };

      try {
        const lead = await Lead.createLead(leadData);
        leads.push(lead);
      } catch (error) {
        console.error(`Error creating lead ${i + 1}:`, error.message);
      }
    }
    console.log(`  ✓ Created ${leads.length} October leads for ${ahmadAlMasri.name}`);
    
    // Create remaining leads with random dates
    for (let i = leads.length; i < 150; i++) {
      const agent = randomChoice(agents);
      const date = randomDate(oneYearAgo, now);
      const source = randomChoice(sources);
      const price = randomInt(50000, 2000000);

      const leadData = {
        date: formatDate(date),
        customer_name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
        phone_number: `+961 ${randomInt(3, 9)}${randomInt(100000, 999999)}`,
        agent_id: agent.id,
        agent_name: agent.name,
        reference_source_id: source.id,
        price: price,
        notes: `Lead generated on ${formatDate(date)}`,
        status: randomChoice(['Active', 'Contacted', 'Follow-up', 'Converted', 'Lost'])
      };

      try {
        const lead = await Lead.createLead(leadData);
        leads.push(lead);
        if ((i + 1) % 25 === 0) {
          console.log(`  ✓ Created ${i + 1} total leads`);
        }
      } catch (error) {
        console.error(`Error creating lead ${i + 1}:`, error.message);
      }
    }
    console.log(`✅ Created ${leads.length} leads`);

    // CREATE LEAD REFERRALS
    console.log('\n🔗 Creating lead referrals...');
    let leadReferralCount = 0;
    
    // Add referrals to 40% of leads
    for (const lead of leads) {
      if (Math.random() < 0.4) {
        // Ensure lead_referrals external column exists
        try {
          await client.query(`
            ALTER TABLE lead_referrals 
            ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL
          `);
        } catch (error) {
          // Column might already exist, continue
        }
        
        // Get agents who are not the lead's assigned agent
        const otherAgents = agents.filter(a => a.id !== lead.agent_id);
        if (otherAgents.length === 0) continue;
        
        // First referral - always internal
        const firstReferralAgent = randomChoice(otherAgents);
        const leadCreatedDate = new Date(lead.created_at || lead.date);
        const firstReferralDate = new Date(leadCreatedDate.getTime() - randomInt(1, 10) * 24 * 60 * 60 * 1000);
        
        await client.query(
          `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lead.id, firstReferralAgent.id, firstReferralAgent.name, 'employee', firstReferralDate, false]
        );
        leadReferralCount++;
        
        // 40% chance of second referral
        if (Math.random() < 0.4) {
          const secondReferralAgent = randomChoice(otherAgents);
          const secondReferralDate = new Date(firstReferralDate.getTime() + randomInt(5, 60) * 24 * 60 * 60 * 1000);
          
          // Determine if external based on the 30-day rule
          // External if: same agent as first referral, OR 30+ days after first referral
          const daysDiff = (secondReferralDate - firstReferralDate) / (1000 * 60 * 60 * 24);
          const isExternal = secondReferralAgent.id === firstReferralAgent.id || daysDiff >= 30;
          
          await client.query(
            `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [lead.id, secondReferralAgent.id, secondReferralAgent.name, 'employee', secondReferralDate, isExternal]
          );
          leadReferralCount++;
        }
      }
    }
    
    console.log(`✅ Created ${leadReferralCount} lead referrals`);

    // CREATE PROPERTIES (200 properties total)
    console.log('\n🏠 Creating 200 properties...');
    const properties = [];
    
    console.log(`  📅 Creating properties for ${currentMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}...`);
    
    // Create 10 properties for Ahmad Al Masri in October with half being closed
    console.log(`  🎯 Creating 10 October properties for ${ahmadAlMasri.name} (half will be closed)...`);
    for (let i = 0; i < 10; i++) {
      const category = randomChoice(categories);
      const propertyType = randomChoice(propertyTypes);
      // Random date in October
      const createdDate = randomDate(currentMonthStart, currentMonthEnd);
      
      // Alternate between closed and active, with slight randomness
      const isClosed = i % 2 === 0 || Math.random() < 0.3; // 50%+ closed
      let status = activeStatus;
      let closedDate = null;
      
      if (isClosed && closedStatus) {
        status = closedStatus;
        // Closed date should be after creation date, within October
        const daysAfterCreation = randomInt(1, Math.min(15, Math.floor((currentMonthEnd - createdDate) / (1000 * 60 * 60 * 24))));
        const closedAfterCreated = new Date(createdDate);
        closedAfterCreated.setDate(closedAfterCreated.getDate() + daysAfterCreation);
        
        // Make sure closed date is in October and before today
        if (closedAfterCreated <= now && closedAfterCreated >= currentMonthStart && closedAfterCreated <= currentMonthEnd) {
          closedDate = formatDate(closedAfterCreated);
        } else if (closedAfterCreated > now && closedAfterCreated <= currentMonthEnd) {
          // If in future but still in October, set to today or yesterday
          closedDate = formatDate(new Date(Math.min(now, currentMonthEnd)));
        } else {
          // Fallback: if date calculation fails, use created date + 7 days or end of month (whichever is earlier)
          const fallbackDate = new Date(createdDate);
          fallbackDate.setDate(fallbackDate.getDate() + 7);
          closedDate = formatDate(new Date(Math.min(fallbackDate, currentMonthEnd, now)));
        }
      }

      const surface = randomFloat(80, 400);
      const pricePerSqm = propertyType === 'sale' ? randomFloat(2000, 4500) : randomFloat(10, 20);
      const price = Math.round(surface * pricePerSqm);

      // 60% chance to link to an existing lead as owner
      let ownerId = null;
      let ownerName = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
      let ownerPhone = `+961 ${randomInt(3, 9)}${randomInt(100000, 999999)}`;
      
      if (leads.length > 0 && Math.random() < 0.6) {
        const ownerLead = randomChoice(leads);
        ownerId = ownerLead.id;
        ownerName = ownerLead.customer_name;
        ownerPhone = ownerLead.phone_number;
      }

      const propertyData = {
        status_id: status.id,
        property_type: propertyType,
        location: randomChoice(locations),
        category_id: category.id,
        building_name: randomBool() ? randomChoice(buildingNames) : null,
        owner_id: ownerId,
        owner_name: ownerName,
        phone_number: ownerPhone,
        surface: Math.round(surface * 100) / 100,
        details: `Floor ${randomInt(0, 15)}, ${randomBool() ? 'with' : 'without'} balcony, ${randomInt(0, 3)} parking spaces, ${randomBool() ? 'with' : 'without'} cave`,
        interior_details: randomChoice([
          'Fully furnished modern apartment',
          'Semi-furnished with high-end finishes',
          'Unfurnished, ready for customization',
          'Luxury interior with premium materials',
          'Renovated with contemporary design'
        ]),
        built_year: randomInt(1990, 2024),
        view_type: randomChoice(viewTypes),
        concierge: randomBool(),
        agent_id: ahmadAlMasri.id,
        price: price,
        notes: `${propertyType === 'sale' ? 'Sale' : 'Rental'} property - ${isClosed ? 'CLOSED' : 'ACTIVE'}`,
        referrals: []
      };

      try {
        const property = await Property.createProperty(propertyData);
        
        await client.query(
          `UPDATE properties 
           SET created_at = $1, closed_date = $2 
           WHERE id = $3`,
          [createdDate, closedDate, property.id]
        );
        
        // Add referrals AFTER property is created
        // For Ahmad's closed properties, ensure they have referrals for commission calculation
        const shouldHaveReferrals = isClosed || Math.random() < 0.4;
        
        if (shouldHaveReferrals) {
          const referralAgent = randomChoice(agents);
          const firstReferralDate = randomDate(createdDate, closedDate ? new Date(closedDate) : currentMonthEnd);
          
          // First referral (always internal)
          await client.query(
            `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
             VALUES ($1, $2, $3, $4, $5, FALSE)`,
            [property.id, referralAgent.name, 'employee', referralAgent.id, formatDate(firstReferralDate)]
          );
          
          // 40% chance of having a second referral (which might be external)
          if (Math.random() < 0.4) {
            const secondReferralDate = randomDate(
              firstReferralDate, 
              closedDate ? new Date(closedDate) : currentMonthEnd
            );
            
            // Calculate if second referral should be external:
            // 1. If same agent refers twice (even within month) - external
            // 2. If second referral is > 1 month after first - external
            const daysBetween = Math.floor((secondReferralDate - firstReferralDate) / (1000 * 60 * 60 * 24));
            const isExternal = (referralAgent.id === propertyData.agent_id) || (daysBetween >= 30);
            
            // Use same agent or different agent
            const secondReferralAgent = (Math.random() < 0.5 && !isExternal) ? referralAgent : randomChoice(agents.filter(a => a.id !== referralAgent.id));
            
            await client.query(
              `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                property.id, 
                secondReferralAgent.name, 
                'employee', 
                secondReferralAgent.id, 
                formatDate(secondReferralDate),
                isExternal || (secondReferralAgent.id === propertyData.agent_id) // Also external if referring agent is the property owner
              ]
            );
            
            // Update referrals count
            await client.query(
              `UPDATE properties SET referrals_count = 2 WHERE id = $1`,
              [property.id]
            );
            
            console.log(`    ✓ Added 2 referrals (${isExternal ? '1 external' : 'both internal'})`);
          } else {
            // Update referrals count for single referral
            await client.query(
              `UPDATE properties SET referrals_count = 1 WHERE id = $1`,
              [property.id]
            );
            console.log(`    ✓ Added 1 referral`);
          }
        }
        
        properties.push({ ...property, closed_date: closedDate });
        console.log(`    ✓ Created property ${i + 1}: ${isClosed ? 'CLOSED' : 'ACTIVE'}, price: $${price.toLocaleString()}, closed_date: ${closedDate || 'N/A'}`);
      } catch (error) {
        console.error(`Error creating property ${i + 1}:`, error.message);
      }
    }
    
    // Then create properties for all agents in current month
    console.log('  📅 Creating current month properties for all other agents...');
    for (let i = 0; i < (agents.length - 1) * 2; i++) { // 2 properties per other agent
      const agent = agents[(i % (agents.length - 1)) + (agents.indexOf(ahmadAlMasri) >= 0 && (i % (agents.length - 1)) >= agents.indexOf(ahmadAlMasri) ? 1 : 0)];
      if (agent.id === ahmadAlMasri.id) continue; // Skip Ahmad, already done
      
      const category = randomChoice(categories);
      const propertyType = randomChoice(propertyTypes);
      const createdDate = randomDate(currentMonthStart, currentMonthEnd);
      
      // 30% chance of being closed
      const isClosed = Math.random() < 0.3;
      let status = activeStatus;
      let closedDate = null;
      
      if (isClosed && closedStatus) {
        status = closedStatus;
        const closedAfterCreated = new Date(createdDate);
        closedAfterCreated.setDate(closedAfterCreated.getDate() + randomInt(1, Math.min(15, Math.floor((currentMonthEnd - createdDate) / (1000 * 60 * 60 * 24)))));
        if (closedAfterCreated <= now && closedAfterCreated <= currentMonthEnd) {
          closedDate = formatDate(closedAfterCreated);
        } else {
          // Fallback: ensure closed properties always have a closed_date
          const fallbackDate = new Date(Math.min(createdDate.getTime() + (7 * 24 * 60 * 60 * 1000), currentMonthEnd, now));
          closedDate = formatDate(fallbackDate);
        }
      }
      
      // Ensure status is defined
      if (!status || !status.id) {
        status = activeStatus;
      }

      const surface = randomFloat(50, 500);
      const pricePerSqm = propertyType === 'sale' ? randomFloat(1500, 5000) : randomFloat(8, 25);
      const price = Math.round(surface * pricePerSqm);

      // 60% chance to link to an existing lead as owner
      let ownerId = null;
      let ownerName = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
      let ownerPhone = `+961 ${randomInt(3, 9)}${randomInt(100000, 999999)}`;
      
      if (leads.length > 0 && Math.random() < 0.6) {
        const ownerLead = randomChoice(leads);
        ownerId = ownerLead.id;
        ownerName = ownerLead.customer_name;
        ownerPhone = ownerLead.phone_number;
      }

      const propertyData = {
        status_id: status.id,
        property_type: propertyType,
        location: randomChoice(locations),
        category_id: category.id,
        building_name: randomBool() ? randomChoice(buildingNames) : null,
        owner_id: ownerId,
        owner_name: ownerName,
        phone_number: ownerPhone,
        surface: Math.round(surface * 100) / 100,
        details: `Floor ${randomInt(0, 15)}, ${randomBool() ? 'with' : 'without'} balcony, ${randomInt(0, 3)} parking spaces, ${randomBool() ? 'with' : 'without'} cave`,
        interior_details: randomChoice([
          'Fully furnished modern apartment',
          'Semi-furnished with high-end finishes',
          'Unfurnished, ready for customization',
          'Luxury interior with premium materials',
          'Renovated with contemporary design'
        ]),
        built_year: randomInt(1990, 2024),
        view_type: randomChoice(viewTypes),
        concierge: randomBool(),
        agent_id: agent.id,
        price: price,
        notes: `${propertyType === 'sale' ? 'Sale' : 'Rental'} property in prime location`,
        referrals: []
      };

      try {
        const property = await Property.createProperty(propertyData);
        
        await client.query(
          `UPDATE properties 
           SET created_at = $1, closed_date = $2 
           WHERE id = $3`,
          [createdDate, closedDate, property.id]
        );
        
        // Add referrals with external logic
        const shouldHaveReferrals = Math.random() < 0.4;
        
        if (shouldHaveReferrals) {
          const referralAgent = randomChoice(agents);
          const firstReferralDate = randomDate(createdDate, closedDate ? new Date(closedDate) : currentMonthEnd);
          
          // First referral (always internal)
          await client.query(
            `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
             VALUES ($1, $2, $3, $4, $5, FALSE)`,
            [property.id, referralAgent.name, 'employee', referralAgent.id, formatDate(firstReferralDate)]
          );
          
          // 30% chance of second referral
          if (Math.random() < 0.3) {
            const secondReferralDate = randomDate(
              firstReferralDate,
              closedDate ? new Date(closedDate) : currentMonthEnd
            );
            const daysBetween = Math.floor((secondReferralDate - firstReferralDate) / (1000 * 60 * 60 * 24));
            const isExternal = (referralAgent.id === propertyData.agent_id) || (daysBetween >= 30);
            
            const secondReferralAgent = (Math.random() < 0.5 && !isExternal) ? referralAgent : randomChoice(agents.filter(a => a.id !== referralAgent.id));
            
            await client.query(
              `INSERT INTO referrals (property_id, name, type, employee_id, date, external)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                property.id,
                secondReferralAgent.name,
                'employee',
                secondReferralAgent.id,
                formatDate(secondReferralDate),
                isExternal || (secondReferralAgent.id === propertyData.agent_id)
              ]
            );
            
            await client.query(
              `UPDATE properties SET referrals_count = 2 WHERE id = $1`,
              [property.id]
            );
          } else {
            await client.query(
              `UPDATE properties SET referrals_count = 1 WHERE id = $1`,
              [property.id]
            );
          }
        }
        
        properties.push({ ...property, closed_date: closedDate });
        
        if ((i + 1) % 20 === 0) {
          console.log(`  ✓ Created ${i + 1} current month properties`);
        }
      } catch (error) {
        console.error(`Error creating property ${i + 1}:`, error.message);
      }
    }
    
    // Then create remaining properties with random dates over past year
    const remainingCount = 200 - properties.length;
    console.log(`  📅 Creating ${remainingCount} properties with random dates over past year...`);
    for (let i = 0; i < remainingCount; i++) {
      const agent = randomChoice(agents);
      const category = randomChoice(categories);
      const propertyType = randomChoice(propertyTypes);
      const createdDate = randomDate(oneYearAgo, now);
      
      // 30% chance of being sold/rented
      const isClosed = Math.random() < 0.3;
      let status = activeStatus;
      let closedDate = null;
      
      if (isClosed && closedStatus) {
        status = closedStatus;
        // Closed date should be after creation date
        const closedAfterCreated = new Date(createdDate);
        closedAfterCreated.setDate(closedAfterCreated.getDate() + randomInt(1, 180));
        if (closedAfterCreated <= now) {
          closedDate = formatDate(closedAfterCreated);
        } else {
          // Fallback: ensure closed properties always have a closed_date
          closedDate = formatDate(new Date(Math.min(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000), now)));
        }
      }
      
      // Ensure status is defined
      if (!status || !status.id) {
        status = activeStatus;
      }

      const surface = randomFloat(50, 500);
      const pricePerSqm = propertyType === 'sale' ? randomFloat(1500, 5000) : randomFloat(8, 25);
      const price = Math.round(surface * pricePerSqm);

      // 60% chance to link to an existing lead as owner
      let ownerId = null;
      let ownerName = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
      let ownerPhone = `+961 ${randomInt(3, 9)}${randomInt(100000, 999999)}`;
      
      if (leads.length > 0 && Math.random() < 0.6) {
        const ownerLead = randomChoice(leads);
        ownerId = ownerLead.id;
        ownerName = ownerLead.customer_name;
        ownerPhone = ownerLead.phone_number;
      }

      const propertyData = {
        status_id: status.id,
        property_type: propertyType,
        location: randomChoice(locations),
        category_id: category.id,
        building_name: randomBool() ? randomChoice(buildingNames) : null,
        owner_id: ownerId,
        owner_name: ownerName,
        phone_number: ownerPhone,
        surface: Math.round(surface * 100) / 100,
        details: `Floor ${randomInt(0, 15)}, ${randomBool() ? 'with' : 'without'} balcony, ${randomInt(0, 3)} parking spaces, ${randomBool() ? 'with' : 'without'} cave`,
        interior_details: randomChoice([
          'Fully furnished modern apartment',
          'Semi-furnished with high-end finishes',
          'Unfurnished, ready for customization',
          'Luxury interior with premium materials',
          'Renovated with contemporary design'
        ]),
        built_year: randomInt(1990, 2024),
        view_type: randomChoice(viewTypes),
        concierge: randomBool(),
        agent_id: agent.id,
        price: price,
        notes: `${propertyType === 'sale' ? 'Sale' : 'Rental'} property in prime location`,
        referrals: []
      };

      // 40% chance of having referrals
      if (Math.random() < 0.4) {
        const numReferrals = randomInt(1, 3);
        for (let j = 0; j < numReferrals; j++) {
          const referralAgent = randomChoice(agents);
          const referralDate = randomDate(createdDate, closedDate ? new Date(closedDate) : now);
          
          propertyData.referrals.push({
            name: referralAgent.name,
            type: randomBool() ? 'employee' : 'custom',
            employee_id: randomBool() ? referralAgent.id : null,
            date: formatDate(referralDate)
          });
        }
      }

      try {
        // Override created_at timestamp
        const property = await Property.createProperty(propertyData);
        
        // Update created_at and closed_date if needed
        await client.query(
          `UPDATE properties 
           SET created_at = $1, closed_date = $2 
           WHERE id = $3`,
          [createdDate, closedDate, property.id]
        );
        
        properties.push({ ...property, closed_date: closedDate });
        
        if ((i + 1) % 25 === 0) {
          console.log(`  ✓ Created ${i + 1} properties`);
        }
      } catch (error) {
        console.error(`Error creating property ${i + 1}:`, error.message);
      }
    }
    console.log(`✅ Created ${properties.length} properties`);

    // CREATE VIEWINGS (300 viewings)
    console.log('\n👁️  Creating 300 viewings...');
    let viewingsCreated = 0;
    
    // Link viewings to leads and properties
    for (let i = 0; i < 300; i++) {
      const agent = randomChoice(agents);
      const property = randomChoice(properties);
      const lead = randomChoice(leads);
      
      // Viewing date should be after property creation
      const propertyCreated = new Date(property.created_at);
      const viewingDate = randomDate(propertyCreated, now);
      
      const viewingTime = `${String(randomInt(9, 18)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`;
      const status = randomChoice(['Scheduled', 'Completed', 'Cancelled', 'No Show', 'Rescheduled']);

      try {
        await client.query(
          `INSERT INTO viewings (property_id, lead_id, agent_id, viewing_date, viewing_time, status, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            property.id,
            lead.id,
            agent.id,
            formatDate(viewingDate),
            viewingTime,
            status,
            `Viewing scheduled for ${formatDate(viewingDate)}`,
            viewingDate
          ]
        );
        viewingsCreated++;
        
        if (viewingsCreated % 50 === 0) {
          console.log(`  ✓ Created ${viewingsCreated} viewings`);
        }
      } catch (error) {
        console.error(`Error creating viewing ${i + 1}:`, error.message);
      }
    }
    console.log(`✅ Created ${viewingsCreated} viewings`);

    await client.query('COMMIT');
    
    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📈 Summary:');
    console.log(`   - ${leads.length} leads`);
    console.log(`   - ${properties.length} properties`);
    console.log(`   - ${viewingsCreated} viewings`);
    console.log(`   - Properties with referrals: ${properties.filter(p => p.referrals_count > 0).length}`);
    console.log(`   - Closed properties: ${properties.filter(p => p.closed_date).length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

