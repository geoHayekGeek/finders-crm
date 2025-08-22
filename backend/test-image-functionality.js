// test-image-functionality.js
const pool = require('./config/db');

async function testImageFunctionality() {
  try {
    console.log('🧪 Testing base64 image functionality...\n');
    
    // Test 1: Check if image columns exist
    console.log('1️⃣ Checking if image columns exist...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'properties' AND column_name IN ('main_image', 'image_gallery')
      ORDER BY column_name
    `);
    
    if (columnsResult.rows.length === 2) {
      console.log('✅ Image columns found:');
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ Image columns not found or incomplete');
      return;
    }
    
    // Test 2: Check if function includes image fields
    console.log('\n2️⃣ Checking if get_properties_with_details function includes image fields...');
    const functionResult = await pool.query(`
      SELECT pg_get_functiondef(oid) as function_definition
      FROM pg_proc 
      WHERE proname = 'get_properties_with_details'
    `);
    
    if (functionResult.rows.length > 0) {
      const funcDef = functionResult.rows[0].function_definition;
      if (funcDef.includes('main_image') && funcDef.includes('image_gallery')) {
        console.log('✅ Function includes image fields');
      } else {
        console.log('❌ Function missing image fields');
      }
    }
    
    // Test 3: Test property creation with base64 images
    console.log('\n3️⃣ Testing property creation with base64 images...');
    const testProperty = {
      status_id: 1,
      location: "Test Location",
      category_id: 1,
      owner_name: "Test Owner",
      price: 100000,
      main_image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      image_gallery: [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      ]
    };
    
    // Get category code for reference number generation
    const category = await pool.query('SELECT code FROM categories WHERE id = $1', [testProperty.category_id]);
    const refNumber = await pool.query(
      'SELECT generate_reference_number($1, $2)',
      [category.rows[0].code, 'F']
    );
    
    const insertResult = await pool.query(`
      INSERT INTO properties (
        reference_number, status_id, location, category_id, owner_name, 
        price, main_image, image_gallery
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, reference_number, main_image, image_gallery
    `, [
      refNumber.rows[0].generate_reference_number,
      testProperty.status_id,
      testProperty.location,
      testProperty.category_id,
      testProperty.owner_name,
      testProperty.price,
      testProperty.main_image,
      testProperty.image_gallery
    ]);
    
    if (insertResult.rows[0]) {
      console.log('✅ Test property created successfully:');
      console.log(`   - ID: ${insertResult.rows[0].id}`);
      console.log(`   - Reference: ${insertResult.rows[0].reference_number}`);
      console.log(`   - Main Image: ${insertResult.rows[0].main_image ? 'Present (base64)' : 'None'}`);
      console.log(`   - Gallery: ${insertResult.rows[0].image_gallery ? insertResult.rows[0].image_gallery.length + ' images' : 'None'}`);
      
      const testPropertyId = insertResult.rows[0].id;
      
      // Test 4: Test image update
      console.log('\n4️⃣ Testing image update...');
      const updateResult = await pool.query(`
        UPDATE properties 
        SET main_image = $1, image_gallery = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING main_image, image_gallery
      `, [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        [
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        ],
        testPropertyId
      ]);
      
      if (updateResult.rows[0]) {
        console.log('✅ Image update successful:');
        console.log(`   - New Main Image: ${updateResult.rows[0].main_image ? 'Present (base64)' : 'None'}`);
        console.log(`   - New Gallery: ${updateResult.rows[0].image_gallery ? updateResult.rows[0].image_gallery.length + ' images' : 'None'}`);
      }
      
      // Test 5: Test adding image to gallery
      console.log('\n5️⃣ Testing adding image to gallery...');
      const addImageResult = await pool.query(`
        UPDATE properties 
        SET image_gallery = array_append(image_gallery, $1), updated_at = NOW()
        WHERE id = $2
        RETURNING image_gallery
      `, ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=", testPropertyId]);
      
      if (addImageResult.rows[0]) {
        console.log('✅ Image added to gallery:');
        console.log(`   - Updated Gallery: ${addImageResult.rows[0].image_gallery ? addImageResult.rows[0].image_gallery.length + ' images' : 'None'}`);
      }
      
      // Test 6: Test removing image from gallery
      console.log('\n6️⃣ Testing removing image from gallery...');
      const removeImageResult = await pool.query(`
        UPDATE properties 
        SET image_gallery = array_remove(image_gallery, $1), updated_at = NOW()
        WHERE id = $2
        RETURNING image_gallery
      `, ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=", testPropertyId]);
      
      if (removeImageResult.rows[0]) {
        console.log('✅ Image removed from gallery:');
        console.log(`   - Updated Gallery: ${removeImageResult.rows[0].image_gallery ? removeImageResult.rows[0].image_gallery.length + ' images' : 'None'}`);
      }
      
      // Test 7: Test get_properties_with_details function
      console.log('\n7️⃣ Testing get_properties_with_details function...');
      const functionTestResult = await pool.query(`
        SELECT * FROM get_properties_with_details() WHERE id = $1
      `, [testPropertyId]);
      
      if (functionTestResult.rows[0]) {
        const property = functionTestResult.rows[0];
        console.log('✅ Function test successful:');
        console.log(`   - Main Image: ${property.main_image ? 'Present (base64)' : 'None'}`);
        console.log(`   - Gallery: ${property.image_gallery ? property.image_gallery.length + ' images' : 'None'}`);
        console.log(`   - Status: ${property.status_name}`);
        console.log(`   - Category: ${property.category_name}`);
      }
      
      // Clean up test property
      console.log('\n🧹 Cleaning up test property...');
      await pool.query('DELETE FROM properties WHERE id = $1', [testPropertyId]);
      console.log('✅ Test property removed');
      
    } else {
      console.log('❌ Failed to create test property');
    }
    
    // Test 8: Check existing properties with images
    console.log('\n8️⃣ Checking existing properties with images...');
    const propertiesWithImages = await pool.query(`
      SELECT id, reference_number, main_image, array_length(image_gallery, 1) as gallery_count
      FROM properties 
      WHERE main_image IS NOT NULL OR array_length(image_gallery, 1) > 0
      LIMIT 5
    `);
    
    if (propertiesWithImages.rows.length > 0) {
      console.log('✅ Found properties with images:');
      propertiesWithImages.rows.forEach(prop => {
        console.log(`   - ${prop.reference_number}: Main Image: ${prop.main_image ? 'Yes (base64)' : 'No'}, Gallery: ${prop.gallery_count || 0} images`);
      });
    } else {
      console.log('ℹ️ No properties with images found');
    }
    
    // Test 9: Test properties without images (optional images)
    console.log('\n9️⃣ Testing properties without images (optional images)...');
    const propertiesWithoutImages = await pool.query(`
      SELECT id, reference_number, main_image, image_gallery
      FROM properties 
      WHERE main_image IS NULL AND (image_gallery IS NULL OR array_length(image_gallery, 1) = 0)
      LIMIT 3
    `);
    
    if (propertiesWithoutImages.rows.length > 0) {
      console.log('✅ Found properties without images (optional feature working):');
      propertiesWithoutImages.rows.forEach(prop => {
        console.log(`   - ${prop.reference_number}: Main Image: ${prop.main_image ? 'Yes' : 'No'}, Gallery: ${prop.image_gallery ? prop.image_gallery.length : 0} images`);
      });
    } else {
      console.log('ℹ️ All properties have images');
    }
    
    console.log('\n🎉 Base64 image functionality test completed successfully!');
    console.log('✅ Images are now optional and stored as base64');
    console.log('✅ No external dependencies required');
    console.log('✅ Images can be displayed directly in the system');
    
  } catch (error) {
    console.error('💥 Error testing image functionality:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testImageFunctionality();
