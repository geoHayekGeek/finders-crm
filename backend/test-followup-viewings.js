// Integration test script for follow-up viewings
const Viewing = require('./models/viewingModel');
const pool = require('./config/db');

async function testFollowUpViewings() {
  console.log('🧪 Testing Follow-up Viewings Functionality\n');
  
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Check if parent_viewing_id column exists
    console.log('Test 1: Checking if parent_viewing_id column exists...');
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'viewings' AND column_name = 'parent_viewing_id'
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ PASS: parent_viewing_id column exists');
        testsPassed++;
      } else {
        console.log('❌ FAIL: parent_viewing_id column does not exist');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAIL: Error checking column:', error.message);
      testsFailed++;
    }

    // Test 2: Check if index exists
    console.log('\nTest 2: Checking if index exists...');
    try {
      const result = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'viewings' AND indexname = 'idx_viewings_parent_viewing_id'
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ PASS: Index exists');
        testsPassed++;
      } else {
        console.log('❌ FAIL: Index does not exist');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAIL: Error checking index:', error.message);
      testsFailed++;
    }

    // Test 3: Test creating a parent viewing
    console.log('\nTest 3: Creating a parent viewing...');
    try {
      // First, we need a property, lead, and agent to exist
      // For this test, we'll assume they exist or create test data
      const propertyResult = await pool.query('SELECT id FROM properties LIMIT 1');
      const leadResult = await pool.query('SELECT id FROM leads LIMIT 1');
      const agentResult = await pool.query('SELECT id FROM users WHERE role = \'agent\' LIMIT 1');

      if (propertyResult.rows.length > 0 && leadResult.rows.length > 0 && agentResult.rows.length > 0) {
        const propertyId = propertyResult.rows[0].id;
        const leadId = leadResult.rows[0].id;
        const agentId = agentResult.rows[0].id;

        const parentViewing = await Viewing.createViewing({
          property_id: propertyId,
          lead_id: leadId,
          agent_id: agentId,
          viewing_date: '2024-12-20',
          viewing_time: '10:00:00',
          status: 'Scheduled',
          parent_viewing_id: null
        });

        if (parentViewing && parentViewing.id && !parentViewing.parent_viewing_id) {
          console.log('✅ PASS: Parent viewing created successfully');
          testsPassed++;

          // Test 4: Create a follow-up viewing
          console.log('\nTest 4: Creating a follow-up viewing...');
          try {
            const followUpViewing = await Viewing.createViewing({
              property_id: propertyId,
              lead_id: leadId,
              agent_id: agentId,
              viewing_date: '2024-12-25',
              viewing_time: '14:00:00',
              status: 'Scheduled',
              parent_viewing_id: parentViewing.id
            });

            if (followUpViewing && followUpViewing.parent_viewing_id === parentViewing.id) {
              console.log('✅ PASS: Follow-up viewing created successfully');
              testsPassed++;

              // Test 5: Get sub-viewings
              console.log('\nTest 5: Fetching sub-viewings...');
              try {
                const subViewings = await Viewing.getSubViewings(parentViewing.id);
                if (Array.isArray(subViewings) && subViewings.length > 0) {
                  console.log(`✅ PASS: Found ${subViewings.length} sub-viewing(s)`);
                  testsPassed++;
                } else {
                  console.log('❌ FAIL: No sub-viewings found');
                  testsFailed++;
                }
              } catch (error) {
                console.log('❌ FAIL: Error fetching sub-viewings:', error.message);
                testsFailed++;
              }

              // Test 6: Test attachSubViewings
              console.log('\nTest 6: Testing attachSubViewings...');
              try {
                const parentViewings = [parentViewing];
                const viewingsWithSub = await Viewing.attachSubViewings(parentViewings);
                
                if (viewingsWithSub[0].sub_viewings && viewingsWithSub[0].sub_viewings.length > 0) {
                  console.log('✅ PASS: Sub-viewings attached successfully');
                  testsPassed++;
                } else {
                  console.log('❌ FAIL: Sub-viewings not attached');
                  testsFailed++;
                }
              } catch (error) {
                console.log('❌ FAIL: Error attaching sub-viewings:', error.message);
                testsFailed++;
              }

              // Cleanup
              await pool.query('DELETE FROM viewings WHERE id IN ($1, $2)', [parentViewing.id, followUpViewing.id]);
            } else {
              console.log('❌ FAIL: Follow-up viewing not created correctly');
              testsFailed++;
              // Cleanup
              await pool.query('DELETE FROM viewings WHERE id = $1', [parentViewing.id]);
            }
          } catch (error) {
            console.log('❌ FAIL: Error creating follow-up viewing:', error.message);
            testsFailed++;
            // Cleanup
            await pool.query('DELETE FROM viewings WHERE id = $1', [parentViewing.id]);
          }
        } else {
          console.log('❌ FAIL: Parent viewing not created correctly');
          testsFailed++;
        }
      } else {
        console.log('⚠️  SKIP: Required test data (property, lead, agent) not available');
      }
    } catch (error) {
      console.log('❌ FAIL: Error creating parent viewing:', error.message);
      testsFailed++;
    }

    // Test 7: Test getAllViewings excludes sub-viewings
    console.log('\nTest 7: Testing getAllViewings excludes sub-viewings...');
    try {
      const allViewings = await Viewing.getAllViewings();
      const hasSubViewings = allViewings.some(v => v.parent_viewing_id !== null);
      
      if (!hasSubViewings) {
        console.log('✅ PASS: getAllViewings correctly excludes sub-viewings');
        testsPassed++;
      } else {
        console.log('❌ FAIL: getAllViewings includes sub-viewings');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAIL: Error in getAllViewings:', error.message);
      testsFailed++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('='.repeat(50) + '\n');

    if (testsFailed === 0) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testFollowUpViewings();

