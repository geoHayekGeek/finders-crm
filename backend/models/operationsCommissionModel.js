// backend/models/operationsCommissionModel.js
// Model for Operations Commission Reports

const pool = require('../config/db');

/**
 * Normalize and validate a provided date range
 * @param {Date|string} startDateInput 
 * @param {Date|string} endDateInput 
 * @returns {{ startDateUtc: Date, endDateUtc: Date, startDateStr: string, endDateStr: string }}
 */
function normalizeDateRange(startDateInput, endDateInput) {
  if (!startDateInput || !endDateInput) {
    throw new Error('Start date and end date are required');
  }

  const startDate = startDateInput instanceof Date ? startDateInput : new Date(startDateInput);
  const endDate = endDateInput instanceof Date ? endDateInput : new Date(endDateInput);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Please use ISO date strings (YYYY-MM-DD).');
  }

  if (endDate < startDate) {
    throw new Error('End date cannot be before start date');
  }

  const startDateUtc = new Date(Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    0, 0, 0, 0
  ));
  const endDateUtc = new Date(Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23, 59, 59, 999
  ));

  return {
    startDateUtc,
    endDateUtc,
    startDateStr: startDateUtc.toISOString().split('T')[0],
    endDateStr: endDateUtc.toISOString().split('T')[0]
  };
}

/**
 * Calculate operations commission data for a given date range
 * @param {Date|string} startDateInput
 * @param {Date|string} endDateInput
 * @returns {Promise<Object>} - Calculated commission data
 */
async function calculateCommissionData(startDateInput, endDateInput) {
  const client = await pool.connect();
  
  try {
    const { startDateUtc, endDateUtc, startDateStr, endDateStr } = normalizeDateRange(startDateInput, endDateInput);

    // Get operations commission percentage from settings
    const settingsResult = await client.query(
      `SELECT setting_value 
       FROM system_settings 
       WHERE setting_key = 'commission_administration_percentage'`
    );
    
    const commissionPercentage = settingsResult.rows[0]?.setting_value 
      ? parseFloat(settingsResult.rows[0].setting_value) 
      : 4.0; // Default 4%
    
    // Get all closed properties (sold or rented) in the specified range
    const propertiesResult = await client.query(
      `SELECT 
        p.id,
        p.reference_number,
        p.property_type,
        p.price,
        p.closed_date
       FROM properties p
       WHERE p.closed_date IS NOT NULL
       AND p.closed_date >= $1::date
       AND p.closed_date <= $2::date
       ORDER BY p.closed_date DESC`,
      [startDateStr, endDateStr]
    );
    
    const properties = propertiesResult.rows;
    let totalSalesCount = 0;
    let totalRentCount = 0;
    let totalSalesValue = 0;
    let totalRentValue = 0;
    
    // Calculate detailed property data with commissions
    const propertyDetails = properties.map(property => {
      const price = parseFloat(property.price) || 0;
      const commission = (price * commissionPercentage) / 100;
      const isSale = property.property_type.toLowerCase() === 'sale';
      
      if (isSale) {
        totalSalesCount++;
        totalSalesValue += price;
      } else {
        totalRentCount++;
        totalRentValue += price;
      }
      
      return {
        id: property.id,
        reference_number: property.reference_number,
        property_type: property.property_type,
        price: price,
        commission: commission,
        closed_date: property.closed_date
      };
    });
    
    const totalCommission = (totalSalesValue + totalRentValue) * commissionPercentage / 100;
    
    const month = startDateUtc.getUTCMonth() + 1;
    const year = startDateUtc.getUTCFullYear();

    return {
      month,
      year,
      start_date: startDateStr,
      end_date: endDateStr,
      commission_percentage: commissionPercentage,
      total_properties_count: properties.length,
      total_sales_count: totalSalesCount,
      total_rent_count: totalRentCount,
      total_sales_value: totalSalesValue,
      total_rent_value: totalRentValue,
      total_commission_amount: totalCommission,
      properties: propertyDetails
    };
    
  } finally {
    client.release();
  }
}

/**
 * Create a new operations commission report
 * @param {string} start_date - Inclusive start date
 * @param {string} end_date - Inclusive end date
 * @returns {Promise<Object>} - Created report
 */
async function createReport(start_date, end_date) {
  const { startDateUtc, endDateUtc, startDateStr, endDateStr } = normalizeDateRange(start_date, end_date);
  const month = startDateUtc.getUTCMonth() + 1;
  const year = startDateUtc.getUTCFullYear();

  const calculatedData = await calculateCommissionData(startDateUtc, endDateUtc);
  
  const result = await pool.query(
    `INSERT INTO operations_commission_reports 
      (month, year, start_date, end_date, commission_percentage, total_properties_count, total_sales_count, 
       total_rent_count, total_sales_value, total_rent_value, total_commission_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      calculatedData.month,
      calculatedData.year,
      startDateStr,
      endDateStr,
      calculatedData.commission_percentage,
      calculatedData.total_properties_count,
      calculatedData.total_sales_count,
      calculatedData.total_rent_count,
      calculatedData.total_sales_value,
      calculatedData.total_rent_value,
      calculatedData.total_commission_amount
    ]
  );
  
  return {
    ...result.rows[0],
    properties: calculatedData.properties
  };
}

/**
 * Get all reports with optional filters
 * @param {Object} filters - Query filters (month, year)
 * @returns {Promise<Array>} - List of reports
 */
async function getAllReports(filters = {}) {
  let query = 'SELECT * FROM operations_commission_reports WHERE 1=1';
  const params = [];
  let paramCount = 1;
  
  const startFilter = filters.start_date || filters.date_from;
  const endFilter = filters.end_date || filters.date_to;

  if (startFilter) {
    query += ` AND start_date >= $${paramCount}`;
    params.push(startFilter);
    paramCount++;
  }
  
  if (endFilter) {
    query += ` AND end_date <= $${paramCount}`;
    params.push(endFilter);
    paramCount++;
  }

  if (filters.month && !startFilter) {
    query += ` AND month = $${paramCount}`;
    params.push(filters.month);
    paramCount++;
  }
  
  if (filters.year && !startFilter && !endFilter) {
    query += ` AND year = $${paramCount}`;
    params.push(filters.year);
    paramCount++;
  }
  
  query += ' ORDER BY start_date DESC, end_date DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a single report by ID
 * @param {number} id - Report ID
 * @returns {Promise<Object>} - Report with property details
 */
async function getReportById(id) {
  const result = await pool.query(
    'SELECT * FROM operations_commission_reports WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const report = result.rows[0];

  const startDate = report.start_date || new Date(Date.UTC(report.year, report.month - 1, 1)).toISOString().split('T')[0];
  const endDate = report.end_date || new Date(Date.UTC(report.year, report.month, 0)).toISOString().split('T')[0];

  // Get the detailed property list for this report
  const calculatedData = await calculateCommissionData(startDate, endDate);
  
  return {
    ...report,
    properties: calculatedData.properties
  };
}

/**
 * Update an existing report
 * @param {number} id - Report ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} - Updated report
 */
async function updateReport(id, data) {
  const report = await pool.query(
    'SELECT * FROM operations_commission_reports WHERE id = $1',
    [id]
  );
  
  if (report.rows.length === 0) {
    throw new Error('Report not found');
  }
  
  const result = await pool.query(
    `UPDATE operations_commission_reports 
     SET commission_percentage = $1,
         total_properties_count = $2,
         total_sales_count = $3,
         total_rent_count = $4,
         total_sales_value = $5,
         total_rent_value = $6,
         total_commission_amount = $7,
         updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      data.commission_percentage,
      data.total_properties_count,
      data.total_sales_count,
      data.total_rent_count,
      data.total_sales_value,
      data.total_rent_value,
      data.total_commission_amount,
      id
    ]
  );
  
  const { start_date, end_date, month, year } = result.rows[0];
  const startRange = start_date || new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
  const endRange = end_date || new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];
  const calculatedData = await calculateCommissionData(startRange, endRange);
  
  return {
    ...result.rows[0],
    properties: calculatedData.properties
  };
}

/**
 * Recalculate an existing report
 * @param {number} id - Report ID
 * @returns {Promise<Object>} - Updated report
 */
async function recalculateReport(id) {
  const report = await pool.query(
    'SELECT * FROM operations_commission_reports WHERE id = $1',
    [id]
  );
  
  if (report.rows.length === 0) {
    throw new Error('Report not found');
  }
  
  const { start_date, end_date, month, year } = report.rows[0];
  const startRange = start_date || new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
  const endRange = end_date || new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];
  const calculatedData = await calculateCommissionData(startRange, endRange);
  
  const result = await pool.query(
    `UPDATE operations_commission_reports 
     SET commission_percentage = $1,
         total_properties_count = $2,
         total_sales_count = $3,
         total_rent_count = $4,
         total_sales_value = $5,
         total_rent_value = $6,
         total_commission_amount = $7,
         start_date = $8,
         end_date = $9,
         updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [
      calculatedData.commission_percentage,
      calculatedData.total_properties_count,
      calculatedData.total_sales_count,
      calculatedData.total_rent_count,
      calculatedData.total_sales_value,
      calculatedData.total_rent_value,
      calculatedData.total_commission_amount,
      startRange,
      endRange,
      id
    ]
  );
  
  return {
    ...result.rows[0],
    properties: calculatedData.properties
  };
}

/**
 * Delete a report
 * @param {number} id - Report ID
 * @returns {Promise<Object>} - Deleted report
 */
async function deleteReport(id) {
  const result = await pool.query(
    'DELETE FROM operations_commission_reports WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Report not found');
  }
  
  return result.rows[0];
}

module.exports = {
  calculateCommissionData,
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  recalculateReport,
  deleteReport
};

