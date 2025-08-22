// show-demo-data.js
const pool = require('./config/db');

async function showDemoData() {
  try {
    console.log('📊 DEMO DATA OVERVIEW\n');
    console.log('=' .repeat(60));
    
    // Show categories
    console.log('\n🏷️  CATEGORIES:');
    console.log('-'.repeat(40));
    const categories = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY name');
    categories.rows.forEach(cat => {
      console.log(`  ${cat.code.padEnd(3)} | ${cat.name.padEnd(20)} | ${cat.description}`);
    });
    
    // Show statuses
    console.log('\n📈 STATUSES:');
    console.log('-'.repeat(40));
    const statuses = await pool.query('SELECT * FROM statuses WHERE is_active = true ORDER BY name');
    statuses.rows.forEach(status => {
      console.log(`  ${status.code.padEnd(15)} | ${status.name.padEnd(15)} | ${status.color} | ${status.description}`);
    });
    
    // Show properties with full details
    console.log('\n🏠 PROPERTIES:');
    console.log('-'.repeat(40));
    const properties = await pool.query('SELECT * FROM get_properties_with_details() ORDER BY created_at DESC');
    
    properties.rows.forEach((prop, index) => {
      console.log(`\n  ${index + 1}. ${prop.reference_number} - ${prop.category_name}`);
      console.log(`     Location: ${prop.location}`);
      console.log(`     Status: ${prop.status_name} (${prop.status_color})`);
      console.log(`     Owner: ${prop.owner_name}`);
      console.log(`     Price: $${prop.price?.toLocaleString() || 'N/A'}`);
      console.log(`     Surface: ${prop.surface}m²`);
      console.log(`     View: ${prop.view_type || 'N/A'}`);
      console.log(`     Concierge: ${prop.concierge ? 'Yes' : 'No'}`);
      if (prop.building_name) console.log(`     Building: ${prop.building_name}`);
      if (prop.built_year) console.log(`     Built: ${prop.built_year}`);
      if (prop.details) {
        const details = prop.details;
        console.log(`     Details: Floor ${details.floor || 'N/A'}, Balcony: ${details.balcony ? 'Yes' : 'No'}, Parking: ${details.parking || 0}, Cave: ${details.cave ? 'Yes' : 'No'}`);
      }
      if (prop.referral_source) console.log(`     Referral: ${prop.referral_source}`);
      if (prop.referral_dates && prop.referral_dates.length > 0) {
        console.log(`     Referral Dates: ${prop.referral_dates.join(', ')}`);
      }
      if (prop.notes) console.log(`     Notes: ${prop.notes}`);
    });
    
    // Show analytics
    console.log('\n📈 ANALYTICS:');
    console.log('-'.repeat(40));
    
    // Property stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN s.code = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN s.code = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN s.code = 'sold' THEN 1 END) as sold,
        COUNT(CASE WHEN s.code = 'rented' THEN 1 END) as rented,
        COUNT(CASE WHEN s.code = 'under_contract' THEN 1 END) as under_contract,
        COUNT(CASE WHEN s.code = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN s.code = 'reserved' THEN 1 END) as reserved
      FROM properties p
      LEFT JOIN statuses s ON p.status_id = s.id
    `);
    
    const stat = stats.rows[0];
    console.log(`  Total Properties: ${stat.total_properties}`);
    console.log(`  Active: ${stat.active} | Sold: ${stat.sold} | Rented: ${stat.rented}`);
    console.log(`  Under Contract: ${stat.under_contract} | Pending: ${stat.pending} | Reserved: ${stat.reserved}`);
    
    // By category
    console.log('\n  By Category:');
    const categoryStats = await pool.query(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as count
      FROM categories c
      LEFT JOIN properties p ON c.id = p.category_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `);
    
    categoryStats.rows.forEach(cat => {
      if (cat.count > 0) {
        console.log(`    ${cat.category_name.padEnd(20)}: ${cat.count}`);
      }
    });
    
    // By location
    console.log('\n  By Location:');
    const locationStats = await pool.query(`
      SELECT 
        location,
        COUNT(*) as count
      FROM properties
      GROUP BY location
      ORDER BY count DESC
    `);
    
    locationStats.rows.forEach(loc => {
      console.log(`    ${loc.location.padEnd(30)}: ${loc.count}`);
    });
    
    // By price range
    console.log('\n  By Price Range:');
    const priceStats = await pool.query(`
      SELECT 
        price_range,
        COUNT(*) as count
      FROM (
        SELECT 
          CASE 
            WHEN price < 100000 THEN 'Under $100k'
            WHEN price < 500000 THEN '$100k - $500k'
            WHEN price < 1000000 THEN '$500k - $1M'
            WHEN price < 5000000 THEN '$1M - $5M'
            ELSE 'Over $5M'
          END as price_range
        FROM properties
        WHERE price IS NOT NULL
      ) price_ranges
      GROUP BY price_range
      ORDER BY 
        CASE price_range
          WHEN 'Under $100k' THEN 1
          WHEN '$100k - $500k' THEN 2
          WHEN '$500k - $1M' THEN 3
          WHEN '$1M - $5M' THEN 4
          ELSE 5
        END
    `);
    
    priceStats.rows.forEach(price => {
      console.log(`    ${price.price_range.padEnd(15)}: ${price.count}`);
    });
    
    // By view type
    console.log('\n  By View Type:');
    const viewStats = await pool.query(`
      SELECT 
        view_type,
        COUNT(*) as count
      FROM properties
      WHERE view_type IS NOT NULL
      GROUP BY view_type
      ORDER BY count DESC
    `);
    
    viewStats.rows.forEach(view => {
      console.log(`    ${view.view_type.padEnd(15)}: ${view.count}`);
    });
    
    console.log('\n🎯 Demo Data Overview Completed!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('💥 Error showing demo data:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
showDemoData();
