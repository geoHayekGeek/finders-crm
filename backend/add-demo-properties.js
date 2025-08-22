// add-demo-properties.js
const pool = require('./config/db');

async function addDemoProperties() {
  try {
    console.log('🏠 Adding demo properties...');
    
    // Get categories and statuses for reference
    const categories = await pool.query('SELECT id, name, code FROM categories WHERE is_active = true');
    const statuses = await pool.query('SELECT id, name, code FROM statuses WHERE is_active = true');
    
    console.log(`📋 Found ${categories.rows.length} categories and ${statuses.rows.length} statuses`);
    
    // Demo properties data
    const demoProperties = [
      {
        status_id: statuses.rows.find(s => s.code === 'active').id,
        location: "Beirut Central District, Lebanon",
        category_id: categories.rows.find(c => c.code === 'A').id,
        building_name: "Marina Towers",
        owner_name: "Ahmed Al-Masri",
        phone_number: "+961 70 123 456",
        surface: 150.5,
        details: { floor: 8, balcony: true, parking: 2, cave: true },
        interior_details: "Fully furnished with modern appliances, marble floors, and sea view",
        built_year: 2020,
        view_type: "sea view",
        concierge: true,
        agent_id: null,
        price: 450000,
        notes: "Luxury apartment with stunning sea view, recently renovated",
        referral_source: "External referral from local real estate agent",
        referral_dates: ["2025-01-15"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'active').id,
        location: "Jounieh, Mount Lebanon",
        category_id: categories.rows.find(c => c.code === 'V').id,
        building_name: "Villa Paradise",
        owner_name: "Marie Dubois",
        phone_number: "+961 71 987 654",
        surface: 350.0,
        details: { floor: 1, balcony: true, parking: 3, cave: true },
        interior_details: "Spacious villa with garden, swimming pool, and mountain view",
        built_year: 2018,
        view_type: "mountain view",
        concierge: false,
        agent_id: null,
        price: 1200000,
        notes: "Beautiful villa perfect for families, close to beaches and amenities",
        referral_source: "Internal referral from agent",
        referral_dates: ["2025-01-10", "2025-01-18"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'active').id,
        location: "Hamra, Beirut",
        category_id: categories.rows.find(c => c.code === 'O').id,
        building_name: "Business Center Hamra",
        owner_name: "Tech Solutions Ltd",
        phone_number: "+961 1 234 567",
        surface: 200.0,
        details: { floor: 5, balcony: false, parking: 5, cave: false },
        interior_details: "Modern office space with meeting rooms and reception area",
        built_year: 2021,
        view_type: "open view",
        concierge: true,
        agent_id: null,
        price: 800000,
        notes: "Prime office location in Hamra, perfect for tech companies",
        referral_source: "Direct inquiry",
        referral_dates: ["2025-01-20"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'sold').id,
        location: "Zahle, Bekaa Valley",
        category_id: categories.rows.find(c => c.code === 'L').id,
        building_name: null,
        owner_name: "Agricultural Cooperative",
        phone_number: "+961 8 765 432",
        surface: 2500.0,
        details: { floor: 0, balcony: false, parking: 0, cave: false },
        interior_details: "Agricultural land suitable for farming and development",
        built_year: null,
        view_type: "open view",
        concierge: false,
        agent_id: null,
        price: 350000,
        notes: "Large plot of land with good soil quality, water access available",
        referral_source: "Local farmer referral",
        referral_dates: ["2024-12-15"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'rented').id,
        location: "Gemmayze, Beirut",
        category_id: categories.rows.find(c => c.code === 'ST').id,
        building_name: "Gemmayze Studios",
        owner_name: "Pierre Chamoun",
        phone_number: "+961 70 555 123",
        surface: 45.0,
        details: { floor: 3, balcony: true, parking: 0, cave: false },
        interior_details: "Cozy studio apartment with modern amenities",
        built_year: 2019,
        view_type: "open view",
        concierge: false,
        agent_id: null,
        price: 1200,
        notes: "Perfect for young professionals, monthly rent, fully furnished",
        referral_source: "Online listing",
        referral_dates: ["2024-11-20"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'under_contract').id,
        location: "Broumana, Mount Lebanon",
        category_id: categories.rows.find(c => c.code === 'C').id,
        building_name: "Mountain Chalet Resort",
        owner_name: "Ski Lebanon Group",
        phone_number: "+961 4 123 456",
        surface: 180.0,
        details: { floor: 2, balcony: true, parking: 2, cave: true },
        interior_details: "Charming chalet with fireplace, wooden interior, and ski access",
        built_year: 2015,
        view_type: "mountain view",
        concierge: true,
        agent_id: null,
        price: 750000,
        notes: "Ski-in/ski-out chalet, perfect for winter sports enthusiasts",
        referral_source: "Ski resort partnership",
        referral_dates: ["2025-01-05"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'active').id,
        location: "Saida, South Lebanon",
        category_id: categories.rows.find(c => c.code === 'R').id,
        building_name: "Saida Seafood Restaurant",
        owner_name: "Hassan Al-Saidi",
        phone_number: "+961 7 123 789",
        surface: 120.0,
        details: { floor: 1, balcony: false, parking: 15, cave: true },
        interior_details: "Fully equipped restaurant kitchen with dining area and outdoor terrace",
        built_year: 2022,
        view_type: "sea view",
        concierge: false,
        agent_id: null,
        price: 600000,
        notes: "Prime location on the corniche, established customer base",
        referral_source: "Local business network",
        referral_dates: ["2025-01-12"]
      },
      {
        status_id: statuses.rows.find(s => s.code === 'pending').id,
        location: "Tripoli, North Lebanon",
        category_id: categories.rows.find(c => c.code === 'W').id,
        building_name: "Tripoli Industrial Zone",
        owner_name: "Industrial Development Corp",
        phone_number: "+961 6 987 123",
        surface: 800.0,
        details: { floor: 1, balcony: false, parking: 20, cave: false },
        interior_details: "Large warehouse space with loading docks and office area",
        built_year: 2020,
        view_type: "no view",
        concierge: false,
        agent_id: null,
        price: 950000,
        notes: "Strategic location near port, suitable for import/export businesses",
        referral_source: "Government development program",
        referral_dates: ["2025-01-08"]
      }
    ];
    
    console.log(`📝 Adding ${demoProperties.length} demo properties...`);
    
    let addedCount = 0;
    for (const property of demoProperties) {
      try {
        // Generate reference number
        const category = await pool.query('SELECT code FROM categories WHERE id = $1', [property.category_id]);
        const refNumber = await pool.query(
          'SELECT generate_reference_number($1, $2)',
          [category.rows[0].code, 'F']
        );
        
        // Insert property
        const result = await pool.query(
          `INSERT INTO properties (
            reference_number, status_id, location, category_id, building_name, 
            owner_name, phone_number, surface, details, interior_details, 
            built_year, view_type, concierge, agent_id, price, notes, 
            referral_source, referral_dates
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING reference_number`,
          [
            refNumber.rows[0].generate_reference_number,
            property.status_id,
            property.location,
            property.category_id,
            property.building_name,
            property.owner_name,
            property.phone_number,
            property.surface,
            property.details,
            property.interior_details,
            property.built_year,
            property.view_type,
            property.concierge,
            property.agent_id,
            property.price,
            property.notes,
            property.referral_source,
            property.referral_dates
          ]
        );
        
        console.log(`✅ Added property: ${result.rows[0].reference_number} - ${property.location}`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Error adding property ${property.location}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully added ${addedCount} demo properties!`);
    
    // Show final counts
    const finalCount = await pool.query('SELECT COUNT(*) FROM properties');
    console.log(`📊 Total properties in database: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('💥 Error adding demo properties:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
addDemoProperties();
