// Script to add October closures for Ahmad Al Masri
const pool = require('./config/db');
const Property = require('./models/propertyModel');

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];
const randomBool = () => Math.random() > 0.5;

const firstNames = ['John', 'Jane', 'Ahmed', 'Sarah', 'Mohammed', 'Layla', 'David', 'Maria', 'Omar', 'Fatima'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const locations = [
  'Beirut Downtown', 'Hamra', 'Achrafieh', 'Badaro', 'Verdun', 'Mar Mikhael', 'Gemmayze', 'Saifi Village',
  'Raouche', 'Zaitunay Bay', 'ABC Achrafieh', 'Dora', 'Hazmieh', 'Baabda', 'Sin El Fil', 'Furn El Chebbak'
];
const buildingNames = [
  'Sky Tower', 'Ocean View', 'Mountain Heights', 'Beirut Plaza', 'City Center', 'Grand Residence', 
  'Luxury Apartments', 'Modern Complex', 'Royal Building', 'Elite Tower'
];
const viewTypes = ['open view', 'sea view', 'mountain view', 'no view'];

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

async function addAhmadOctoberClosures() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Finding Ahmad Al Masri...\n');
    
    // Find Ahmad Al Masri
    const agentResult = await client.query(
      `SELECT id, name FROM users 
       WHERE (LOWER(name) LIKE '%ahmad%' OR LOWER(name) LIKE '%masri%' OR LOWER(name) LIKE '%masery%')
       AND role IN ('agent', 'team_leader')
       ORDER BY name
       LIMIT 1`
    );
    
    if (agentResult.rows.length === 0) {
      throw new Error('No agent found matching Ahmad Al Masri');
    }
    
    const ahmad = agentResult.rows[0];
    console.log(`✅ Found agent: ${ahmad.name} (ID: ${ahmad.id})\n`);
    
    // Get required data
    const statusResult = await client.query("SELECT id, code, name FROM statuses WHERE is_active = true");
    const closedStatus = statusResult.rows.find(s => 
      s.code === 'closed' || s.code === 'CLOSED' || s.name.toLowerCase() === 'closed' ||
      s.code === 'sold' || s.code === 'SOLD' || s.name.toLowerCase() === 'sold' ||
      s.code === 'rented' || s.code === 'RENTED' || s.name.toLowerCase() === 'rented'
    );
    
    if (!closedStatus) {
      throw new Error('No closed status found. Please create a closed status first.');
    }
    
    console.log(`✅ Using closed status: ${closedStatus.name} (ID: ${closedStatus.id})\n`);
    
    const categoryResult = await client.query("SELECT id, code FROM categories WHERE is_active = true LIMIT 1");
    if (categoryResult.rows.length === 0) {
      throw new Error('No categories found. Please create categories first.');
    }
    const category = categoryResult.rows[0];
    
    // Get operations users for leads
    const operationsResult = await client.query("SELECT id FROM users WHERE role IN ('operations', 'operations_manager') LIMIT 1");
    if (operationsResult.rows.length === 0) {
      throw new Error('No operations users found. Please create operations users first.');
    }
    const operationsId = operationsResult.rows[0].id;
    
    // Get reference sources
    const sourceResult = await client.query("SELECT id FROM reference_sources LIMIT 1");
    if (sourceResult.rows.length === 0) {
      throw new Error('No reference sources found. Please create reference sources first.');
    }
    const sourceId = sourceResult.rows[0].id;
    
    // October 2025 date range
    const currentMonthStart = new Date(2025, 9, 1); // October 1, 2025 (month is 0-indexed)
    const currentMonthEnd = new Date(2025, 9, 31); // October 31, 2025
    const now = new Date();
    
    console.log('📅 Creating 10 additional October closures (5 sale, 5 rent)...\n');
    
    const closuresToCreate = [
      { type: 'sale', count: 5 },
      { type: 'rent', count: 5 }
    ];
    
    let createdCount = 0;
    
    for (const closureGroup of closuresToCreate) {
      for (let i = 0; i < closureGroup.count; i++) {
        const propertyType = closureGroup.type;
        
        // Random date in October
        const createdDate = new Date(
          currentMonthStart.getTime() + 
          Math.random() * (currentMonthEnd.getTime() - currentMonthStart.getTime())
        );
        
        // Closed date should be after creation date, within October
        const daysAfterCreation = randomInt(1, 15);
        const closedDate = new Date(createdDate);
        closedDate.setDate(closedDate.getDate() + daysAfterCreation);
        
        // Make sure closed date is in October and before today
        if (closedDate > currentMonthEnd) {
          closedDate.setTime(currentMonthEnd.getTime());
        }
        if (closedDate > now) {
          closedDate.setTime(Math.min(now.getTime(), currentMonthEnd.getTime()));
        }
        
        const surface = randomFloat(80, 400);
        const pricePerSqm = propertyType === 'sale' ? randomFloat(2000, 4500) : randomFloat(10, 20);
        const price = Math.round(surface * pricePerSqm);
        
        const ownerName = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
        const ownerPhone = `+961 ${randomInt(3, 9)}${randomInt(100000, 999999)}`;
        
        const propertyData = {
          status_id: closedStatus.id,
          property_type: propertyType,
          location: randomChoice(locations),
          category_id: category.id,
          building_name: randomBool() ? randomChoice(buildingNames) : null,
          owner_id: null,
          owner_name: ownerName,
          phone_number: ownerPhone,
          surface: Math.round(surface * 100) / 100,
          details: `Floor ${randomInt(0, 15)}, ${randomBool() ? 'with' : 'without'} balcony, ${randomInt(0, 3)} parking spaces`,
          interior_details: randomChoice([
            'Fully furnished modern apartment',
            'Semi-furnished with high-end finishes',
            'Unfurnished, ready for customization'
          ]),
          built_year: randomInt(1990, 2024),
          view_type: randomChoice(viewTypes),
          concierge: randomBool(),
          agent_id: ahmad.id,
          price: price,
          notes: `${propertyType === 'sale' ? 'Sale' : 'Rental'} property - CLOSED in October`,
          closed_date: formatDate(closedDate),
          referrals: []
        };
        
        try {
          const property = await Property.createProperty(propertyData);
          
          // Update created_at timestamp
          await client.query(
            `UPDATE properties 
             SET created_at = $1 
             WHERE id = $2`,
            [createdDate, property.id]
          );
          
          createdCount++;
          console.log(`  ✓ Created ${propertyType} closure #${createdCount}: $${price.toLocaleString()}, closed: ${formatDate(closedDate)}`);
        } catch (error) {
          console.error(`  ❌ Error creating ${propertyType} closure ${i + 1}:`, error.message);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully created ${createdCount} closures for ${ahmad.name} in October 2025\n`);
    
    // Verify the closures were added
    const verifyResult = await client.query(
      `SELECT COUNT(*) as count, 
              COUNT(CASE WHEN property_type = 'sale' THEN 1 END) as sales,
              COUNT(CASE WHEN property_type = 'rent' THEN 1 END) as rents
       FROM properties p
       LEFT JOIN statuses s ON p.status_id = s.id
       WHERE p.agent_id = $1
         AND p.closed_date >= '2025-10-01'::date
         AND p.closed_date <= '2025-10-31'::date
         AND (
           LOWER(s.code) IN ('sold', 'rented', 'closed')
           OR LOWER(s.name) IN ('sold', 'rented', 'closed')
         )`,
      [ahmad.id]
    );
    
    const total = parseInt(verifyResult.rows[0].count);
    const sales = parseInt(verifyResult.rows[0].sales);
    const rents = parseInt(verifyResult.rows[0].rents);
    
    console.log('📊 Verification:');
    console.log(`   Total October closures: ${total}`);
    console.log(`   - Sales: ${sales}`);
    console.log(`   - Rents: ${rents}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
addAhmadOctoberClosures()
  .then(() => {
    console.log('✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

