// Quick verification script for reference number function
const pool = require('./config/db');

async function verifyFunction() {
  try {
    console.log('🔍 Verifying reference number function...\n');
    
    // Test 1: Generate a rent property reference
    const rentResult = await pool.query(
      `SELECT generate_reference_number('S', 'rent') as ref_number`
    );
    console.log('✅ Rent property test:', rentResult.rows[0].ref_number);
    
    // Test 2: Generate a sale property reference
    const saleResult = await pool.query(
      `SELECT generate_reference_number('S', 'sale') as ref_number`
    );
    console.log('✅ Sale property test:', saleResult.rows[0].ref_number);
    
    // Test 3: Verify format
    const ref = rentResult.rows[0].ref_number;
    const year = new Date().getFullYear().toString().slice(-2);
    
    console.log('\n📋 Format verification:');
    console.log(`  Reference: ${ref}`);
    console.log(`  Starts with F: ${ref.startsWith('F') ? '✅' : '❌'}`);
    console.log(`  Contains year ${year}: ${ref.includes(year) ? '✅' : '❌'}`);
    console.log(`  Ends with 3 digits: ${/^\d{3}$/.test(ref.slice(-3)) ? '✅' : '❌'}`);
    console.log(`  Length: ${ref.length} characters`);
    
    console.log('\n🎉 Function verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyFunction();

