// backend/models/operationsDailyReportModel.js
// Model for Operations Daily Reports

const pool = require('../config/db');

function loadOperationsDailyFieldConfig() {
  try {
    return require('../utils/operationsDailyFields');
  } catch (error) {
    const WORKBOOK_DAILY_FIELD_DEFINITIONS = [
      { key: 'properties_added', label: 'New Data', workbookHeader: 'New Data', calculated: true, defaultValue: 0, visible: true },
      { key: 'preparing_daily_report', label: 'Preparing Daily report', workbookHeader: 'Preparing Daily report', calculated: false, defaultValue: 0, visible: true },
      { key: 'phone_calls_duty_time', label: 'PHONE CALLS duty time', workbookHeader: 'PHONE CALLS duty time', calculated: false, defaultValue: 0, visible: true },
      { key: 'replying_to_msg_on_sm_duty_time', label: 'Replying to msg on SM duty time', workbookHeader: 'Replying to msg on SM duty time', calculated: false, defaultValue: 0, visible: true },
      { key: 'cvs', label: "CV's", workbookHeader: "CV's", calculated: false, defaultValue: 0, visible: true },
      { key: 'amending_previous_properties', label: 'Amending previous data', workbookHeader: 'Amending previous data', calculated: true, defaultValue: 0, visible: true },
      { key: 'filling', label: 'Filling', workbookHeader: 'Filling', calculated: false, defaultValue: 0, visible: true },
      { key: 'preparing_contract', label: 'Preparing contract', workbookHeader: 'Preparing contract', calculated: false, defaultValue: 0, visible: true },
      { key: 'tasks_efficiency', label: 'Tasks Efficiency', workbookHeader: 'Tasks Efficiency', calculated: false, defaultValue: 0, visible: true },
      { key: 'phone_calls_out_of_duty_time', label: 'Phone calls out of duty time', workbookHeader: 'Phone calls out of duty time', calculated: false, defaultValue: 0, visible: true },
      { key: 'replying_to_msg_on_sm_out_of_duty_time', label: 'Replying to msg on SM out of duty time', workbookHeader: 'Replying to msg on SM out of duty time', calculated: false, defaultValue: 0, visible: true },
      { key: 'replying_to_whats_up_msg_out_of_duty_time', label: "Replying to what's up msg out of duty time", workbookHeader: "Replying to what's up msg out of duty time", calculated: false, defaultValue: 0, visible: true }
    ];

    const LEGACY_DAILY_FIELD_DEFINITIONS = [
      { key: 'leads_responded_to', label: 'Leads Responded To', workbookHeader: null, calculated: true, defaultValue: 0, visible: false },
      { key: 'leads_responded_out_of_duty_time', label: 'Leads Responded Out of Duty Time', workbookHeader: null, calculated: false, defaultValue: 0, visible: false },
      { key: 'tasks_efficiency_duty_time', label: 'Tasks Efficiency - Duty Time', workbookHeader: null, calculated: false, defaultValue: 0, visible: false },
      { key: 'tasks_efficiency_uniform', label: 'Tasks Efficiency - Uniform', workbookHeader: null, calculated: false, defaultValue: 0, visible: false },
      { key: 'tasks_efficiency_after_duty', label: 'Tasks Efficiency - After Duty Performance', workbookHeader: null, calculated: false, defaultValue: 0, visible: false }
    ];

    const DAILY_FIELD_DEFINITIONS = [
      ...WORKBOOK_DAILY_FIELD_DEFINITIONS,
      ...LEGACY_DAILY_FIELD_DEFINITIONS
    ];

    const normalizeDailyIntegerValue = (value, fallback = 0) => {
      if (value === undefined || value === null || value === '') {
        return fallback;
      }

      const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const hasOwnValue = (source, field) => Object.prototype.hasOwnProperty.call(source || {}, field);
    const resolveDailyFieldValues = (calculatedData = {}, inputFields = {}) => {
      const resolved = {};

      DAILY_FIELD_DEFINITIONS.forEach((definition) => {
        const fallback = definition.defaultValue ?? 0;

        if (definition.calculated && hasOwnValue(calculatedData, definition.key)) {
          resolved[definition.key] = hasOwnValue(inputFields, definition.key)
            ? normalizeDailyIntegerValue(inputFields[definition.key], normalizeDailyIntegerValue(calculatedData[definition.key], fallback))
            : normalizeDailyIntegerValue(calculatedData[definition.key], fallback);
          return;
        }

        if (hasOwnValue(inputFields, definition.key)) {
          resolved[definition.key] = normalizeDailyIntegerValue(inputFields[definition.key], fallback);
          return;
        }

        if (hasOwnValue(calculatedData, definition.key)) {
          resolved[definition.key] = normalizeDailyIntegerValue(calculatedData[definition.key], fallback);
          return;
        }

        resolved[definition.key] = fallback;
      });

      return resolved;
    };

    return {
      WORKBOOK_DAILY_FIELD_DEFINITIONS,
      LEGACY_DAILY_FIELD_DEFINITIONS,
      DAILY_FIELD_DEFINITIONS,
      DAILY_CALCULATED_FIELDS: DAILY_FIELD_DEFINITIONS.filter((field) => field.calculated).map((field) => field.key),
      DAILY_MANUAL_FIELDS: DAILY_FIELD_DEFINITIONS.filter((field) => !field.calculated).map((field) => field.key),
      DAILY_INSERT_FIELDS: DAILY_FIELD_DEFINITIONS.map((field) => field.key),
      DAILY_VISIBLE_FIELD_DEFINITIONS: DAILY_FIELD_DEFINITIONS.filter((field) => field.visible),
      DAILY_EXPORT_HEADERS: [
        'Admin and Operations',
        ...WORKBOOK_DAILY_FIELD_DEFINITIONS.map((field) => field.workbookHeader)
      ],
      normalizeDailyIntegerValue,
      resolveDailyFieldValues
    };
  }
}

const operationsDailyFieldConfig = loadOperationsDailyFieldConfig();
const {
  WORKBOOK_DAILY_FIELD_DEFINITIONS,
  LEGACY_DAILY_FIELD_DEFINITIONS,
  DAILY_FIELD_DEFINITIONS,
  DAILY_CALCULATED_FIELDS,
  DAILY_MANUAL_FIELDS,
  DAILY_INSERT_FIELDS,
  DAILY_VISIBLE_FIELD_DEFINITIONS,
  DAILY_EXPORT_HEADERS,
  resolveDailyFieldValues,
  normalizeDailyIntegerValue
} = operationsDailyFieldConfig;

/**
 * Normalize and validate a date
 * @param {Date|string} dateInput 
 * @returns {{ dateUtc: Date, dateStr: string }}
 */
function normalizeDate(dateInput) {
  if (!dateInput) {
    throw new Error('Date is required');
  }

  let year;
  let month;
  let day;

  if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) {
      throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
    }

    year = dateInput.getUTCFullYear();
    month = dateInput.getUTCMonth() + 1;
    day = dateInput.getUTCDate();
  } else {
    const rawInput = String(dateInput).trim();
    const isoMatch = rawInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      const parsedDate = new Date(rawInput);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
      }

      year = parsedDate.getUTCFullYear();
      month = parsedDate.getUTCMonth() + 1;
      day = parsedDate.getUTCDate();
    }
  }

  const dateUtc = new Date(Date.UTC(
    year,
    month - 1,
    day,
    0, 0, 0, 0
  ));

  if (
    dateUtc.getUTCFullYear() !== year ||
    dateUtc.getUTCMonth() + 1 !== month ||
    dateUtc.getUTCDate() !== day
  ) {
    throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
  }

  return {
    dateUtc,
    dateStr: dateUtc.toISOString().split('T')[0]
  };
}

function hasOwnValue(source, field) {
  return Object.prototype.hasOwnProperty.call(source || {}, field);
}

/**
 * Calculate daily operations data for a given operations user and date
 * @param {number} operations_id - Operations user ID
 * @param {Date|string} reportDateInput - Report date
 * @returns {Promise<Object>} - Calculated daily data
 */
async function calculateDailyData(operations_id, reportDateInput) {
  const client = await pool.connect();
  
  try {
    const normalizedOperationsId = Number(operations_id);
    if (!Number.isInteger(normalizedOperationsId) || normalizedOperationsId <= 0) {
      throw new Error('Invalid operations user ID');
    }

    const { dateStr } = normalizeDate(reportDateInput);

    // Get operations user name
    const userResult = await client.query(
      'SELECT id, name FROM users WHERE id = $1 AND role IN (\'operations\', \'operations_manager\')',
      [normalizedOperationsId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid operations user ID');
    }

    const operationsName = userResult.rows[0].name;

    // These counts are intentionally calculated from the database so the UI can
    // preview them before saving, while still allowing an override when needed.
    const [
      propertiesAddedResult,
      leadsRespondedResult,
      amendingPropertiesResult
    ] = await Promise.all([
      client.query(
        `SELECT COUNT(*) as count
         FROM properties
         WHERE created_by = $1
           AND DATE(created_at AT TIME ZONE 'UTC') = $2::date`,
        [normalizedOperationsId, dateStr]
      ),
      client.query(
        `SELECT COUNT(*) as count
         FROM leads
         WHERE added_by_id = $1
           AND DATE(created_at AT TIME ZONE 'UTC') = $2::date`,
        [normalizedOperationsId, dateStr]
      ),
      client.query(
        `SELECT COUNT(*) as count
         FROM properties
         WHERE created_by = $1
           AND DATE(updated_at AT TIME ZONE 'UTC') = $2::date
           AND DATE(created_at AT TIME ZONE 'UTC') < $2::date`,
        [normalizedOperationsId, dateStr]
      )
    ]);

    const propertiesAdded = parseInt(propertiesAddedResult.rows[0].count, 10) || 0;
    const leadsRespondedTo = parseInt(leadsRespondedResult.rows[0].count, 10) || 0;
    const amendingPreviousProperties = parseInt(amendingPropertiesResult.rows[0].count, 10) || 0;

    return {
      operations_id: normalizedOperationsId,
      operations_name: operationsName,
      report_date: dateStr,
      properties_added: propertiesAdded,
      leads_responded_to: leadsRespondedTo,
      amending_previous_properties: amendingPreviousProperties
    };
  } finally {
    client.release();
  }
}

/**
 * Create a new operations daily report
 * @param {number} operations_id - Operations user ID
 * @param {string} report_date - Report date (YYYY-MM-DD)
 * @param {Object} inputFields - Manual input fields and optional calculated overrides
 * @returns {Promise<Object>} - Created report
 */
async function createReportRecord(db, operations_id, report_date, inputFields = {}) {
  const { dateStr } = normalizeDate(report_date);
  const normalizedOperationsId = Number(operations_id);

  const existing = await db.query(
    'SELECT id FROM operations_daily_reports WHERE operations_id = $1 AND report_date = $2',
    [normalizedOperationsId, dateStr]
  );

  if (existing.rows.length > 0) {
    throw new Error('A report already exists for this operations user and date');
  }

  const calculatedData = await calculateDailyData(normalizedOperationsId, dateStr);
  const resolvedFields = resolveDailyFieldValues(calculatedData, inputFields);
  const insertColumns = [
    'operations_id',
    'operations_name',
    'report_date',
    ...DAILY_INSERT_FIELDS
  ];
  const insertValues = [
    calculatedData.operations_id,
    calculatedData.operations_name,
    calculatedData.report_date,
    ...DAILY_INSERT_FIELDS.map((field) => normalizeDailyIntegerValue(resolvedFields[field], 0))
  ];
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');

  const result = await db.query(
    `INSERT INTO operations_daily_reports (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    insertValues
  );

  return result.rows[0];
}

async function createReport(operations_id, report_date, inputFields = {}) {
  return await createReportRecord(pool, operations_id, report_date, inputFields);
}

async function createReportsBulk(operationsReports = [], report_date) {
  if (!Array.isArray(operationsReports) || operationsReports.length === 0) {
    throw new Error('At least one operations user is required');
  }

  const { dateStr } = normalizeDate(report_date);
  const client = await pool.connect();

  try {
    const normalizedReports = operationsReports
      .map((entry) => ({
        ...entry,
        operations_id: Number(entry.operations_id)
      }))
      .filter((entry) => Number.isInteger(entry.operations_id) && entry.operations_id > 0);

    if (normalizedReports.length === 0) {
      throw new Error('At least one operations user is required');
    }

    await client.query('BEGIN');

    const created = [];
    const skipped = [];

    for (const entry of normalizedReports) {
      const existing = await client.query(
        'SELECT id FROM operations_daily_reports WHERE operations_id = $1 AND report_date = $2',
        [entry.operations_id, dateStr]
      );

      if (existing.rows.length > 0) {
        skipped.push({
          operations_id: entry.operations_id,
          reason: 'Report already exists'
        });
        continue;
      }

      const report = await createReportRecord(client, entry.operations_id, dateStr, entry);
      created.push(report);
    }

    await client.query('COMMIT');

    return { created, skipped, report_date: dateStr };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all reports with optional filters
 * @param {Object} filters - Query filters (operations_id, start_date, end_date, report_date)
 * @returns {Promise<Array>} - List of reports
 */
async function getAllReports(filters = {}) {
  let query = 'SELECT * FROM operations_daily_reports WHERE 1=1';
  const params = [];
  let paramCount = 1;
  
  if (filters.operations_id) {
    query += ` AND operations_id = $${paramCount}`;
    params.push(parseInt(filters.operations_id));
    paramCount++;
  }

  if (filters.report_date) {
    query += ` AND report_date = $${paramCount}`;
    params.push(filters.report_date);
    paramCount++;
  }

  if (filters.start_date) {
    query += ` AND report_date >= $${paramCount}`;
    params.push(filters.start_date);
    paramCount++;
  }
  
  if (filters.end_date) {
    query += ` AND report_date <= $${paramCount}`;
    params.push(filters.end_date);
    paramCount++;
  }
  
  query += ' ORDER BY report_date DESC, operations_name ASC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a single report by ID
 * @param {number} id - Report ID
 * @returns {Promise<Object>} - Report
 */
async function getReportById(id) {
  const result = await pool.query(
    'SELECT * FROM operations_daily_reports WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Update an existing report
 * @param {number} id - Report ID
 * @param {Object} data - Update data (can include manual fields and/or recalculate flag)
 * @returns {Promise<Object>} - Updated report
 */
async function updateReport(id, data) {
  const report = await pool.query(
    'SELECT * FROM operations_daily_reports WHERE id = $1',
    [id]
  );
  
  if (report.rows.length === 0) {
    throw new Error('Report not found');
  }

  const existingReport = report.rows[0];
  let updateFields = [];
  let params = [];
  let paramCount = 1;

  const appendField = (field, value) => {
    updateFields.push(`${field} = $${paramCount++}`);
    params.push(normalizeDailyIntegerValue(value, 0));
  };

  // If recalculate is true, recalculate the calculated fields
  if (data.recalculate) {
    const calculatedData = await calculateDailyData(
      existingReport.operations_id,
      existingReport.report_date
    );

    DAILY_CALCULATED_FIELDS.forEach((field) => {
      appendField(field, calculatedData[field]);
    });
  } else {
    DAILY_CALCULATED_FIELDS.forEach((field) => {
      if (hasOwnValue(data, field)) {
        appendField(field, data[field]);
      }
    });
  }

  // Update manual fields if provided
  DAILY_MANUAL_FIELDS.forEach((field) => {
    if (hasOwnValue(data, field)) {
      appendField(field, data[field]);
    }
  });

  if (updateFields.length === 0) {
    // No fields to update, return existing report
    return existingReport;
  }

  updateFields.push(`updated_at = NOW()`);

  const result = await pool.query(
    `UPDATE operations_daily_reports 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    [...params, id]
  );
  
  return result.rows[0];
}

/**
 * Recalculate an existing report (recalculate calculated fields)
 * @param {number} id - Report ID
 * @returns {Promise<Object>} - Updated report
 */
async function recalculateReport(id) {
  return await updateReport(id, { recalculate: true });
}

/**
 * Delete a report
 * @param {number} id - Report ID
 * @returns {Promise<Object>} - Deleted report
 */
async function deleteReport(id) {
  const result = await pool.query(
    'DELETE FROM operations_daily_reports WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Report not found');
  }
  
  return result.rows[0];
}

/**
 * Get all operations users (operations and operations_manager roles only)
 * @returns {Promise<Array>} - List of operations users
 */
async function getOperationsUsers() {
  const result = await pool.query(`
    SELECT id, name, email, role
    FROM users
    WHERE role IN ('operations', 'operations_manager')
    ORDER BY name
  `);
  return result.rows;
}

module.exports = {
  WORKBOOK_DAILY_FIELD_DEFINITIONS,
  LEGACY_DAILY_FIELD_DEFINITIONS,
  DAILY_FIELD_DEFINITIONS,
  DAILY_CALCULATED_FIELDS,
  DAILY_MANUAL_FIELDS,
  DAILY_INSERT_FIELDS,
  DAILY_VISIBLE_FIELD_DEFINITIONS,
  DAILY_EXPORT_HEADERS,
  normalizeDailyIntegerValue,
  resolveDailyFieldValues,
  calculateDailyData,
  createReport,
  createReportsBulk,
  getAllReports,
  getReportById,
  updateReport,
  recalculateReport,
  deleteReport,
  getOperationsUsers
};

