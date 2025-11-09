// backend/controllers/operationsCommissionController.js
// Controller for Operations Commission Reports

const operationsCommissionModel = require('../models/operationsCommissionModel');
const { exportOperationsCommissionToExcel, exportOperationsCommissionToPDF } = require('../utils/operationsCommissionExporter');

/**
 * Get all operations commission reports with optional filters
 * GET /api/operations-commission/monthly
 */
async function getAllReports(req, res) {
  try {
    console.log('📊 Getting all operations commission reports');
    const { start_date, end_date, date_from, date_to, month, year } = req.query;
    
    const filters = {};
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (month) filters.month = parseInt(month, 10);
    if (year) filters.year = parseInt(year, 10);
    
    const reports = await operationsCommissionModel.getAllReports(filters);
    
    console.log(`✅ Retrieved ${reports.length} operations commission reports`);
    
    res.json({
      success: true,
      data: reports,
      message: 'Operations commission reports retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error getting operations commission reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operations commission reports',
      error: error.message
    });
  }
}

/**
 * Get a single operations commission report by ID
 * GET /api/operations-commission/monthly/:id
 */
async function getReportById(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Getting operations commission report:', id);
    
    const report = await operationsCommissionModel.getReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations commission report not found'
      });
    }
    
    console.log('✅ Retrieved operations commission report:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations commission report retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error getting operations commission report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operations commission report',
      error: error.message
    });
  }
}

/**
 * Create a new operations commission report
 * POST /api/operations-commission/monthly
 */
async function createReport(req, res) {
  try {
    console.log('📊 Creating operations commission report:', req.body);
    
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Check if report already exists
    const existing = await operationsCommissionModel.getAllReports({ start_date: startDateStr, end_date: endDateStr });
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Report for this date range already exists'
      });
    }
    
    const report = await operationsCommissionModel.createReport(startDateStr, endDateStr);
    
    console.log('✅ Operations commission report created successfully:', report.id);
    
    res.status(201).json({
      success: true,
      data: report,
      message: 'Operations commission report created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating operations commission report:', error);
    const isDuplicate = error.code === '23505' || error.message?.includes('already exists')
    res.status(isDuplicate ? 409 : 500).json({
      success: false,
      message: isDuplicate
        ? 'Report for this date range already exists'
        : error.message || 'Failed to create operations commission report',
      error: error.message
    });
  }
}

/**
 * Update an existing operations commission report
 * PUT /api/operations-commission/monthly/:id
 */
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Updating operations commission report:', id, req.body);
    
    const {
      commission_percentage,
      total_properties_count,
      total_sales_count,
      total_rent_count,
      total_sales_value,
      total_rent_value,
      total_commission_amount
    } = req.body;
    
    // Validation
    if (commission_percentage === undefined || 
        total_properties_count === undefined || 
        total_sales_count === undefined ||
        total_rent_count === undefined ||
        total_sales_value === undefined ||
        total_rent_value === undefined ||
        total_commission_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const report = await operationsCommissionModel.updateReport(
      parseInt(id),
      {
        commission_percentage: parseFloat(commission_percentage),
        total_properties_count: parseInt(total_properties_count),
        total_sales_count: parseInt(total_sales_count),
        total_rent_count: parseInt(total_rent_count),
        total_sales_value: parseFloat(total_sales_value),
        total_rent_value: parseFloat(total_rent_value),
        total_commission_amount: parseFloat(total_commission_amount)
      }
    );
    
    console.log('✅ Updated operations commission report:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations commission report updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating operations commission report:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to update operations commission report',
      error: error.message
    });
  }
}

/**
 * Recalculate an operations commission report
 * POST /api/operations-commission/monthly/:id/recalculate
 */
async function recalculateReport(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Recalculating operations commission report:', id);
    
    const report = await operationsCommissionModel.recalculateReport(parseInt(id));
    
    console.log('✅ Operations commission report recalculated successfully:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations commission report recalculated successfully'
    });
  } catch (error) {
    console.error('❌ Error recalculating operations commission report:', error);
    
    if (error.message === 'Report not found') {
      return res.status(404).json({
        success: false,
        message: 'Operations commission report not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate operations commission report',
      error: error.message
    });
  }
}

/**
 * Delete an operations commission report
 * DELETE /api/operations-commission/monthly/:id
 */
async function deleteReport(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Deleting operations commission report:', id);
    
    const report = await operationsCommissionModel.deleteReport(parseInt(id));
    
    console.log('✅ Operations commission report deleted successfully:', id);
    
    res.json({
      success: true,
      data: report,
      message: 'Operations commission report deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting operations commission report:', error);
    
    if (error.message === 'Report not found') {
      return res.status(404).json({
        success: false,
        message: 'Operations commission report not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete operations commission report',
      error: error.message
    });
  }
}

/**
 * Export operations commission report to Excel
 * GET /api/operations-commission/monthly/:id/export/excel
 */
async function exportReportToExcel(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Exporting operations commission report to Excel:', id);
    
    const report = await operationsCommissionModel.getReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations commission report not found'
      });
    }

    const buffer = await exportOperationsCommissionToExcel(report);
    
    const formatRangeLabel = () => {
      const start = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
      const end = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return `${formatter.format(start).replace(/[, ]/g, '-')}_to_${formatter.format(end).replace(/[, ]/g, '-')}`;
    };
    const filename = `Operations_Commission_${formatRangeLabel()}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
    console.log('✅ Operations commission report exported to Excel successfully');
  } catch (error) {
    console.error('❌ Error exporting operations commission report to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export operations commission report to Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Export operations commission report to PDF
 * GET /api/operations-commission/monthly/:id/export/pdf
 */
async function exportReportToPDF(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Exporting operations commission report to PDF:', id);
    
    const report = await operationsCommissionModel.getReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations commission report not found'
      });
    }

    const buffer = await exportOperationsCommissionToPDF(report);
    
    const formatRangeLabel = () => {
      const start = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
      const end = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return `${formatter.format(start).replace(/[, ]/g, '-')}_to_${formatter.format(end).replace(/[, ]/g, '-')}`;
    };
    const filename = `Operations_Commission_${formatRangeLabel()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
    console.log('✅ Operations commission report exported to PDF successfully');
  } catch (error) {
    console.error('❌ Error exporting operations commission report to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export operations commission report to PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  recalculateReport,
  deleteReport,
  exportReportToExcel,
  exportReportToPDF
};

