/**
 * Seed script: Delete all users except admin, then add members from the Agents DOB Excel data.
 * - Team leaders and their agents are inferred from the sheet (rows under "(Team Leader)" go to that team).
 * - Elsy Wehbe is set as operations_manager; Melissa Atallah and Gaelle Chamoun as operations.
 *
 * Run on Railway after deploy:
 *   node scripts/seed-agents-from-excel.js
 *
 * Requires: DATABASE_URL (or DB_* env). Optional: SEED_DEFAULT_PASSWORD (default: ChangeMe123!)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// Data extracted from "Agents DOB (1).xlsx" - structure: Team Leader then their agents, then Operation section
const MEMBERS = [
  // Nader Bechara's team
  { name: 'Nader Bechara', code: 'F-NB', phone: '76/306174', dob: '1998-12-06', location: 'Mansourieh', role: 'team_leader' },
  { name: 'Georgio Antoury', code: 'F-GA', phone: '03/476415', dob: '29/4/1997', location: 'Mar Roukoz', role: 'agent', teamLeaderCode: 'F-NB' },
  { name: 'Fadi Ziadeh', code: 'F-FZ', phone: '78/887439', dob: '27/5/1975', location: 'Dekwaneh, Ras El Dekwaneh, City Rama', role: 'agent', teamLeaderCode: 'F-NB' },
  { name: 'Ara Markarian', code: 'F-AM', phone: '70/325362', dob: '13/03/1992', location: 'Dora, Bourj Hammoud, baouchriyeh', role: 'agent', teamLeaderCode: 'F-NB' },
  { name: 'Charbel khalil', code: 'F-CKH', phone: '79/376682', dob: '2001-01-10', location: 'Jdaide', role: 'agent', teamLeaderCode: 'F-NB' },
  { name: 'Elie Ghafari', code: 'F-EGH', phone: '79/090077', dob: '2001-04-01', location: 'Sin El fil', role: 'agent', teamLeaderCode: 'F-NB' },
  { name: 'Charbel Kalouch', code: 'F-CK', phone: '76/594497', dob: '2003-06-12', location: 'Horch Tabet', role: 'agent', teamLeaderCode: 'F-NB' },
  // Tony Hajjar's team
  { name: 'Tony Hajjar', code: 'F-TH', phone: '76/561901', dob: null, location: null, role: 'team_leader' },
  { name: 'Miled Daniel', code: 'F-MD', phone: '76/196475', dob: '1996-01-07', location: 'Hazmiyeh, baabda', role: 'agent', teamLeaderCode: 'F-TH' },
  { name: 'Ghazi Mansour', code: 'F-GM', phone: '81/760460', dob: '1997-06-09', location: 'Al Zarif, Mar Elias, Tallet El khayyat, Spears, Msaytbeh, Part Of Sodeco', role: 'agent', teamLeaderCode: 'F-TH' },
  { name: 'Georges Bou Tanios', code: 'F-GBT', phone: '71/938858', dob: '1993-02-07', location: 'Zouk Mosbeh', role: 'agent', teamLeaderCode: 'F-TH' },
  { name: 'Elissar Jabbour', code: 'F-EJ', phone: '71/490493', dob: '19/03/1994', location: 'Shemlan', role: 'agent', teamLeaderCode: 'F-TH' },
  { name: 'Ali Ayash', code: 'F-AA', phone: '76/781288', dob: '14/06/1997', location: 'Basta, verdun', role: 'agent', teamLeaderCode: 'F-TH' },
  { name: 'Joseph Sarkis', code: 'F-JS', phone: '76/874818', dob: '13/4/1985', location: 'Achrafieh, Mar Mkhayel, Rmeil, Gemmayze, Part Of Sedeco', role: 'agent', teamLeaderCode: 'F-TH' },
  // Marc Mchantaf's team
  { name: 'Marc Mchantaf', code: 'F-MM', phone: '81/073318', dob: '28/12/1992', location: 'Dbayeh, Awkar', role: 'team_leader' },
  { name: 'Mario Hajj', code: 'F-MH', phone: '70/590233', dob: '2001-09-10', location: 'Naccache', role: 'agent', teamLeaderCode: 'F-MM' },
  { name: 'Eddy Daoud', code: 'F-ED', phone: '71/503972', dob: '14/1/1995', location: 'Zalka', role: 'agent', teamLeaderCode: 'F-MM' },
  { name: 'Vartan Avedissian', code: 'F-VA', phone: '03/195338', dob: '27/10/1995', location: 'Jal El Dib', role: 'agent', teamLeaderCode: 'F-MM' },
  // Marc Abou Jaoude's team
  { name: 'Marc Abou Jaoude', code: 'F-MAJ', phone: '71/834513', dob: '31/08/2001', location: 'Broummana, Mar Chaaya', role: 'team_leader' },
  { name: 'Sana Keserwany', code: 'F-SK', phone: '81/329032', dob: '1974-08-11', location: 'Tilal ain saadeh, ain saadeh, jouret el ballout', role: 'agent', teamLeaderCode: 'F-MAJ' },
  { name: 'Yorgo Mourady', code: 'F-YM', phone: '71/818081', dob: '2000-08-11', location: 'Bsalim', role: 'agent', teamLeaderCode: 'F-MAJ' },
  { name: 'Jean-louis Chaaya', code: 'F-JLC', phone: '03/461712', dob: '25/11/2000', location: 'Monteverde, Beit mery', role: 'agent', teamLeaderCode: 'F-MAJ' },
  { name: 'Elie Gebran', code: 'F-EG', phone: '76/654001', dob: '2001-12-09', location: 'Qennabet baabdat', role: 'agent', teamLeaderCode: 'F-MAJ' },
  { name: 'Carine Kazarian', code: 'F-CKA', phone: '03/026150', dob: '27/04/1987', location: 'Mazraat Yachouh', role: 'agent', teamLeaderCode: 'F-MAJ' },
  // Operations: Elsy = operations manager, others = operations
  { name: 'Elsy Wehbe', code: 'OPS-ELSY', phone: '71/668931', dob: '24/12/1996', location: null, role: 'operations_manager' },
  { name: 'Melissa Atallah', code: 'OPS-MA', phone: '76/499679', dob: '28/12/2001', location: null, role: 'operations' },
  { name: 'Gaelle Chamoun', code: 'OPS-GC', phone: '76/495946', dob: '1999-11-09', location: null, role: 'operations' },
];

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMe123!';
const EMAIL_DOMAIN = process.env.SEED_EMAIL_DOMAIN || 'finders.local';

function parseDob(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'object' && val.toISOString) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  if (!s) return null;
  const parts = s.split(/[/-]/);
  if (parts.length >= 3) {
    // Already ISO (YYYY-MM-DD or YYYY-M-D): first part is 4-digit year
    if (parts[0].length === 4 && parseInt(parts[0], 10) >= 1900) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // D/M/Y or D-M-Y
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${year}-${month}-${day}`;
  }
  if (parts.length === 2) return null;
  return s;
}

function slug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
}

function uniqueEmail(name, code) {
  const base = slug(name) || code.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}@${EMAIL_DOMAIN}`;
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('Seeding: delete non-admin users, then add members from Excel data...\n');

    const adminResult = await client.query(
      `SELECT id, email FROM users WHERE LOWER(TRIM(REPLACE(role, '_', ' '))) = 'admin' LIMIT 1`
    );
    const admin = adminResult.rows[0];
    if (!admin) {
      console.error('No admin user found. Create an admin first (e.g. run createAdmin.js).');
      process.exit(1);
    }
    const adminId = admin.id;
    console.log('Keeping admin:', admin.email, '(id:', adminId, ')\n');

    // Tables that RESTRICT delete on users - update or clear them first
    await client.query('DELETE FROM operations_daily_reports');
    console.log('Cleared operations_daily_reports (to allow user delete).');

    const leadsUpdate = await client.query(
      'UPDATE leads SET added_by_id = $1 WHERE added_by_id IS NOT NULL AND added_by_id != $1',
      [adminId]
    );
    if (leadsUpdate.rowCount > 0) {
      console.log('Reassigned', leadsUpdate.rowCount, 'lead(s) added_by_id to admin.');
    }

    // Delete all users except admin (FKs with SET NULL or CASCADE will be handled by DB)
    const del = await client.query(
      'DELETE FROM users WHERE id != $1 RETURNING id, email, role',
      [adminId]
    );
    console.log('Deleted', del.rowCount, 'non-admin user(s).\n');

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const codeToId = {};
    const usedEmails = new Set();

    function getEmail(member) {
      let email = uniqueEmail(member.name, member.code);
      let suffix = 0;
      while (usedEmails.has(email)) {
        suffix++;
        email = `${slug(member.name)}${suffix}@${EMAIL_DOMAIN}`;
      }
      usedEmails.add(email);
      return email;
    }

    for (const m of MEMBERS) {
      const email = getEmail(m);
      const dob = parseDob(m.dob);
      const userCode = m.code.trim();

      const insert = await client.query(
        `INSERT INTO users (name, email, password, role, phone, dob, work_location, user_code, is_assigned, assigned_to, address, added_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
         RETURNING id, user_code`,
        [
          m.name.trim(),
          email,
          hashedPassword,
          m.role,
          m.phone || null,
          dob,
          m.location || null,
          userCode,
          m.role === 'agent' && m.teamLeaderCode ? true : false,
          null,
          m.location || null,
          adminId,
        ]
      );
      const row = insert.rows[0];
      codeToId[row.user_code] = row.id;
      console.log('Created:', m.role, m.name, '→', email, '(code:', row.user_code, ')');
    }

    // Assign agents to team leaders (team_agents + users.assigned_to)
    console.log('\nAssigning agents to team leaders...');
    for (const m of MEMBERS) {
      if (m.role !== 'agent' || !m.teamLeaderCode) continue;
      const tlId = codeToId[m.teamLeaderCode];
      const agentId = codeToId[m.code];
      if (!tlId || !agentId) {
        console.warn('Skip assignment: team leader or agent code not found', m.teamLeaderCode, m.code);
        continue;
      }
      await client.query(
        `UPDATE users SET is_assigned = TRUE, assigned_to = $1, updated_at = NOW() WHERE id = $2`,
        [tlId, agentId]
      );
      await client.query(
        `INSERT INTO team_agents (team_leader_id, agent_id, assigned_by, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (team_leader_id, agent_id) DO UPDATE SET is_active = TRUE, updated_at = NOW()`,
        [tlId, agentId, adminId]
      );
      console.log('  ', m.name, '→', m.teamLeaderCode);
    }

    console.log('\nDone. Default password for all seeded users:', DEFAULT_PASSWORD);
    console.log('Users should change password on first login.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
