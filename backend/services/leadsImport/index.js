/**
 * Lead import service: dry-run (preview) and commit (single transaction).
 * Uses: normalizers, parser, sourceMapper, operationsMatcher, agentMatcher.
 */

const pool = require('../../config/db');
const logger = require('../../utils/logger');
const { normalizeRole } = require('../../utils/roleUtils');
const Lead = require('../../models/leadsModel');
const LeadReferral = require('../../models/leadReferralModel');
const LeadNote = require('../../models/leadNotesModel');
const { parseFile } = require('./parser');
const {
  normalizeDateWithFallbackAndReference,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
} = require('./normalizers');
const { resolveSourceName } = require('./sourceMapper');
const { matchOperationsUser } = require('./operationsMatcher');
const { matchAgent } = require('./agentMatcher');

const DEFAULT_LEAD_STATUS = 'Active';
const DUPLICATE_KEY_PHONE_NAME = true; // use normalized phone + normalized customer_name
const PREVIEW_ROW_LIMIT = 50;

/**
 * Resolve effective importer user ID. If the given ID does not exist in users (e.g. stale JWT after DB reset),
 * fall back to the first admin so the import can proceed and added_by_id FK is satisfied.
 */
async function resolveImporterUserId(clientOrPool, importerUserId) {
  const poolInstance = clientOrPool || pool;
  const check = await poolInstance.query(
    'SELECT id FROM users WHERE id = $1 LIMIT 1',
    [importerUserId]
  );
  if (check.rows.length > 0) return importerUserId;
  const adminResult = await poolInstance.query(
    `SELECT id FROM users WHERE LOWER(TRIM(REPLACE(role, '_', ' '))) = 'admin' LIMIT 1`
  );
  const fallbackId = adminResult.rows[0]?.id;
  if (!fallbackId) {
    throw new Error('No admin user found in database. Lead import requires at least one admin.');
  }
  logger.warn('Importer user not found in database; using admin as added_by fallback', {
    importerUserId,
    fallbackId,
  });
  return fallbackId;
}

/** Normalize a header/key for matching: lowercase, collapse spaces, strip non-breaking space. */
function normalizeKeyForMatch(key) {
  if (key == null) return '';
  return String(key).toLowerCase().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get header key from raw row (case-insensitive, trim, collapse spaces). Prefer exact match then partial.
 */
function getRowValue(row, ...possibleKeys) {
  const keys = possibleKeys.map(k => normalizeKeyForMatch(k));
  for (const [k, v] of Object.entries(row)) {
    const keyNorm = normalizeKeyForMatch(k);
    if (!keyNorm) continue;
    if (keys.includes(keyNorm)) return v != null ? String(v).replace(/\u00A0/g, ' ').trim() : '';
    if (keys.some(p => keyNorm.includes(p) || p.includes(keyNorm))) return v != null ? String(v).replace(/\u00A0/g, ' ').trim() : '';
    if (keys.some(p => keyNorm.replace(/\s/g, '') === p.replace(/\s/g, ''))) return v != null ? String(v).replace(/\u00A0/g, ' ').trim() : '';
  }
  return '';
}

/**
 * Load users for operations matching (id, name, role, user_code, updated_at).
 * Load users assignable as agents (id, name, role) - agents, team leaders, etc.
 * Load reference_sources (id, source_name).
 */
async function loadLookups() {
  const [usersResult, sourcesResult, assignableResult] = await Promise.all([
    pool.query(`
      SELECT id, name, role, user_code, updated_at
      FROM users
      WHERE role IN ('admin', 'operations_manager', 'operations', 'agent_manager', 'team_leader', 'agent')
      ORDER BY name
    `),
    pool.query('SELECT id, source_name FROM reference_sources ORDER BY source_name'),
    pool.query(`
      SELECT id, name, role
      FROM users
      WHERE role IN ('agent', 'team_leader', 'agent_manager', 'admin', 'operations', 'operations_manager')
      ORDER BY name
    `),
  ]);
  return {
    users: usersResult.rows,
    referenceSources: sourcesResult.rows,
    assignableUsers: assignableResult.rows,
  };
}

/**
 * Resolve source name to reference_source id. If not found and canCreate, insert and return new id.
 * Otherwise try "Other" or "External"; if none, return null.
 */
async function resolveReferenceSourceId(client, sourceNameRaw, canCreate) {
  const canonical = resolveSourceName(sourceNameRaw);
  if (!canonical) return { id: null, created: false };

  const byName = await client.query(
    'SELECT id FROM reference_sources WHERE LOWER(TRIM(source_name)) = LOWER($1)',
    [canonical]
  );
  if (byName.rows.length > 0) return { id: byName.rows[0].id, created: false };

  if (canCreate) {
    const ins = await client.query(
      `INSERT INTO reference_sources (source_name) VALUES ($1) ON CONFLICT (source_name) DO UPDATE SET source_name = EXCLUDED.source_name RETURNING id`,
      [canonical]
    );
    return { id: ins.rows[0].id, created: true };
  }

  const other = await client.query(
    `SELECT id FROM reference_sources WHERE LOWER(TRIM(source_name)) IN ('other', 'external') LIMIT 1`
  );
  return { id: other.rows[0]?.id || null, created: false };
}

/**
 * Check if lead already exists by normalized phone + customer_name.
 * When phone is null, matches leads with null phone and same customer_name (case-insensitive).
 */
async function findDuplicateLead(client, normalizedPhone, normalizedCustomerName) {
  const result = await client.query(
    `SELECT id FROM leads
     WHERE TRIM(LOWER(customer_name)) = TRIM(LOWER($2))
       AND ((($1::text IS NULL) AND (phone_number IS NULL)) OR (phone_number = $1))
     LIMIT 1`,
    [normalizedPhone, normalizedCustomerName]
  );
  return result.rows[0] || null;
}

/**
 * Process one raw row into normalized payload + warnings + error.
 * Lookups: referenceSources (array), users (array), assignableUsers (array).
 */
function processRow(row, rowNumber, lookups, importerUserId, canCreateSource, fallbackDate) {
  const dateRaw = getRowValue(row, 'date');
  const referenceRaw = getRowValue(row, 'reference', 'code', 'lead code');
  const reference = referenceRaw ? String(referenceRaw).trim() : '';
  const customerRaw = getRowValue(row, 'customer name', 'customername', 'customer_name');
  const phoneRaw = getRowValue(row, 'phone number', 'phonenumber', 'phone_number');
  const agentRaw = getRowValue(row, 'agent name', 'agentname', 'agent_name');
  const priceRaw = getRowValue(row, 'price');
  const sourceRaw = getRowValue(row, 'source');
  const operationsRaw = getRowValue(row, 'operations');

  const warnings = [];
  const errors = [];
  let reference_source_id = null;
  let added_by_id = importerUserId;
  let added_by_name = null;
  let agent_id = null;
  let agent_name = null;

  const dateResult = normalizeDateWithFallbackAndReference(dateRaw, fallbackDate, reference);
  if (dateResult.warning) warnings.push(dateResult.warning);
  const date = dateResult.value;

  const nameResult = normalizeCustomerName(customerRaw);
  if (nameResult.error) {
    errors.push(nameResult.error);
    return { rowNumber, date, customer_name: null, phone_number: null, price: null, reference_source_id: null, added_by_id, added_by_name, agent_id, agent_name, status: DEFAULT_LEAD_STATUS, warnings, errors, isError: true };
  }
  const customer_name = nameResult.value;

  const phoneResult = normalizePhone(phoneRaw);
  let phone_number = phoneResult.value;
  if (phoneResult.error) {
    warnings.push(phoneResult.error);
    phone_number = null;
  }
  if (phoneResult.warning) warnings.push(phoneResult.warning);

  const priceResult = normalizePrice(priceRaw);
  if (priceResult.warning) warnings.push(priceResult.warning);
  const price = priceResult.value;

  const canonicalSource = resolveSourceName(sourceRaw);
  const sourceMatch = lookups.referenceSources.find(s => (s.source_name || '').toLowerCase() === (canonicalSource || '').toLowerCase());
  if (canonicalSource && sourceMatch) {
    reference_source_id = sourceMatch.id;
  } else if (canonicalSource && canCreateSource) {
    reference_source_id = 'CREATE'; // resolved in commit with insert
  } else if (canonicalSource) {
    const other = lookups.referenceSources.find(s => ['other', 'external'].includes((s.source_name || '').toLowerCase()));
    reference_source_id = other ? other.id : null;
    if (!reference_source_id) warnings.push('Unknown source; stored without source');
  } else {
    if (sourceRaw) warnings.push('Unknown source; stored without source');
    else warnings.push('Source missing');
  }

  const opsMatch = matchOperationsUser(lookups.users, operationsRaw);
  added_by_id = opsMatch.userId != null ? opsMatch.userId : importerUserId;
  added_by_name = opsMatch.userName || null;
  if (opsMatch.warning) warnings.push(opsMatch.warning);

  const agentMatch = matchAgent(lookups.assignableUsers, agentRaw);
  agent_id = agentMatch.userId;
  agent_name = agentMatch.fallbackName;
  if (agentMatch.warning) warnings.push(agentMatch.warning);

  const isError = errors.length > 0;
  const refSourceId = reference_source_id === 'CREATE' ? null : reference_source_id;
  const reference_source_name = refSourceId && lookups.referenceSources
    ? (lookups.referenceSources.find(s => s.id === refSourceId)?.source_name) || (canonicalSource || null)
    : (canonicalSource || null);
  return {
    rowNumber,
    date,
    reference: reference || null,
    customer_name,
    phone_number,
    price,
    reference_source_id: refSourceId,
    reference_source_name: reference_source_name || (refSourceId ? 'Unknown' : null),
    _createSource: reference_source_id === 'CREATE' ? canonicalSource : null,
    added_by_id,
    added_by_name,
    agent_id,
    agent_name,
    status: DEFAULT_LEAD_STATUS,
    warnings,
    errors,
    isError,
    _raw: { sourceRaw, operationsRaw, agentRaw },
  };
}

/**
 * Dry-run: parse file, process each row (no DB writes), return preview + summary.
 */
async function dryRun(buffer, mimeType, importerUserId, importerRole) {
  const effectiveUserId = await resolveImporterUserId(pool, importerUserId);
  const canCreateSource = ['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizeRole(importerRole));
  const lookups = await loadLookups();
  const { rows, sheetWarning } = await parseFile(buffer, mimeType);
  const allProcessed = [];
  const summary = { valid: 0, invalid: 0, duplicate: 0, total: rows.length };
  let lastValidDate = undefined;

  for (let i = 0; i < rows.length; i++) {
    const processed = processRow(rows[i], i + 2, lookups, effectiveUserId, canCreateSource, lastValidDate); // row 2 = first data in 1-based + header
    allProcessed.push(processed);
    if (processed.isError) summary.invalid++;
    else summary.valid++;
    if (processed.date) lastValidDate = processed.date;
  }

  const preview = allProcessed.slice(0, PREVIEW_ROW_LIMIT);
  const errors = allProcessed.filter(p => p.isError);
  const valid = allProcessed.filter(p => !p.isError);

  return {
    success: true,
    dryRun: true,
    sheetWarning: sheetWarning || null,
    summary: {
      total: summary.total,
      valid: summary.valid,
      invalid: summary.invalid,
      duplicate: summary.duplicate,
    },
    parsedRows: preview,
    errors: errors.map(e => ({ rowNumber: e.rowNumber, errors: e.errors, warnings: e.warnings, customer_name: e.customer_name, phone_number: e.phone_number })),
    duplicateKeys: [], // only known after DB check in commit
  };
}

/**
 * Commit import: single transaction, insert leads + referrals + notes, apply 30-day rule.
 * mode: 'skip' | 'upsert'
 */
async function commitImport(buffer, mimeType, importerUserId, importerRole, mode = 'skip') {
  const effectiveUserId = await resolveImporterUserId(pool, importerUserId);
  const canCreateSource = ['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizeRole(importerRole));
  const lookups = await loadLookups();
  const { rows, sheetWarning } = await parseFile(buffer, mimeType);

  const processed = [];
  let lastValidDate = undefined;
  for (let i = 0; i < rows.length; i++) {
    const p = processRow(rows[i], i + 2, lookups, effectiveUserId, canCreateSource, lastValidDate);
    processed.push(p);
    if (p.date) lastValidDate = p.date;
  }

  const validRows = processed.filter(p => !p.isError);
  const errors = processed.filter(p => p.isError);
  const imported = [];
  const skippedDuplicates = [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const row of validRows) {
      const phone_number = row.phone_number;
      const customer_name = row.customer_name;
      let reference_source_id = row.reference_source_id;
      if (row._createSource) {
        const res = await resolveReferenceSourceId(client, row._createSource, canCreateSource);
        reference_source_id = res.id;
        if (res.created && row.warnings) row.warnings.push(`Source "${row._createSource}" created`);
      }

      const existing = await findDuplicateLead(client, phone_number, customer_name);
      if (existing) {
        if (mode === 'skip') {
          skippedDuplicates.push({ rowNumber: row.rowNumber, message: 'Duplicate (skipped)', leadId: existing.id, customer_name, phone_number });
          continue;
        }
        const updateFields = [];
        const values = [];
        let vi = 1;
        if (row.date) { updateFields.push(`date = $${vi++}`); values.push(row.date); }
        if (row.date) { updateFields.push(`created_at = $${vi++}::timestamptz`); values.push(`${row.date}T12:00:00.000Z`); }
        if (row.price != null) { updateFields.push(`price = $${vi++}`); values.push(row.price); }
        if (row.reference_source_id) { updateFields.push(`reference_source_id = $${vi++}`); values.push(reference_source_id); }
        if (row.agent_id != null) { updateFields.push(`agent_id = $${vi++}`); values.push(row.agent_id); }
        if (row.agent_name != null) { updateFields.push(`agent_name = $${vi++}`); values.push(row.agent_name); }
        if (row.added_by_id) { updateFields.push(`added_by_id = $${vi++}`); values.push(row.added_by_id); }
        if (updateFields.length === 0) {
          skippedDuplicates.push({ rowNumber: row.rowNumber, message: 'Duplicate (no updates)', leadId: existing.id, customer_name, phone_number });
          continue;
        }
        values.push(existing.id);
        await client.query(
          `UPDATE leads SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${vi} RETURNING id`,
          values
        );
        await client.query(
          `INSERT INTO lead_notes (lead_id, created_by, created_by_role, note_text) VALUES ($1, $2, $3, $4)`,
          [existing.id, effectiveUserId, importerRole, `Updated via import ${new Date().toISOString()}`]
        );
        imported.push({ rowNumber: row.rowNumber, message: 'Updated', leadId: existing.id, customer_name, phone_number });
        continue;
      }

      const listedDate = row.date ? `${row.date}T12:00:00.000Z` : null;
      const ins = await client.query(
        `INSERT INTO leads (date, customer_name, phone_number, agent_id, agent_name, price, reference_source_id, added_by_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, NOW())) RETURNING id`,
        [
          row.date,
          customer_name,
          phone_number,
          row.agent_id,
          row.agent_name,
          row.price,
          reference_source_id,
          row.added_by_id,
          row.status,
          listedDate,
        ]
      );
      const leadId = ins.rows[0].id;

      const referralDate = row.date;
      const referralName = row.agent_id ? (row._raw && lookups.assignableUsers.find(u => u.id === row.agent_id)?.name) || row.agent_name || 'Agent' : (row.agent_name || customer_name);
      const referralType = row.agent_id ? 'employee' : 'custom';
      await client.query(
        `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external) VALUES ($1, $2, $3, $4, $5, FALSE)`,
        [leadId, row.agent_id, referralName, referralType, referralDate]
      );

      // One note per lead per user (idx_lead_notes_unique_per_user): combine all import messages
      const noteParts = [];
      if (row.warnings && row.warnings.length > 0) {
        noteParts.push(`Import: ${row.warnings.join('; ')}`);
      }
      if (row._raw && row._raw.operationsRaw && !row.added_by_name && row.added_by_id === effectiveUserId) {
        noteParts.push(`Ops: ${row._raw.operationsRaw} (not in system)`);
      }
      if (noteParts.length > 0) {
        const noteText = noteParts.join(' ');
        await client.query(
          `INSERT INTO lead_notes (lead_id, created_by, created_by_role, note_text) VALUES ($1, $2, $3, $4)`,
          [leadId, effectiveUserId, importerRole, noteText]
        );
      }

      imported.push({ rowNumber: row.rowNumber, message: 'Imported', leadId, customer_name, phone_number });
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Lead import commit failed', { importerUserId, error: err.message });
    throw err;
  } finally {
    client.release();
  }

  for (const item of imported) {
    if (item.leadId) {
      try {
        await LeadReferral.applyExternalRuleToLeadReferrals(item.leadId);
      } catch (ruleErr) {
        logger.error('Apply 30-day rule failed for lead', { leadId: item.leadId, error: ruleErr.message });
      }
    }
  }

  return {
    success: true,
    dryRun: false,
    sheetWarning: sheetWarning || null,
    importedCount: imported.length,
    skippedDuplicatesCount: skippedDuplicates.length,
    errorCount: errors.length,
    imported,
    skipped_duplicates: skippedDuplicates,
    errors: errors.map(e => ({ rowNumber: e.rowNumber, errors: e.errors, customer_name: e.customer_name, phone_number: e.phone_number })),
  };
}

module.exports = {
  dryRun,
  commitImport,
  loadLookups,
  processRow,
  getRowValue,
  resolveReferenceSourceId,
  findDuplicateLead,
  DEFAULT_LEAD_STATUS,
  PREVIEW_ROW_LIMIT,
};
