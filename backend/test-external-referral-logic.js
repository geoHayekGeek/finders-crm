// test-external-referral-logic.js
// Script to test the 30-day external referral logic

const LeadReferral = require('./models/leadReferralModel');
const Lead = require('./models/leadsModel');
const pool = require('./config/db');

// Helper function to create a date X days ago
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Helper function to print referral status
async function printReferralStatus(leadId, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label}`);
  console.log(`${'='.repeat(60)}`);
  
  const referrals = await LeadReferral.getReferralsByLeadId(leadId);
  
  if (referrals.length === 0) {
    console.log('No referrals found');
    return;
  }
  
  console.log(`\nFound ${referrals.length} referral(s):\n`);
  referrals.forEach((ref, index) => {
    const daysOld = Math.floor((new Date() - new Date(ref.referral_date)) / (1000 * 60 * 60 * 24));
    console.log(`${index + 1}. Referral ID: ${ref.id}`);
    console.log(`   Agent: ${ref.name} (ID: ${ref.agent_id})`);
    console.log(`   Type: ${ref.type}`);
    console.log(`   Date: ${new Date(ref.referral_date).toLocaleDateString()}`);
    console.log(`   Age: ${daysOld} days old`);
    console.log(`   Status: ${ref.external ? '❌ EXTERNAL (no commission)' : '✅ INTERNAL (earns commission)'}`);
    console.log('');
  });
}

// Test Scenario 1: Single referral should be internal
async function testScenario1() {
  console.log('\n\n' + '█'.repeat(70));
  console.log('TEST SCENARIO 1: New Referral (Initial)');
  console.log('█'.repeat(70));
  
  try {
    // Create a test lead
    const lead = await Lead.createLead({
      customer_name: 'Test Customer 1',
      phone_number: '+1234567890',
      agent_id: 1,
      agent_name: 'Test Agent',
      status: 'Active'
    });
    
    console.log(`✅ Created lead ID: ${lead.id}`);
    
    // Create a referral
    await LeadReferral.createReferral(lead.id, 1, 'Alice Smith', 'employee', new Date());
    console.log('✅ Created referral for Alice Smith');
    
    await printReferralStatus(lead.id, 'Initial State');
    
    // Cleanup
    await pool.query('DELETE FROM lead_referrals WHERE lead_id = $1', [lead.id]);
    await pool.query('DELETE FROM leads WHERE id = $1', [lead.id]);
    console.log('\n✅ Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('❌ Error in Scenario 1:', error.message);
    return false;
  }
}

// Test Scenario 2: Re-referral after 1 month
async function testScenario2() {
  console.log('\n\n' + '█'.repeat(70));
  console.log('TEST SCENARIO 2: Lead Re-Referred After 1 Month');
  console.log('█'.repeat(70));
  
  try {
    // Create a test lead
    const lead = await Lead.createLead({
      customer_name: 'Test Customer 2',
      phone_number: '+1234567891',
      agent_id: 1,
      agent_name: 'Test Agent',
      status: 'Active'
    });
    
    console.log(`✅ Created lead ID: ${lead.id}`);
    
    // Create initial referral 40 days ago
    await LeadReferral.createReferral(lead.id, 1, 'Alice Smith', 'employee', daysAgo(40));
    console.log('✅ Created referral for Alice Smith (40 days ago)');
    
    await printReferralStatus(lead.id, 'After Initial Referral (40 days ago)');
    
    // Reassign to new agent
    console.log('\n🔄 Processing reassignment to Bob Jones...');
    const result = await LeadReferral.processLeadReassignment(lead.id, 2, 1);
    console.log(`\n${result.message}`);
    
    await printReferralStatus(lead.id, 'After Reassignment (Today)');
    
    // Cleanup
    await pool.query('DELETE FROM lead_referrals WHERE lead_id = $1', [lead.id]);
    await pool.query('DELETE FROM leads WHERE id = $1', [lead.id]);
    console.log('\n✅ Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('❌ Error in Scenario 2:', error.message);
    return false;
  }
}

// Test Scenario 3: Re-referral within 1 month
async function testScenario3() {
  console.log('\n\n' + '█'.repeat(70));
  console.log('TEST SCENARIO 3: Lead Re-Referred Within 1 Month');
  console.log('█'.repeat(70));
  
  try {
    // Create a test lead
    const lead = await Lead.createLead({
      customer_name: 'Test Customer 3',
      phone_number: '+1234567892',
      agent_id: 1,
      agent_name: 'Test Agent',
      status: 'Active'
    });
    
    console.log(`✅ Created lead ID: ${lead.id}`);
    
    // Create initial referral 20 days ago
    await LeadReferral.createReferral(lead.id, 1, 'Alice Smith', 'employee', daysAgo(20));
    console.log('✅ Created referral for Alice Smith (20 days ago)');
    
    await printReferralStatus(lead.id, 'After Initial Referral (20 days ago)');
    
    // Reassign to new agent
    console.log('\n🔄 Processing reassignment to Bob Jones...');
    const result = await LeadReferral.processLeadReassignment(lead.id, 2, 1);
    console.log(`\n${result.message}`);
    
    await printReferralStatus(lead.id, 'After Reassignment (Today)');
    
    // Cleanup
    await pool.query('DELETE FROM lead_referrals WHERE lead_id = $1', [lead.id]);
    await pool.query('DELETE FROM leads WHERE id = $1', [lead.id]);
    console.log('\n✅ Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('❌ Error in Scenario 3:', error.message);
    return false;
  }
}

// Test Scenario 4: Multiple re-referrals (chain case)
async function testScenario4() {
  console.log('\n\n' + '█'.repeat(70));
  console.log('TEST SCENARIO 4: Multiple Re-Referrals (Chain Case)');
  console.log('█'.repeat(70));
  
  try {
    // Create a test lead
    const lead = await Lead.createLead({
      customer_name: 'Test Customer 4',
      phone_number: '+1234567893',
      agent_id: 1,
      agent_name: 'Test Agent',
      status: 'Active'
    });
    
    console.log(`✅ Created lead ID: ${lead.id}`);
    
    // Day 0: Alice -> Bob
    console.log('\n📅 Day 0: Alice refers lead to Bob');
    await LeadReferral.createReferral(lead.id, 1, 'Alice Smith', 'employee', daysAgo(80));
    await printReferralStatus(lead.id, 'Day 0: Alice → Bob');
    
    // Day 40: Bob -> Carol
    console.log('\n📅 Day 40: Bob refers lead to Carol');
    await LeadReferral.createReferral(lead.id, 2, 'Bob Jones', 'employee', daysAgo(40));
    console.log('\n🔄 Applying 30-day rule...');
    const result1 = await LeadReferral.applyExternalRuleToLeadReferrals(lead.id);
    console.log(`${result1.message}`);
    await printReferralStatus(lead.id, 'Day 40: Bob → Carol (Alice should be external)');
    
    // Day 80: Carol -> Dave
    console.log('\n📅 Day 80: Carol refers lead to Dave (today)');
    const result2 = await LeadReferral.processLeadReassignment(lead.id, 3, 2);
    console.log(`${result2.message}`);
    await printReferralStatus(lead.id, 'Day 80: Carol → Dave (Alice & Bob should be external)');
    
    // Cleanup
    await pool.query('DELETE FROM lead_referrals WHERE lead_id = $1', [lead.id]);
    await pool.query('DELETE FROM leads WHERE id = $1', [lead.id]);
    console.log('\n✅ Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('❌ Error in Scenario 4:', error.message);
    return false;
  }
}

// Test Scenario 5: Manual referrals with mixed dates
async function testScenario5() {
  console.log('\n\n' + '█'.repeat(70));
  console.log('TEST SCENARIO 5: Manual Referrals with Mixed Dates');
  console.log('█'.repeat(70));
  
  try {
    // Create a test lead
    const lead = await Lead.createLead({
      customer_name: 'Test Customer 5',
      phone_number: '+1234567894',
      agent_id: 1,
      agent_name: 'Test Agent',
      status: 'Active'
    });
    
    console.log(`✅ Created lead ID: ${lead.id}`);
    
    // Create multiple manual referrals with different dates
    await LeadReferral.createReferral(lead.id, 1, 'Alice Smith', 'employee', daysAgo(90));
    console.log('✅ Created referral for Alice (90 days ago)');
    
    await LeadReferral.createReferral(lead.id, 2, 'Bob Jones', 'employee', daysAgo(60));
    console.log('✅ Created referral for Bob (60 days ago)');
    
    await LeadReferral.createReferral(lead.id, null, 'External Partner', 'custom', daysAgo(45));
    console.log('✅ Created referral for External Partner (45 days ago)');
    
    await LeadReferral.createReferral(lead.id, 3, 'Carol White', 'employee', daysAgo(15));
    console.log('✅ Created referral for Carol (15 days ago)');
    
    await printReferralStatus(lead.id, 'Before Applying Rule');
    
    // Apply the 30-day rule
    console.log('\n🔄 Applying 30-day external rule...');
    const result = await LeadReferral.applyExternalRuleToLeadReferrals(lead.id);
    console.log(`${result.message}`);
    
    await printReferralStatus(lead.id, 'After Applying Rule (Carol is most recent)');
    
    // Cleanup
    await pool.query('DELETE FROM lead_referrals WHERE lead_id = $1', [lead.id]);
    await pool.query('DELETE FROM leads WHERE id = $1', [lead.id]);
    console.log('\n✅ Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('❌ Error in Scenario 5:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                    ║');
  console.log('║          LEAD REFERRAL EXTERNAL LOGIC TEST SUITE                  ║');
  console.log('║                                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Run all scenarios
  if (await testScenario1()) results.passed++; else results.failed++;
  if (await testScenario2()) results.passed++; else results.failed++;
  if (await testScenario3()) results.passed++; else results.failed++;
  if (await testScenario4()) results.passed++; else results.failed++;
  if (await testScenario5()) results.passed++; else results.failed++;
  
  // Print summary
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                         TEST SUMMARY                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`📊 Total Tests: ${results.passed + results.failed}`);
  console.log('');
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
  }
  
  console.log('');
  
  // Close database connection
  await pool.end();
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Fatal error running tests:', error);
    pool.end();
    process.exit(1);
  });
}

module.exports = {
  testScenario1,
  testScenario2,
  testScenario3,
  testScenario4,
  testScenario5,
  runAllTests
};

