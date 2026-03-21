// Setup script for HR System
// This script runs the necessary database migrations for the HR module

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');
const { paths: storagePaths, ensureStorageDirs } = require('./config/storage');

async function setupHRSystem() {
  console.log('🚀 Starting HR System setup...\n');
  
  try {
    // 1. Add work_location column to users table
    console.log('📋 Step 1: Adding work_location column to users table...');
    const addWorkLocationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add-work-location-to-users.sql'),
      'utf8'
    );
    await pool.query(addWorkLocationSQL);
    console.log('✅ work_location column added successfully\n');
    
    // 2. Create user_documents table
    console.log('📋 Step 2: Creating user_documents table...');
    const createDocumentsTableSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'create-user-documents-table.sql'),
      'utf8'
    );
    await pool.query(createDocumentsTableSQL);
    console.log('✅ user_documents table created successfully\n');
    
    // 3. Create documents directory if it doesn't exist (persistent storage)
    console.log('📋 Step 3: Creating documents directory...');
    ensureStorageDirs();
    const documentsDir = storagePaths.documentsUsers;
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
      console.log('✅ Documents directory created successfully\n');
    } else {
      console.log('ℹ️  Documents directory already exists\n');
    }
    
    // 4. Verify setup
    console.log('📋 Step 4: Verifying setup...');
    
    // Check if work_location column exists
    const checkWorkLocationQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='work_location'
    `;
    const workLocationCheck = await pool.query(checkWorkLocationQuery);
    
    if (workLocationCheck.rows.length > 0) {
      console.log('✅ work_location column verified');
    } else {
      console.log('❌ work_location column not found');
    }
    
    // Check if user_documents table exists
    const checkTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name='user_documents'
    `;
    const tableCheck = await pool.query(checkTableQuery);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ user_documents table verified');
    } else {
      console.log('❌ user_documents table not found');
    }
    
    // Check documents directory
    if (fs.existsSync(documentsDir)) {
      console.log('✅ Documents directory verified\n');
    } else {
      console.log('❌ Documents directory not found\n');
    }
    
    console.log('🎉 HR System setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Navigate to /dashboard/hr in your frontend');
    console.log('3. Start managing users and documents!\n');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupHRSystem();
