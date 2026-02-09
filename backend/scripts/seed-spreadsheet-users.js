/**
 * Seed users from the spreadsheet data.
 * - Agents section → role 'agent' (no spreadsheet Code column used; user_code from initials).
 * - Operation: Elsy Wehbe → 'operations_manager', Melissa Atallah & Gaelle Chamoun → 'operations'.
 *
 * Usage: node scripts/seed-spreadsheet-users.js
 * Requires: DB env vars, and existing admin to run (optional).
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const DEFAULT_PASSWORD = 'Password1';
const SALT_ROUNDS = 10;

// Normalize DD/MM/YYYY → YYYY-MM-DD
function toISODate(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const parts = String(ddmmyyyy).trim().split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y) return null;
  const month = m < 10 ? '0' + m : String(m);
  const day = d < 10 ? '0' + d : String(d);
  const year = y < 100 ? 2000 + y : y;
  return `${year}-${month}-${day}`;
}

// Phone: keep as-is (e.g. 76/306174) or normalize to +961
function normalizePhone(phone) {
  if (!phone || !String(phone).trim()) return null;
  const s = String(phone).replace(/\s/g, '').replace(/\//g, '');
  if (/^\d{7,8}$/.test(s)) return '+961' + s;
  if (/^0\d{7,8}$/.test(s)) return '+961' + s.slice(1);
  return String(phone).trim();
}

// Unique user_code from name (initials, no F- prefix)
function initialsCode(name) {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function uniqueEmail(name, existing) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  let email = `${base}@finderscrm.local`;
  let n = 0;
  while (existing.has(email)) {
    n++;
    email = `${base}${n}@finderscrm.local`;
  }
  existing.add(email);
  return email;
}

const AGENTS = [
  { name: 'Nader Bechara', phone: '76/306174', dob: '12/6/1998', location: 'Mansourieh' },
  { name: 'Georgio Antoury', phone: '03/476415', dob: '29/4/1997', location: 'Mar Roukoz' },
  { name: 'Fadi Ziadeh', phone: null, dob: null, location: null },
  { name: 'Ara Markarian', phone: null, dob: null, location: null },
  { name: 'Charbel khalil', phone: null, dob: null, location: null },
  { name: 'Elie Ghafari', phone: null, dob: null, location: null },
  { name: 'Charbel Kalouch', phone: null, dob: null, location: null },
  { name: 'Miled Daniel', phone: null, dob: null, location: null },
  { name: 'Ghazi Mansour', phone: null, dob: null, location: null },
  { name: 'Georges Bou Tanios', phone: null, dob: null, location: null },
  { name: 'Elissar Jabbour', phone: null, dob: null, location: null },
  { name: 'Ali Ayash', phone: null, dob: null, location: null },
  { name: 'Joseph Sarkis', phone: null, dob: null, location: null },
  { name: 'Marc Mchantaf', phone: null, dob: null, location: null },
  { name: 'Mario Hajj', phone: null, dob: null, location: null },
  { name: 'Eddy Daoud', phone: null, dob: null, location: null },
  { name: 'Vartan Avedissian', phone: null, dob: null, location: null },
  { name: 'Marc Abou Jaoude', phone: null, dob: null, location: null },
  { name: 'Sana Keserwany', phone: null, dob: null, location: null },
  { name: 'Yorgo Mourady', phone: null, dob: null, location: null },
  { name: 'Jean-louis Chaaya', phone: null, dob: null, location: null },
  { name: 'Elie Gebran', phone: null, dob: null, location: null },
  { name: 'Carine Kazarian', phone: null, dob: null, location: null },
];

const OPERATION = [
  { name: 'Elsy Wehbe', role: 'operations_manager', phone: '71/668931', dob: '24/12/1996', location: null },
  { name: 'Melissa Atallah', role: 'operations', phone: '76/499679', dob: '28/12/2001', location: null },
  { name: 'Gaelle Chamoun', role: 'operations', phone: '76/495946', dob: '11/9/1999', location: null },
];

async function seed() {
  const client = await pool.connect();
  const usedCodes = new Set();
  const usedEmails = new Set();

  try {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    // Ensure we have existing emails/codes from DB
    const existing = await client.query('SELECT email, user_code FROM users');
    existing.rows.forEach((r) => {
      if (r.email) usedEmails.add(r.email);
      if (r.user_code) usedCodes.add(r.user_code);
    });

    let codeFor = (name) => {
      let base = initialsCode(name);
      let code = base;
      let n = 0;
      while (usedCodes.has(code)) {
        n++;
        code = base + n;
      }
      usedCodes.add(code);
      return code;
    };

    console.log('Adding agents...');
    for (const row of AGENTS) {
      const email = uniqueEmail(row.name, usedEmails);
      const user_code = codeFor(row.name);
      await client.query(
        `INSERT INTO users (name, email, password, role, phone, dob, work_location, user_code, address)
         VALUES ($1, $2, $3, 'agent', $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING`,
        [
          row.name,
          email,
          hashedPassword,
          normalizePhone(row.phone),
          toISODate(row.dob),
          row.location || null,
          user_code,
          row.location || null,
        ]
      );
    }
    console.log(`   ${AGENTS.length} agents processed.`);

    console.log('Adding operation staff...');
    for (const row of OPERATION) {
      const email = uniqueEmail(row.name, usedEmails);
      const user_code = codeFor(row.name);
      await client.query(
        `INSERT INTO users (name, email, password, role, phone, dob, work_location, user_code, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO NOTHING`,
        [
          row.name,
          email,
          hashedPassword,
          row.role,
          normalizePhone(row.phone),
          toISODate(row.dob),
          row.location || null,
          user_code,
          row.location || null,
        ]
      );
    }
    console.log(`   ${OPERATION.length} operation staff processed (Elsy Wehbe = operations_manager).`);

    console.log('\nDone. Default password for new users: ' + DEFAULT_PASSWORD);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
