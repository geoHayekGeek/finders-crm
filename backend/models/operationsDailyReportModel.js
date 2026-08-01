// backend/models/operationsDailyReportModel.js
// Model for Operations Daily Reports

const pool = require('../config/db');

const CALCULATED_DAILY_FIELDS = [
  'properties_added',
  'leads_responded_to',
  'amending_previous_properties'
];

const MANUAL_DAILY_FIELDS = [
  'preparing_contract',
  'tasks_efficiency_duty_time',
  'tasks_efficiency_uniform',
  'tasks_efficiency_after_duty',
  'leads_responded_out_of_duty_time'
];

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

function normalizeIntegerValue(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number'
    ? value
    : parseInt(String(value), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasOwnValue(source, field) {
  return Object.prototype.hasOwnProperty.call(source || {}, field);
}

function getResolvedDailyValue(source, field, fallback = 0) {
  return hasOwnValue(source, field)
    ? normalizeIntegerValue(source[field], fallback)
    : fallback;
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
         WHERE DATE(created_at AT TIME ZONE 'UTC') = $1::date`,
        [dateStr]
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
         WHERE DATE(updated_at AT TIME ZONE 'UTC') = $1::date
           AND DATE(created_at AT TIME ZONE 'UTC') < $1::date`,
        [dateStr]
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
async function createReport(operations_id, report_date, inputFields = {}) {
  const { dateStr } = normalizeDate(report_date);

  // Check if report already exists
  const existing = await pool.query(
    'SELECT id FROM operations_daily_reports WHERE operations_id = $1 AND report_date = $2',
    [operations_id, dateStr]
  );

  if (existing.rows.length > 0) {
    throw new Error('A report already exists for this operations user and date');
  }

  const calculatedData = await calculateDailyData(operations_id, dateStr);
  const resolvedFields = {
    properties_added: getResolvedDailyValue(inputFields, 'properties_added', calculatedData.properties_added),
    leads_responded_to: getResolvedDailyValue(inputFields, 'leads_responded_to', calculatedData.leads_responded_to),
    amending_previous_properties: getResolvedDailyValue(inputFields, 'amending_previous_properties', calculatedData.amending_previous_properties),
    preparing_contract: getResolvedDailyValue(inputFields, 'preparing_contract', 0),
    tasks_efficiency_duty_time: getResolvedDailyValue(inputFields, 'tasks_efficiency_duty_time', 0),
    tasks_efficiency_uniform: getResolvedDailyValue(inputFields, 'tasks_efficiency_uniform', 0),
    tasks_efficiency_after_duty: getResolvedDailyValue(inputFields, 'tasks_efficiency_after_duty', 0),
    leads_responded_out_of_duty_time: getResolvedDailyValue(inputFields, 'leads_responded_out_of_duty_time', 0)
  };
  
  const result = await pool.query(
    `INSERT INTO operations_daily_reports 
      (operations_id, operations_name, report_date, 
       properties_added, leads_responded_to, amending_previous_properties,
       preparing_contract, tasks_efficiency_duty_time, tasks_efficiency_uniform, 
       tasks_efficiency_after_duty, leads_responded_out_of_duty_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      calculatedData.operations_id,
      calculatedData.operations_name,
      calculatedData.report_date,
      resolvedFields.properties_added,
      resolvedFields.leads_responded_to,
      resolvedFields.amending_previous_properties,
      resolvedFields.preparing_contract,
      resolvedFields.tasks_efficiency_duty_time,
      resolvedFields.tasks_efficiency_uniform,
      resolvedFields.tasks_efficiency_after_duty,
      resolvedFields.leads_responded_out_of_duty_time
    ]
  );
  
  return result.rows[0];
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
    params.push(normalizeIntegerValue(value, 0));
  };

  // If recalculate is true, recalculate the calculated fields
  if (data.recalculate) {
    const calculatedData = await calculateDailyData(
      existingReport.operations_id,
      existingReport.report_date
    );

    CALCULATED_DAILY_FIELDS.forEach((field) => {
      appendField(field, calculatedData[field]);
    });
  } else {
    CALCULATED_DAILY_FIELDS.forEach((field) => {
      if (hasOwnValue(data, field)) {
        appendField(field, data[field]);
      }
    });
  }

  // Update manual fields if provided
  MANUAL_DAILY_FIELDS.forEach((field) => {
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
  calculateDailyData,
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  recalculateReport,
  deleteReport,
  getOperationsUsers
};

