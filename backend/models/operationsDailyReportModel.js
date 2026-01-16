// backend/models/operationsDailyReportModel.js
// Model for Operations Daily Reports

const pool = require('../config/db');

/**
 * Normalize and validate a date
 * @param {Date|string} dateInput 
 * @returns {{ dateUtc: Date, dateStr: string }}
 */
function normalizeDate(dateInput) {
  if (!dateInput) {
    throw new Error('Date is required');
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
  }

  const dateUtc = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  ));

  return {
    dateUtc,
    dateStr: dateUtc.toISOString().split('T')[0]
  };
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
    const { dateStr } = normalizeDate(reportDateInput);

    // Get operations user name
    const userResult = await client.query(
      'SELECT id, name FROM users WHERE id = $1 AND role IN (\'operations\', \'operations_manager\')',
      [operations_id]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid operations user ID');
    }

    const operationsName = userResult.rows[0].name;

    // Calculate properties added (properties created on this day)
    const propertiesAddedResult = await client.query(
      `SELECT COUNT(*) as count
       FROM properties
       WHERE DATE(created_at AT TIME ZONE 'UTC') = $1::date`,
      [dateStr]
    );
    const propertiesAdded = parseInt(propertiesAddedResult.rows[0].count) || 0;

    // Calculate leads responded to (leads where added_by_id matches and were created/added on this day)
    // Note: We count all leads created on this day, but the display will subtract leads_responded_out_of_duty_time
    const leadsRespondedResult = await client.query(
      `SELECT COUNT(*) as count
       FROM leads
       WHERE added_by_id = $1
         AND DATE(created_at AT TIME ZONE 'UTC') = $2::date`,
      [operations_id, dateStr]
    );
    const leadsRespondedTo = parseInt(leadsRespondedResult.rows[0].count) || 0;

    // Calculate amending previous properties (properties updated on this day that were created before)
    const amendingPropertiesResult = await client.query(
      `SELECT COUNT(*) as count
       FROM properties
       WHERE DATE(updated_at AT TIME ZONE 'UTC') = $1::date
         AND updated_at > created_at`,
      [dateStr]
    );
    const amendingPreviousProperties = parseInt(amendingPropertiesResult.rows[0].count) || 0;

    return {
      operations_id,
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
 * @param {Object} manualFields - Manual input fields
 * @returns {Promise<Object>} - Created report
 */
async function createReport(operations_id, report_date, manualFields = {}) {
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
      calculatedData.properties_added,
      calculatedData.leads_responded_to,
      calculatedData.amending_previous_properties,
      manualFields.preparing_contract || 0,
      manualFields.tasks_efficiency_duty_time || 0,
      manualFields.tasks_efficiency_uniform || 0,
      manualFields.tasks_efficiency_after_duty || 0,
      manualFields.leads_responded_out_of_duty_time || 0
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

  // If recalculate is true, recalculate the calculated fields
  if (data.recalculate) {
    const calculatedData = await calculateDailyData(
      existingReport.operations_id,
      existingReport.report_date
    );
    
    updateFields.push(`properties_added = $${paramCount++}`);
    params.push(calculatedData.properties_added);
    
    updateFields.push(`leads_responded_to = $${paramCount++}`);
    params.push(calculatedData.leads_responded_to);
    
    updateFields.push(`amending_previous_properties = $${paramCount++}`);
    params.push(calculatedData.amending_previous_properties);
  }

  // Update manual fields if provided
  if (data.preparing_contract !== undefined) {
    updateFields.push(`preparing_contract = $${paramCount++}`);
    params.push(parseInt(data.preparing_contract) || 0);
  }

  if (data.tasks_efficiency_duty_time !== undefined) {
    updateFields.push(`tasks_efficiency_duty_time = $${paramCount++}`);
    params.push(parseInt(data.tasks_efficiency_duty_time) || 0);
  }

  if (data.tasks_efficiency_uniform !== undefined) {
    updateFields.push(`tasks_efficiency_uniform = $${paramCount++}`);
    params.push(parseInt(data.tasks_efficiency_uniform) || 0);
  }

  if (data.tasks_efficiency_after_duty !== undefined) {
    updateFields.push(`tasks_efficiency_after_duty = $${paramCount++}`);
    params.push(parseInt(data.tasks_efficiency_after_duty) || 0);
  }

  if (data.leads_responded_out_of_duty_time !== undefined) {
    updateFields.push(`leads_responded_out_of_duty_time = $${paramCount++}`);
    params.push(parseInt(data.leads_responded_out_of_duty_time) || 0);
  }

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

