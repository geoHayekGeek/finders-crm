// migrate-image-columns.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrateImageColumns() {
  try {
    console.log('🚀 Migrating properties table to add image columns...');
    
    // First, drop the existing function if it exists
    console.log('🗑️ Dropping existing get_properties_with_details function...');
    await pool.query('DROP FUNCTION IF EXISTS get_properties_with_details() CASCADE');
    console.log('✅ Existing function dropped');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_image_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sqlContent);
    console.log('✅ Migration completed successfully!');
    
    // Verify the new columns exist
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Properties table columns after migration:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if we have the new columns
    const hasMainImage = columnsResult.rows.some(col => col.column_name === 'main_image');
    const hasImageGallery = columnsResult.rows.some(col => col.column_name === 'image_gallery');
    
    if (hasMainImage && hasImageGallery) {
      console.log('🎉 Successfully added main_image and image_gallery columns!');
    } else {
      console.log('⚠️ Some columns may not have been added properly');
    }
    
    // Check if the function was updated
    const functionResult = await pool.query(`
      SELECT pg_get_functiondef(oid) as function_definition
      FROM pg_proc 
      WHERE proname = 'get_properties_with_details'
    `);
    
    if (functionResult.rows.length > 0) {
      const funcDef = functionResult.rows[0].function_definition;
      if (funcDef.includes('main_image') && funcDef.includes('image_gallery')) {
        console.log('✅ Function get_properties_with_details updated successfully!');
      } else {
        console.log('⚠️ Function may not have been updated properly');
      }
    }
    
  } catch (error) {
    console.error('💥 Error during migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateImageColumns();
