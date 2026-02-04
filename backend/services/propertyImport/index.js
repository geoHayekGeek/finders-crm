/**
 * Property import service: dry-run (preview) and commit.
 * Uses savepoints per row so one failure does not roll back others.
 * Reuses leadsImport: operationsMatcher, agentMatcher, normalizers (phone, date, price, etc.).
 */

const pool = require('../../config/db');
const logger = require('../../utils/logger');
const { normalizeRole } = require('../../utils/roleUtils');
const { parseFile } = require('./parser');
const {
  isEmpty,
  normalizeDateWithFallbackAndReference,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
  normalizeSurface,
  normalizeYesNo,
  normalizeBuiltYear,
  normalizeViewType,
  detailsToJsonb,
  interiorDetailsToJsonb,
} = require('./normalizers');
const { resolveStatus } = require('./statusMapper');
const { resolveCategory } = require('./categoryMapper');
const { matchOperationsUser } = require('../leadsImport/operationsMatcher');
const { matchAgent } = require('../leadsImport/agentMatcher');
const PropertyReferral = require('../../models/propertyReferralModel');

const DEFAULT_PROPERTY_TYPE = 'sale';
const PREVIEW_ROW_LIMIT = 50;
const PROPERTY_IMPORT_SOURCE = 'Property Import';

function normalizeKeyForMatch(key) {
  if (key == null) return '';
  return String(key).toLowerCase().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

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

async function loadLookups() {
  const [statusesResult, categoriesResult, usersResult, assignableResult, refSourcesResult] = await Promise.all([
    pool.query('SELECT id, name, code FROM statuses ORDER BY name'),
    pool.query('SELECT id, name, code FROM categories WHERE is_active = true ORDER BY name'),
    pool.query(`
      SELECT id, name, role, user_code, updated_at
      FROM users
      WHERE role IN ('admin', 'operations_manager', 'operations', 'agent_manager', 'team_leader', 'agent')
      ORDER BY name
    `),
    pool.query(`
      SELECT id, name, role
      FROM users
      WHERE role IN ('agent', 'team_leader', 'agent_manager', 'admin', 'operations', 'operations_manager')
      ORDER BY name
    `),
    pool.query('SELECT id, source_name FROM reference_sources ORDER BY source_name'),
  ]);
  return {
    statuses: statusesResult.rows,
    categories: categoriesResult.rows,
    users: usersResult.rows,
    assignableUsers: assignableResult.rows,
    referenceSources: refSourcesResult.rows,
  };
}

/** Ensure "Property Import" exists in reference_sources; return id. */
async function ensurePropertyImportSource(client) {
  const r = await client.query(
    `INSERT INTO reference_sources (source_name) VALUES ($1)
     ON CONFLICT (source_name) DO UPDATE SET source_name = EXCLUDED.source_name
     RETURNING id`,
    [PROPERTY_IMPORT_SOURCE]
  );
  return r.rows[0].id;
}

/** Find lead by normalized phone. */
async function findLeadByPhone(client, phoneNumber) {
  if (!phoneNumber) return null;
  const r = await client.query('SELECT id FROM leads WHERE phone_number = $1 LIMIT 1', [phoneNumber]);
  return r.rows[0] || null;
}

/** Create owner lead and one referral. Returns lead id. */
async function createOwnerLead(client, payload) {
  const {
    date,
    owner_name,
    phone_number,
    reference_source_id,
    added_by_id,
    agent_id,
    agent_name,
    importerUserId,
    importerRole,
  } = payload;
  const lead = await client.query(
    `INSERT INTO leads (date, customer_name, phone_number, reference_source_id, added_by_id, status, agent_id, agent_name)
     VALUES ($1, $2, $3, $4, $5, 'Active', $6, $7)
     RETURNING id`,
    [
      date,
      owner_name,
      phone_number,
      reference_source_id,
      added_by_id,
      agent_id || null,
      agent_name || null,
    ]
  );
  const leadId = lead.rows[0].id;
  const referralName = agent_id ? (payload.agentUserName || owner_name) : (agent_name || owner_name);
  const referralType = agent_id ? 'employee' : 'custom';
  await client.query(
    `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external)
     VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [leadId, agent_id || null, referralName, referralType, date]
  );
  return leadId;
}

/** Check if reference_number exists. */
async function findPropertyByReference(client, referenceNumber) {
  if (!referenceNumber || !String(referenceNumber).trim()) return null;
  const r = await client.query('SELECT id FROM properties WHERE reference_number = $1 LIMIT 1', [String(referenceNumber).trim()]);
  return r.rows[0] || null;
}

/** Generate reference number (category code + property_type). */
async function generateReferenceNumber(client, categoryId, propertyType) {
  const cat = await client.query('SELECT code FROM categories WHERE id = $1', [categoryId]);
  if (!cat.rows[0]) return null;
  const r = await client.query('SELECT generate_reference_number($1, $2)', [cat.rows[0].code, propertyType || 'sale']);
  return r.rows[0].generate_reference_number;
}

/**
 * Process one raw row into normalized payload + warnings + errors.
 * fallbackDate: when provided, used as date when current row date is missing or invalid (e.g. previous row's date).
 */
function processRow(row, rowNumber, lookups, importerUserId, fallbackDate) {
  const warnings = [];
  const errors = [];

  const referenceRaw = getRowValue(row, 'reference');
  const reference = referenceRaw ? String(referenceRaw).trim() : '';

  const dateRaw = getRowValue(row, 'date');
  const dateResult = normalizeDateWithFallbackAndReference(dateRaw, fallbackDate, reference);
  if (dateResult.warning) warnings.push(dateResult.warning);
  const date = dateResult.value;

  const activeRaw = getRowValue(row, 'active', 'status');
  const statusRes = resolveStatus(lookups.statuses, activeRaw);
  let status_id = statusRes.statusId;
  let status_name = statusRes.statusName;
  if (statusRes.error) {
    warnings.push(statusRes.error);
    const active = lookups.statuses.find(s => (s.code || '').toLowerCase() === 'active' || (s.name || '').toLowerCase() === 'active');
    if (active) {
      status_id = active.id;
      status_name = active.name;
    }
  }

  const locationRaw = getRowValue(row, 'location');
  let location = locationRaw ? String(locationRaw).trim().replace(/\s+/g, ' ') : '';
  if (!location) {
    warnings.push('Location missing; using "—"');
    location = '—';
  }

  const categoryRaw = getRowValue(row, 'category');
  const categoryRes = resolveCategory(lookups.categories, categoryRaw);
  let category_id = categoryRes.categoryId;
  let category_name = categoryRes.categoryName;
  if (categoryRes.error) {
    warnings.push(categoryRes.error);
    if (lookups.categories.length > 0) {
      category_id = lookups.categories[0].id;
      category_name = lookups.categories[0].name;
    }
  }
  if (categoryRes.warning) warnings.push(categoryRes.warning);

  const building_name = getRowValue(row, 'bldg name', 'bldg name', 'building name', 'building') || null;

  const ownerNameRaw = getRowValue(row, 'owner name', 'owner name', 'owner');
  const ownerResult = normalizeCustomerName(ownerNameRaw);
  let owner_name = ownerResult.value;
  if (ownerResult.error) {
    warnings.push(ownerResult.error);
    owner_name = null;
  }

  const phoneRaw = getRowValue(row, 'phone number', 'phone number', 'phone');
  const phoneResult = normalizePhone(phoneRaw);
  let phone_number = phoneResult.value;
  if (phoneResult.error) {
    warnings.push(phoneResult.error);
    phone_number = null;
  }
  if (phoneResult.warning) warnings.push(phoneResult.warning);

  const surfaceRaw = getRowValue(row, 'surface');
  const surfaceResult = normalizeSurface(surfaceRaw);
  let surface = surfaceResult.value;
  if (surfaceResult.error) {
    warnings.push(surfaceResult.error);
    surface = null;
  }
  if (surfaceResult.warning) warnings.push(surfaceResult.warning);

  const detailsRaw = getRowValue(row, 'details');
  const detailsJsonb = detailsToJsonb(detailsRaw);

  const interiorRaw = getRowValue(row, 'interior details', 'interior details');
  const interiorDetailsJsonb = interiorDetailsToJsonb(interiorRaw);

  const builtYearRaw = getRowValue(row, 'built year', 'built year');
  const builtYearResult = normalizeBuiltYear(builtYearRaw);
  const built_year = builtYearResult.value;
  if (builtYearResult.warning) warnings.push(builtYearResult.warning);

  const conciergeRaw = getRowValue(row, 'concierge');
  const conciergeResult = normalizeYesNo(conciergeRaw);
  const concierge = conciergeResult.value === true;

  const viewRaw = getRowValue(row, 'view');
  const viewResult = normalizeViewType(viewRaw);
  const view_type = viewResult.value;
  if (viewResult.warning) warnings.push(viewResult.warning);

  const agentRaw = getRowValue(row, 'agent name', 'agent name', 'agent');
  const agentMatch = matchAgent(lookups.assignableUsers, agentRaw);
  const agent_id = agentMatch.userId;
  const agent_name = agentMatch.fallbackName;
  if (agentMatch.warning) warnings.push(agentMatch.warning);

  const priceRaw = getRowValue(row, 'price');
  const priceResult = normalizePrice(priceRaw);
  const price = priceResult.value != null ? priceResult.value : 0;
  if (priceResult.warning) warnings.push(priceResult.warning);
  if (price === 0 && isEmpty(priceRaw)) warnings.push('Price missing; stored as 0');

  const notes = getRowValue(row, 'notes') || null;

  const operationsRaw = getRowValue(row, 'operations');
  const opsMatch = matchOperationsUser(lookups.users, operationsRaw);
  const created_by_id = opsMatch.userId != null ? opsMatch.userId : importerUserId;
  const created_by_name = opsMatch.userName || null;
  if (opsMatch.warning) warnings.push(opsMatch.warning);

  const finalCategoryId = category_id ?? (lookups.categories.length > 0 ? lookups.categories[0].id : null);
  const finalCategoryName = category_name ?? (lookups.categories.length > 0 ? lookups.categories[0].name : null);
  const isError = errors.length > 0 || status_id == null || finalCategoryId == null;

  return {
    rowNumber,
    date,
    reference,
    status_id,
    status_name,
    location,
    category_id: finalCategoryId,
    category_name: finalCategoryName,
    building_name,
    owner_name,
    phone_number,
    surface,
    detailsJsonb,
    interiorDetailsJsonb,
    built_year,
    concierge,
    view_type,
    agent_id,
    agent_name,
    agentUserName: agentMatch.userName,
    price,
    notes,
    created_by_id,
    created_by_name,
    warnings,
    errors,
    isError,
    _raw: { operationsRaw, agentRaw },
  };
}

async function dryRun(buffer, mimeType, importerUserId) {
  const lookups = await loadLookups();
  const { rows, sheetWarning } = await parseFile(buffer, mimeType);
  const allProcessed = [];
  const summary = { total: rows.length, valid: 0, invalid: 0, duplicate: 0, willImportCount: 0 };
  let lastValidDate = undefined;

  for (let i = 0; i < rows.length; i++) {
    const processed = processRow(rows[i], i + 2, lookups, importerUserId, lastValidDate);
    allProcessed.push(processed);
    if (processed.isError) summary.invalid++;
    else summary.valid++;
    if (processed.date) lastValidDate = processed.date;
  }

  const client = await pool.connect();
  try {
    const existingRefs = new Set();
    const refRows = await client.query('SELECT reference_number FROM properties');
    refRows.rows.forEach(r => existingRefs.add((r.reference_number || '').trim()));
    for (const p of allProcessed) {
      if (p.isError) continue;
      const ref = (p.reference || '').trim();
      if (ref && existingRefs.has(ref)) summary.duplicate++;
    }
    summary.willImportCount = summary.valid - (summary.duplicate > summary.valid ? summary.valid : summary.duplicate);
  } finally {
    client.release();
  }

  const preview = allProcessed.slice(0, PREVIEW_ROW_LIMIT);
  const errors = allProcessed.filter(p => p.isError);

  return {
    success: true,
    dryRun: true,
    sheetWarning: sheetWarning || null,
    summary: {
      totalRows: summary.total,
      validRows: summary.valid,
      invalidRows: summary.invalid,
      duplicatesCount: summary.duplicate,
      willImportCount: summary.willImportCount,
    },
    rowsPreview: preview.map(p => ({
      rowNumber: p.rowNumber,
      original: {
        reference: p.reference,
        location: p.location,
        owner_name: p.owner_name,
        phone_number: p.phone_number,
        surface: p.surface,
        price: p.price,
      },
      normalized: {
        date: p.date,
        status_name: p.status_name,
        category_name: p.category_name,
        location: p.location,
        owner_name: p.owner_name,
        phone_number: p.phone_number,
        surface: p.surface,
        price: p.price,
        view_type: p.view_type,
        concierge: p.concierge,
      },
      resolved: {
        status_id: p.status_id,
        category_id: p.category_id,
        created_by_id: p.created_by_id,
        created_by_name: p.created_by_name,
        agent_id: p.agent_id,
        agent_name: p.agent_name,
      },
      warnings: p.warnings,
      errors: p.errors,
    })),
    errors: errors.map(e => ({
      rowNumber: e.rowNumber,
      errors: e.errors,
      warnings: e.warnings,
      reference: e.reference,
      owner_name: e.owner_name,
      phone_number: e.phone_number,
    })),
  };
}

/**
 * Commit import: one transaction, savepoint per row. Import only valid rows; skip invalid.
 * mode: 'skip' | 'upsert' for duplicates (by reference_number).
 */
async function commitImport(buffer, mimeType, importerUserId, importerRole, mode = 'skip') {
  const lookups = await loadLookups();
  const { rows, sheetWarning } = await parseFile(buffer, mimeType);
  const processed = [];
  let lastValidDate = undefined;
  for (let i = 0; i < rows.length; i++) {
    const p = processRow(rows[i], i + 2, lookups, importerUserId, lastValidDate);
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
    const propertyImportSourceId = await ensurePropertyImportSource(client);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const savepoint = `sp_${i}`;
      await client.query(`SAVEPOINT ${savepoint}`);
      try {
        let owner_id = null;
        if (row.phone_number) {
          const existingLead = await findLeadByPhone(client, row.phone_number);
          if (existingLead) {
            owner_id = existingLead.id;
          } else {
            owner_id = await createOwnerLead(client, {
              date: row.date,
              owner_name: row.owner_name || '—',
              phone_number: row.phone_number,
              reference_source_id: propertyImportSourceId,
              added_by_id: row.created_by_id,
              agent_id: row.agent_id,
              agent_name: row.agent_name,
              agentUserName: row.agentUserName,
              importerUserId,
              importerRole,
            });
          }
        }

        let reference_number = (row.reference || '').trim();
        const existingByRef = reference_number ? await findPropertyByReference(client, reference_number) : null;

        if (existingByRef) {
          if (mode === 'skip') {
            skippedDuplicates.push({
              rowNumber: row.rowNumber,
              message: 'Duplicate reference (skipped)',
              propertyId: existingByRef.id,
              reference_number,
            });
            await client.query(`RELEASE SAVEPOINT ${savepoint}`);
            continue;
          }
          const updateFields = [];
          const values = [];
          let vi = 1;
          if (row.status_id != null) { updateFields.push(`status_id = $${vi++}`); values.push(row.status_id); }
          if (row.date) { updateFields.push(`created_at = $${vi++}::timestamptz`); values.push(`${row.date}T12:00:00.000Z`); }
          if (row.location) { updateFields.push(`location = $${vi++}`); values.push(row.location); }
          if (row.surface != null) { updateFields.push(`surface = $${vi++}`); values.push(row.surface); }
          if (row.price != null) { updateFields.push(`price = $${vi++}`); values.push(row.price); }
          if (row.agent_id != null) { updateFields.push(`agent_id = $${vi++}`); values.push(row.agent_id); }
          if (row.notes != null) { updateFields.push(`notes = $${vi++}`); values.push(row.notes); }
          if (row.built_year != null) { updateFields.push(`built_year = $${vi++}`); values.push(row.built_year); }
          if (row.detailsJsonb) { updateFields.push(`details = $${vi++}::jsonb`); values.push(row.detailsJsonb); }
          if (row.interiorDetailsJsonb) { updateFields.push(`interior_details = $${vi++}::jsonb`); values.push(row.interiorDetailsJsonb); }
          if (updateFields.length === 0) {
            skippedDuplicates.push({ rowNumber: row.rowNumber, message: 'Duplicate (no updates)', propertyId: existingByRef.id, reference_number });
            await client.query(`RELEASE SAVEPOINT ${savepoint}`);
            continue;
          }
          values.push(existingByRef.id);
          await client.query(
            `UPDATE properties SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${vi}`,
            values
          );
          imported.push({ rowNumber: row.rowNumber, message: 'Updated', propertyId: existingByRef.id, reference_number });
          await client.query(`RELEASE SAVEPOINT ${savepoint}`);
          continue;
        }

        if (!reference_number) {
          reference_number = await generateReferenceNumber(client, row.category_id, DEFAULT_PROPERTY_TYPE);
          if (!reference_number) throw new Error('Could not generate reference number');
        }

        const listedDate = row.date ? `${row.date}T12:00:00.000Z` : null;
        await client.query(
          `INSERT INTO properties (
            reference_number, status_id, property_type, location, category_id, building_name,
            owner_id, owner_name, phone_number, surface, details, interior_details,
            payment_facilities, payment_facilities_specification,
            built_year, view_type, concierge, agent_id, price, notes, property_url,
            closed_date, sold_amount, buyer_id, commission, platform_id, main_image, image_gallery, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, FALSE, NULL, $13, $14, $15, $16, $17, $18, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, COALESCE($19::timestamptz, NOW()), $20)
          RETURNING id`,
          [
            reference_number,
            row.status_id,
            DEFAULT_PROPERTY_TYPE,
            row.location,
            row.category_id,
            row.building_name,
            owner_id,
            row.owner_name ?? '—',
            row.phone_number ?? null,
            row.surface ?? null,
            row.detailsJsonb,
            row.interiorDetailsJsonb,
            row.built_year,
            row.view_type,
            row.concierge,
            row.agent_id,
            row.price,
            row.notes,
            listedDate,
            row.created_by_id,
          ]
        );
        const propertyId = (await client.query('SELECT id FROM properties WHERE reference_number = $1', [reference_number])).rows[0].id;

        const referralDate = row.date;
        const referralName = row.agent_id ? (row.agentUserName || row.owner_name) : (row.agent_name || row.owner_name || 'Import');
        const safeReferralName = referralName || 'Import';
        const referralType = row.agent_id ? 'employee' : 'custom';
        await client.query(
          `INSERT INTO referrals (property_id, employee_id, name, type, date, external) VALUES ($1, $2, $3, $4, $5, FALSE)`,
          [propertyId, row.agent_id, safeReferralName, referralType, referralDate]
        );
        await client.query('UPDATE properties SET referrals_count = 1 WHERE id = $1', [propertyId]);

        imported.push({ rowNumber: row.rowNumber, message: 'Imported', propertyId, reference_number });
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        logger.error('Property import row failed', { rowNumber: row.rowNumber, error: err.message });
        errors.push({
          rowNumber: row.rowNumber,
          errors: [err.message || 'Import failed'],
          reference: row.reference,
          owner_name: row.owner_name,
        });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Property import commit failed', { userId: importerUserId, error: err.message });
    throw err;
  } finally {
    client.release();
  }

  for (const item of imported) {
    if (item.propertyId) {
      try {
        await PropertyReferral.applyExternalRuleToPropertyReferrals(item.propertyId);
      } catch (ruleErr) {
        logger.error('Apply 30-day rule failed for property', { propertyId: item.propertyId, error: ruleErr.message });
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
    errors: errors.map(e => ({ rowNumber: e.rowNumber, errors: e.errors, reference: e.reference, owner_name: e.owner_name })),
  };
}

module.exports = {
  dryRun,
  commitImport,
  loadLookups,
  processRow,
  getRowValue,
  ensurePropertyImportSource,
  findLeadByPhone,
  findPropertyByReference,
  createOwnerLead,
  PREVIEW_ROW_LIMIT,
};
