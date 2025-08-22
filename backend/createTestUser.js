const bcrypt = require('bcryptjs')
const { Pool } = require('pg')
require('dotenv').config()

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'finders_crm',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
})

async function createTestUser() {
  try {
    console.log('🔍 Checking if test user already exists...')
    
    // Check if user already exists
    const checkUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['test@example.com']
    )
    
    if (checkUser.rows.length > 0) {
      console.log('✅ Test user already exists!')
      console.log('Email: test@example.com')
      console.log('Password: password123')
      console.log('Role:', checkUser.rows[0].role)
      return
    }
    
    console.log('📝 Creating test user...')
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    // Generate unique user code
    const userCode = 'TEST' + Date.now().toString().slice(-6)
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, user_code, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
       RETURNING id, name, email, role, user_code`,
      ['Test User', 'test@example.com', hashedPassword, 'admin', userCode]
    )
    
    const user = result.rows[0]
    
    console.log('✅ Test user created successfully!')
    console.log('ID:', user.id)
    console.log('Name:', user.name)
    console.log('Email:', user.email)
    console.log('Password: password123')
    console.log('Role:', user.role)
    console.log('User Code:', user.user_code)
    console.log('\n🎯 You can now login with:')
    console.log('Email: test@example.com')
    console.log('Password: password123')
    
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  } finally {
    await pool.end()
  }
}

createTestUser()
