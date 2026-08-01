// backend/controllers/operationsDailyController.js
// Controller for Operations Daily Reports

const operationsDailyModel = require('../models/operationsDailyReportModel');
const { exportOperationsDailyToExcel, exportOperationsDailyToPDF } = require('../utils/operationsDailyExporter');

const DAILY_EDITABLE_FIELDS = [
  'properties_added',
  'leads_responded_to',
  'amending_previous_properties',
  'preparing_contract',
  'tasks_efficiency_duty_time',
  'tasks_efficiency_uniform',
  'tasks_efficiency_after_duty',
  'leads_responded_out_of_duty_time'
];

function parseOperationsId(operations_id) {
  const parsed = Number(operations_id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Operations ID must be a valid number');
  }

  return parsed;
}

function pickEditableFields(source = {}) {
  return DAILY_EDITABLE_FIELDS.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
}

function parseReportDateInput(report_date) {
  if (!report_date) {
    throw new Error('Date is required');
  }

  const rawValue = String(report_date).trim();
  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD.');
  }

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);
  const dateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    dateUtc.getUTCFullYear() !== year ||
    dateUtc.getUTCMonth() + 1 !== month ||
    dateUtc.getUTCDate() !== day
  ) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD.');
  }

  return dateUtc.toISOString().split('T')[0];
}

function formatReportDateLabel(dateValue, options) {
  if (!dateValue) {
    return '';
  }

  const rawValue = String(dateValue).trim();
  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsedDate = dateMatch
    ? new Date(Date.UTC(parseInt(dateMatch[1], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[3], 10), 0, 0, 0, 0))
    : new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC'
  }).format(parsedDate);
}

/**
 * Get all operations daily reports with optional filters
 * GET /api/operations-daily
 */
async function getAllReports(req, res) {
  try {
    console.log('📊 Getting all operations daily reports');
    const { operations_id, report_date, start_date, end_date } = req.query;
    
    const filters = {};
    if (operations_id) filters.operations_id = operations_id;
    if (report_date) filters.report_date = report_date;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    
    const reports = await operationsDailyModel.getAllReports(filters);
    
    console.log(`✅ Retrieved ${reports.length} operations daily reports`);
    
    res.json({
      success: true,
      data: reports,
      message: 'Operations daily reports retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error getting operations daily reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operations daily reports',
      error: error.message
    });
  }
}

/**
 * Get a single operations daily report by ID
 * GET /api/operations-daily/:id
 */
async function getReportById(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Getting operations daily report:', id);
    
    const report = await operationsDailyModel.getReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations daily report not found'
      });
    }
    
    console.log('✅ Retrieved operations daily report:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations daily report retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error getting operations daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operations daily report',
      error: error.message
    });
  }
}

/**
 * Create a new operations daily report
 * POST /api/operations-daily
 */
async function createReport(req, res) {
  try {
    console.log('📊 Creating operations daily report:', req.body);
    
    const { operations_id, report_date } = req.body;
    
    if (!operations_id || !report_date) {
      return res.status(400).json({
        success: false,
        message: 'Operations ID and report date are required'
      });
    }

    let operationsId;
    let reportDate;
    try {
      operationsId = parseOperationsId(operations_id);
      reportDate = parseReportDateInput(report_date);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const report = await operationsDailyModel.createReport(
      operationsId,
      reportDate,
      pickEditableFields(req.body)
    );

    console.log('✅ Operations daily report created successfully:', report.id);
    
    res.status(201).json({
      success: true,
      data: report,
      message: 'Operations daily report created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating operations daily report:', error);
    const isDuplicate = error.code === '23505' || error.message?.includes('already exists');
    const isInvalidDate = error.message?.includes('Date is required') || error.message?.includes('Invalid date format');
    const isInvalidOperations = error.message?.includes('Invalid operations user ID');

    if (isInvalidDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }

    if (isInvalidOperations) {
      return res.status(400).json({
        success: false,
        message: 'Operations ID must be a valid number'
      });
    }

    res.status(isDuplicate ? 409 : 500).json({
      success: false,
      message: isDuplicate
        ? 'Report for this operations user and date already exists'
        : error.message || 'Failed to create operations daily report',
      error: error.message
    });
  }
}

/**
 * Update an existing operations daily report
 * PUT /api/operations-daily/:id
 */
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Updating operations daily report:', id, req.body);
    
    const { recalculate } = req.body;
    
    const updateData = {};
    Object.assign(updateData, pickEditableFields(req.body));
    if (recalculate) updateData.recalculate = true;
    
    const report = await operationsDailyModel.updateReport(parseInt(id), updateData);
    
    console.log('✅ Updated operations daily report:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations daily report updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating operations daily report:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to update operations daily report',
      error: error.message
    });
  }
}

/**
 * Preview an operations daily report without persisting it
 * POST /api/operations-daily/preview
 */
async function previewReport(req, res) {
  try {
    console.log('📊 Calculating operations daily preview:', req.body);

    const { operations_id, report_date } = req.body;

    if (!operations_id || !report_date) {
      return res.status(400).json({
        success: false,
        message: 'Operations ID and report date are required'
      });
    }

    let operationsId;
    let reportDate;
    try {
      operationsId = parseOperationsId(operations_id);
      reportDate = parseReportDateInput(report_date);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const preview = await operationsDailyModel.calculateDailyData(operationsId, reportDate);

    console.log('✅ Operations daily preview calculated successfully');

    res.json({
      success: true,
      data: preview,
      message: 'Operations daily preview calculated successfully'
    });
  } catch (error) {
    console.error('❌ Error calculating operations daily preview:', error);

    if (error.message?.includes('Date is required') || error.message?.includes('Invalid date format')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }

    if (error.message === 'Invalid operations user ID') {
      return res.status(400).json({
        success: false,
        message: 'Operations ID must be a valid number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to calculate operations daily preview',
      error: error.message
    });
  }
}

/**
 * Recalculate an operations daily report
 * POST /api/operations-daily/:id/recalculate
 */
async function recalculateReport(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Recalculating operations daily report:', id);
    
    const report = await operationsDailyModel.recalculateReport(parseInt(id));
    
    console.log('✅ Operations daily report recalculated successfully:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations daily report recalculated successfully'
    });
  } catch (error) {
    console.error('❌ Error recalculating operations daily report:', error);
    
    if (error.message === 'Report not found') {
      return res.status(404).json({
        success: false,
        message: 'Operations daily report not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate operations daily report',
      error: error.message
    });
  }
}

/**
 * Delete an operations daily report
 * DELETE /api/operations-daily/:id
 */
async function deleteReport(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Deleting operations daily report:', id);
    
    const report = await operationsDailyModel.deleteReport(parseInt(id));
    
    console.log('✅ Operations daily report deleted successfully:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations daily report deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting operations daily report:', error);
    
    if (error.message === 'Report not found') {
      return res.status(404).json({
        success: false,
        message: 'Operations daily report not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete operations daily report',
      error: error.message
    });
  }
}

/**
 * Export operations daily report to Excel
 * GET /api/operations-daily/:id/export/excel
 */
async function exportReportToExcel(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Exporting operations daily report to Excel:', id);
    
    const report = await operationsDailyModel.getReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations daily report not found'
      });
    }

    const buffer = await exportOperationsDailyToExcel(report);
    
    const filenameDate = formatReportDateLabel(report.report_date, { month: 'short', day: '2-digit', year: 'numeric' }).replace(/[, ]/g, '-');
    const operationsName = report.operations_name ? report.operations_name.replace(/\s+/g, '_') : 'report';
    const filename = `Operations_Daily_${operationsName}_${filenameDate}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
    console.log('✅ Operations daily report exported to Excel successfully');
  } catch (error) {
    console.error('❌ Error exporting operations daily report to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export operations daily report to Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Get operations users for selector (operations and operations_manager only)
 * GET /api/operations-daily/operations-users
 */
async function getOperationsUsers(req, res) {
  try {
    console.log('👥 Getting operations users for daily reports');
    
    const users = await operationsDailyModel.getOperationsUsers();
    
    console.log(`✅ Retrieved ${users.length} operations users`);
    
    res.json({
      success: true,
      data: users,
      message: 'Operations users retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error getting operations users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operations users',
      error: error.message
    });
  }
}

/**
 * Export operations daily report to PDF
 * GET /api/operations-daily/:id/export/pdf
 */
async function exportReportToPDF(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Exporting operations daily report to PDF:', id);
    
    const report = await operationsDailyModel.getReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations daily report not found'
      });
    }

    const buffer = await exportOperationsDailyToPDF(report);
    
    const filenameDate = formatReportDateLabel(report.report_date, { month: 'short', day: '2-digit', year: 'numeric' }).replace(/[, ]/g, '-');
    const operationsName = report.operations_name ? report.operations_name.replace(/\s+/g, '_') : 'report';
    const filename = `Operations_Daily_${operationsName}_${filenameDate}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
    console.log('✅ Operations daily report exported to PDF successfully');
  } catch (error) {
    console.error('❌ Error exporting operations daily report to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export operations daily report to PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  previewReport,
  recalculateReport,
  deleteReport,
  exportReportToExcel,
  exportReportToPDF,
  getOperationsUsers
};

