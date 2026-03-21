// Migration script to convert Base64 images to files
// Run this to migrate existing properties with Base64 images

const pool = require('../config/db');
const { convertPropertyImages } = require('../utils/imageToFileConverter');
const { paths: storagePaths, ensureStorageDirs } = require('../config/storage');
require('dotenv').config();

async function migrateBase64Images() {
  try {
    console.log('🚀 Starting Base64 image migration...');
    ensureStorageDirs();
    const outputDirectory = storagePaths.assetsProperties;
    
    // Get all properties with Base64 images
    console.log('📊 Fetching properties with Base64 images...');
    const result = await pool.query(`
      SELECT id, reference_number, main_image, image_gallery
      FROM properties 
      WHERE (main_image IS NOT NULL AND main_image LIKE 'data:image/%')
         OR (image_gallery IS NOT NULL AND array_to_string(image_gallery, ',') LIKE '%data:image/%')
      ORDER BY id
    `);
    
    const propertiesWithBase64 = result.rows;
    console.log(`📋 Found ${propertiesWithBase64.length} properties with Base64 images`);
    
    if (propertiesWithBase64.length === 0) {
      console.log('✅ No properties with Base64 images found. Migration not needed.');
      return;
    }
    
    let convertedCount = 0;
    let errorCount = 0;
    
    // Process each property
    for (const property of propertiesWithBase64) {
      try {
        console.log(`\n🔄 Processing property ${property.reference_number} (ID: ${property.id})...`);
        
        // Convert images
        const updatedProperty = await convertPropertyImages(property, outputDirectory);
        
        // Update database with file URLs
        await pool.query(`
          UPDATE properties 
          SET main_image = $1, image_gallery = $2, updated_at = NOW()
          WHERE id = $3
        `, [
          updatedProperty.main_image,
          updatedProperty.image_gallery,
          property.id
        ]);
        
        console.log(`✅ Successfully migrated property ${property.reference_number}`);
        convertedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating property ${property.reference_number}:`, error);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully converted: ${convertedCount} properties`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} properties`);
    }
    console.log('🎉 Base64 image migration completed!');
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as remaining_base64_count
      FROM properties 
      WHERE (main_image IS NOT NULL AND main_image LIKE 'data:image/%')
         OR (image_gallery IS NOT NULL AND array_to_string(image_gallery, ',') LIKE '%data:image/%')
    `);
    
    const remainingBase64Count = parseInt(verifyResult.rows[0].remaining_base64_count);
    if (remainingBase64Count === 0) {
      console.log('✅ Verification successful: No Base64 images remaining');
    } else {
      console.log(`⚠️  Warning: ${remainingBase64Count} properties still have Base64 images`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateBase64Images();
}

module.exports = { migrateBase64Images };
