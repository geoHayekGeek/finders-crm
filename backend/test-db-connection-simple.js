const { Pool } = require('pg');

// Try different connection methods
const connectionConfigs = [
  {
    name: 'DATABASE_URL from env',
    config: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct local connection',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'finders_crm',
      user: 'postgres',
      password: 'postgres'
    }
  },
  {
    name: 'Direct local connection (no password)',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'finders_crm',
      user: 'postgres'
    }
  }
];

async function testConnections() {
  for (const connection of connectionConfigs) {
    console.log(`\n🔍 Testing: ${connection.name}`);
    const pool = new Pool(connection.config);
    
    try {
      const client = await pool.connect();
      console.log(`✅ ${connection.name} - Connected successfully!`);
      
      // Test a simple query
      const result = await client.query('SELECT version()');
      console.log(`📊 Database version: ${result.rows[0].version.split(' ')[0]}`);
      
      client.release();
      await pool.end();
      
      // If we get here, this connection works - use it for the function fix
      console.log(`\n🎯 Using working connection: ${connection.name}`);
      return connection.config;
      
    } catch (error) {
      console.log(`❌ ${connection.name} - Failed: ${error.message}`);
      await pool.end();
    }
  }
  
  console.log('\n❌ No working database connections found');
  return null;
}

testConnections().then(async (workingConfig) => {
  if (workingConfig) {
    console.log('\n🔧 Now fixing the function with working connection...');
    const pool = new Pool(workingConfig);
    
    try {
      const client = await pool.connect();
      
      // Drop the existing function
      await client.query('DROP FUNCTION IF EXISTS get_properties_with_details() CASCADE;');
      console.log('✅ Dropped existing function');
      
      // Recreate the function with correct column types
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION get_properties_with_details()
        RETURNS TABLE (
          id INTEGER,
          reference_number VARCHAR(20),
          status_name VARCHAR(50),
          status_color VARCHAR(20),
          location TEXT,
          category_name VARCHAR(100),
          category_code VARCHAR(10),
          building_name VARCHAR(255),
          owner_name VARCHAR(255),
          phone_number VARCHAR(50),
          surface DECIMAL(10,2),
          details JSONB,
          interior_details TEXT,
          built_year INTEGER,
          view_type VARCHAR(50),
          concierge BOOLEAN,
          agent_name VARCHAR(255),
          agent_role VARCHAR(50),
          price DECIMAL(15,2),
          notes TEXT,
          referral_source VARCHAR(100),
          referral_dates DATE[],
          main_image VARCHAR(10000),
          image_gallery VARCHAR(10000)[],
          created_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            p.id,
            p.reference_number,
            s.name as status_name,
            s.color as status_color,
            p.location,
            c.name as category_name,
            c.code as category_code,
            p.building_name,
            p.owner_name,
            p.phone_number,
            p.surface,
            p.details,
            p.interior_details,
            p.built_year,
            p.view_type,
            p.concierge,
            u.name as agent_name,
            u.role as agent_role,
            p.price,
            p.notes,
            p.referral_source,
            p.referral_dates,
            p.main_image,
            p.image_gallery,
            p.created_at,
            p.updated_at
          FROM properties p
          LEFT JOIN statuses s ON p.status_id = s.id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN users u ON p.agent_id = u.id
          ORDER BY p.created_at DESC;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      await client.query(createFunctionSQL);
      console.log('✅ Function recreated with correct column types');
      
      // Test the function
      const testResult = await client.query('SELECT * FROM get_properties_with_details() LIMIT 1');
      console.log('✅ Function test successful, returned', testResult.rows.length, 'rows');
      
      client.release();
      await pool.end();
      
    } catch (error) {
      console.error('❌ Error fixing function:', error);
      await pool.end();
    }
  }
}).catch(console.error);
