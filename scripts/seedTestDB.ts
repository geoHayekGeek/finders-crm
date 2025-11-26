/**
 * Script to seed the test database with initial data
 * Usage: npx ts-node scripts/seedTestDB.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

async function seedTestDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'finders_crm_test',
  });

  try {
    console.log('🌱 Seeding test database...');

    const saltRounds = 10;

    // Seed categories
    console.log('  → Seeding categories...');
    await pool.query(`
      INSERT INTO categories (name, code, description, is_active) VALUES
      ('Apartment', 'A', 'Residential apartment units', true),
      ('Villa', 'V', 'Luxury residential villas', true),
      ('Office', 'O', 'Commercial office spaces', true),
      ('Shop', 'S', 'Retail shop spaces', true),
      ('Land', 'L', 'Vacant land for development', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed statuses
    console.log('  → Seeding statuses...');
    await pool.query(`
      INSERT INTO statuses (name, code, description, is_active) VALUES
      ('Available', 'AVL', 'Property is available', true),
      ('Sold', 'SOLD', 'Property has been sold', true),
      ('Rented', 'RENT', 'Property has been rented', true),
      ('Reserved', 'RSV', 'Property is reserved', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed lead statuses
    console.log('  → Seeding lead statuses...');
    await pool.query(`
      INSERT INTO lead_statuses (name, code, description, is_active) VALUES
      ('Active', 'ACT', 'Lead is active', true),
      ('Closed', 'CLS', 'Lead is closed', true),
      ('Follow Up', 'FLW', 'Lead requires follow up', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed users
    console.log('  → Seeding users...');
    const adminPassword = await bcrypt.hash(process.env.TEST_ADMIN_PASSWORD || 'admin123', saltRounds);
    const agentPassword = await bcrypt.hash(process.env.TEST_AGENT_PASSWORD || 'agent123', saltRounds);
    const opsManagerPassword = await bcrypt.hash(process.env.TEST_OPS_MANAGER_PASSWORD || 'ops123', saltRounds);

    await pool.query(`
      INSERT INTO users (name, email, password, role, is_active, user_code) VALUES
      ('Admin User', $1, $2, 'admin', true, 'ADM001'),
      ('Agent User', $3, $4, 'agent', true, 'AGT001'),
      ('Operations Manager', $5, $6, 'operations manager', true, 'OPS001')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        is_active = EXCLUDED.is_active;
    `, [
      process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
      adminPassword,
      process.env.TEST_AGENT_EMAIL || 'agent@test.com',
      agentPassword,
      process.env.TEST_OPS_MANAGER_EMAIL || 'opsmanager@test.com',
      opsManagerPassword,
    ]);

    // Get user IDs
    const usersResult = await pool.query(`
      SELECT id, email, role FROM users WHERE email IN ($1, $2, $3)
    `, [
      process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
      process.env.TEST_AGENT_EMAIL || 'agent@test.com',
      process.env.TEST_OPS_MANAGER_EMAIL || 'opsmanager@test.com',
    ]);

    const adminUser = usersResult.rows.find(u => u.role === 'admin');
    const agentUser = usersResult.rows.find(u => u.role === 'agent');
    const opsManager = usersResult.rows.find(u => u.role === 'operations manager');

    // Get category and status IDs
    const categoriesResult = await pool.query('SELECT id, code FROM categories WHERE code IN ($1, $2, $3)', ['A', 'V', 'O']);
    const statusesResult = await pool.query('SELECT id, code FROM statuses WHERE code IN ($1, $2)', ['AVL', 'SOLD']);

    const apartmentCategory = categoriesResult.rows.find(c => c.code === 'A');
    const villaCategory = categoriesResult.rows.find(c => c.code === 'V');
    const officeCategory = categoriesResult.rows.find(c => c.code === 'O');
    const availableStatus = statusesResult.rows.find(s => s.code === 'AVL');
    const soldStatus = statusesResult.rows.find(s => s.code === 'SOLD');

    // Seed properties
    if (apartmentCategory && availableStatus && agentUser) {
      console.log('  → Seeding properties...');
      await pool.query(`
        INSERT INTO properties (
          reference_number, status_id, property_type, location, category_id,
          owner_name, phone_number, surface, details, interior_details,
          view_type, concierge, agent_id, price, notes
        ) VALUES
        ('A-001', $1, 'sale', 'Beirut, Downtown', $2, 'John Doe', '+961-1-123456', 120.5, '3rd floor, balcony, parking', 'Fully furnished', 'sea view', true, $3, 250000, 'Great property'),
        ('A-002', $1, 'rent', 'Beirut, Hamra', $2, 'Jane Smith', '+961-1-234567', 90.0, '2nd floor, balcony', 'Semi-furnished', 'open view', false, $3, 1500, 'Monthly rent'),
        ('V-001', $1, 'sale', 'Mount Lebanon, Broumana', $4, 'Bob Wilson', '+961-4-345678', 300.0, '2 floors, garden, parking', 'Fully furnished', 'mountain view', true, $3, 500000, 'Luxury villa'),
        ('O-001', $1, 'rent', 'Beirut, Sodeco', $5, 'Alice Brown', '+961-1-456789', 150.0, 'Ground floor, street access', 'Office space', 'no view', false, $3, 3000, 'Commercial office'),
        ('A-003', $6, 'sale', 'Beirut, Ashrafieh', $2, 'Charlie Davis', '+961-1-567890', 110.0, '4th floor, balcony, parking', 'Unfurnished', 'sea view', true, $3, 200000, 'Recently sold')
        ON CONFLICT (reference_number) DO NOTHING;
      `, [
        availableStatus.id,
        apartmentCategory.id,
        agentUser.id,
        villaCategory.id,
        officeCategory.id,
        soldStatus.id,
      ]);
    }

    // Seed leads
    const leadStatusResult = await pool.query("SELECT id FROM lead_statuses WHERE code = 'ACT'");
    const activeLeadStatus = leadStatusResult.rows[0];

    if (activeLeadStatus && agentUser) {
      console.log('  → Seeding leads...');
      await pool.query(`
        INSERT INTO leads (customer_name, phone_number, agent_id, referral_source, notes, status, date) VALUES
        ('Customer One', '+961-3-111111', $1, 'Website', 'Interested in apartments', $2, CURRENT_DATE),
        ('Customer Two', '+961-3-222222', $1, 'Referral', 'Looking for villa', $2, CURRENT_DATE),
        ('Customer Three', '+961-3-333333', $1, 'Walk-in', 'Needs office space', $2, CURRENT_DATE - INTERVAL '1 day'),
        ('Customer Four', '+961-3-444444', $1, 'Social Media', 'First-time buyer', $2, CURRENT_DATE - INTERVAL '2 days'),
        ('Customer Five', '+961-3-555555', $1, 'Phone Call', 'Commercial property', $2, CURRENT_DATE - INTERVAL '3 days')
        ON CONFLICT DO NOTHING;
      `, [agentUser.id, activeLeadStatus.id]);
    }

    // Seed calendar events
    if (adminUser) {
      console.log('  → Seeding calendar events...');
      await pool.query(`
        INSERT INTO calendar_events (title, description, start_time, end_time, all_day, color, type, created_by_id) VALUES
        ('Property Showing', 'Showing property A-001 to customer', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '1 hour', false, 'blue', 'showing', $1),
        ('Team Meeting', 'Weekly team meeting', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '2 hours', false, 'green', 'meeting', $1),
        ('Property Inspection', 'Inspection for property V-001', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '30 minutes', false, 'yellow', 'inspection', $1)
        ON CONFLICT DO NOTHING;
      `, [adminUser.id]);
    }

    console.log('✅ Test data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTestDatabase();

