/**
 * Seed statuses and categories for property import.
 * Uses INSERT ... WHERE NOT EXISTS (no ON CONFLICT) so it works on Railway even if
 * the schema has different constraints than expected.
 * Run: node scripts/seed-statuses-categories.js
 */

require('dotenv').config();
const pool = require('../config/db');

const STATUSES = [
  ['Active', 'active', 'Property is available for sale/rent', '#10B981', true],
  ['Inactive', 'inactive', 'Property is temporarily unavailable', '#6B7280', true],
  ['Sold', 'sold', 'Property has been sold', '#EF4444', false],
  ['Rented', 'rented', 'Property has been rented', '#8B5CF6', false],
  ['Under Contract', 'under_contract', 'Property is under contract', '#F59E0B', true],
  ['Pending', 'pending', 'Property is pending approval', '#3B82F6', true],
  ['Reserved', 'reserved', 'Property is reserved for a client', '#EC4899', true],
];

const CATEGORIES = [
  ['Apartment', 'A', 'Residential apartment units'],
  ['Chalet', 'C', 'Mountain or vacation chalets'],
  ['Duplex', 'D', 'Two-story residential units'],
  ['Factory', 'F', 'Industrial factory buildings'],
  ['Land', 'L', 'Vacant land for development'],
  ['Office', 'O', 'Commercial office spaces'],
  ['Cloud Kitchen', 'CK', 'Food preparation facilities'],
  ['Polyclinic', 'PC', 'Medical clinic facilities'],
  ['Project', 'P', 'Development projects'],
  ['Pub', 'PB', 'Bar and pub establishments'],
  ['Restaurant', 'R', 'Dining establishments'],
  ['Rooftop', 'RT', 'Rooftop spaces and terraces'],
  ['Shop', 'S', 'Retail shop spaces'],
  ['Showroom', 'SR', 'Display and exhibition spaces'],
  ['Studio', 'ST', 'Small residential or work units'],
  ['Villa', 'V', 'Luxury residential villas'],
  ['Warehouse', 'W', 'Storage and logistics facilities'],
  ['Industrial Building', 'IB', 'Industrial facilities'],
  ['Pharmacy', 'PH', 'Medical pharmacy facilities'],
  ['Bank', 'B', 'Financial institution facilities'],
  ['Hangar', 'H', 'Aircraft storage facilities'],
  ['Industrial Warehouse', 'IW', 'Large industrial storage facilities'],
];

async function seedStatuses() {
  let added = 0;
  for (const [name, code, description, color, can_be_referred] of STATUSES) {
    const r = await pool.query(
      `INSERT INTO statuses (name, code, description, color, can_be_referred)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($2))`,
      [name, code, description, color, can_be_referred]
    );
    if (r.rowCount > 0) added++;
  }
  const count = (await pool.query('SELECT COUNT(*) FROM statuses')).rows[0].count;
  return { added, total: parseInt(count, 10) };
}

async function seedCategories() {
  let added = 0;
  for (const [name, code, description] of CATEGORIES) {
    const r = await pool.query(
      `INSERT INTO categories (name, code, description)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($2))`,
      [name, code, description]
    );
    if (r.rowCount > 0) added++;
  }
  const count = (await pool.query('SELECT COUNT(*) FROM categories')).rows[0].count;
  return { added, total: parseInt(count, 10) };
}

async function run() {
  try {
    console.log('Seeding statuses and categories...\n');
    const s = await seedStatuses();
    console.log('Statuses:', s.total, 'total (', s.added, 'added)');
    const c = await seedCategories();
    console.log('Categories:', c.total, 'total (', c.added, 'added)');
    console.log('\nDone. Property import should work now.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
