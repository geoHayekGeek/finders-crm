// backend/controllers/dcsrReportsController.js
// Controller for DCSR (Daily Client/Sales Report) Monthly Reports

const dcsrReportsModel = require('../models/dcsrReportsModel');
const { exportDCSRToExcel, exportDCSRToPDF } = require('../utils/dcsrReportExporter');

/**
 * Get all DCSR reports with optional filters
 * GET /api/dcsr-reports/monthly
 */
async function getAllDCSRReports(req, res) {
  try {
    const { start_date, end_date, date_from, date_to, month, year } = req.query;
    
    const filters = {};
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (month) filters.month = parseInt(month, 10);
    if (year) filters.year = parseInt(year, 10);
    
    const reports = await dcsrReportsModel.getAllDCSRReports(filters);
    
    res.json({
      success: true,
      data: reports,
      message: 'DCSR reports retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching DCSR reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DCSR reports',
      error: error.message
    });
  }
}

/**
 * Get a single DCSR report by ID
 * GET /api/dcsr-reports/monthly/:id
 */
async function getDCSRReportById(req, res) {
  try {
    const { id } = req.params;
    
    const report = await dcsrReportsModel.getDCSRReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }
    
    res.json({
      success: true,
      data: report,
      message: 'DCSR report retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching DCSR report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DCSR report',
      error: error.message
    });
  }
}

/**
 * Create a new DCSR report (company-wide)
 * POST /api/dcsr-reports/monthly
 */
async function createDCSRReport(req, res) {
  try {
    const { start_date, end_date } = req.body;
    
    // Validation
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

    const createdBy = req.user.id;
    const report = await dcsrReportsModel.createDCSRReport(req.body, createdBy);
    
    res.status(201).json({
      success: true,
      data: report,
      message: 'DCSR report created successfully'
    });
  } catch (error) {
    console.error('Error creating DCSR report:', error);
    
    if (error.message?.includes('already exists') || error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A DCSR report already exists for this date range'
      });
    }

    // Handle year constraint violation
    if (error.code === '23514' && error.constraint === 'dcsr_monthly_reports_year_check') {
      return res.status(400).json({
        success: false,
        message: 'Year must be 2020 or later. Please select a date range starting from 2020 or later.'
      });
    }

    // Handle validation errors from model
    if (error.message?.includes('Year must be')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create DCSR report',
      error: error.message
    });
  }
}

/**
 * Update a DCSR report
 * PUT /api/dcsr-reports/monthly/:id
 */
async function updateDCSRReport(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if report exists
    const existingReport = await dcsrReportsModel.getDCSRReportById(parseInt(id));
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }
    
    const updatedReport = await dcsrReportsModel.updateDCSRReport(parseInt(id), updateData);
    
    res.json({
      success: true,
      data: updatedReport,
      message: 'DCSR report updated successfully'
    });
  } catch (error) {
    console.error('Error updating DCSR report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update DCSR report',
      error: error.message
    });
  }
}

/**
 * Recalculate a DCSR report
 * POST /api/dcsr-reports/monthly/:id/recalculate
 */
async function recalculateDCSRReport(req, res) {
  try {
    const { id } = req.params;
    
    // Check if report exists
    const existingReport = await dcsrReportsModel.getDCSRReportById(parseInt(id));
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }
    
    const recalculatedReport = await dcsrReportsModel.recalculateDCSRReport(parseInt(id));
    
    res.json({
      success: true,
      data: recalculatedReport,
      message: 'DCSR report recalculated successfully'
    });
  } catch (error) {
    console.error('Error recalculating DCSR report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate DCSR report',
      error: error.message
    });
  }
}

/**
 * Delete a DCSR report
 * DELETE /api/dcsr-reports/monthly/:id
 */
async function deleteDCSRReport(req, res) {
  try {
    const { id } = req.params;
    
    // Check if report exists
    const existingReport = await dcsrReportsModel.getDCSRReportById(parseInt(id));
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }
    
    const deleted = await dcsrReportsModel.deleteDCSRReport(parseInt(id));
    
    if (deleted) {
      res.json({
        success: true,
        message: 'DCSR report deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }
  } catch (error) {
    console.error('Error deleting DCSR report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete DCSR report',
      error: error.message
    });
  }
}

/**
 * Export DCSR report to Excel
 * GET /api/dcsr-reports/monthly/:id/export/excel
 */
async function exportDCSRReportToExcel(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Exporting DCSR report to Excel:', id);
    
    const report = await dcsrReportsModel.getDCSRReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }

    const buffer = await exportDCSRToExcel(report);
    
    const formatRangeLabel = () => {
      const start = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
      const end = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return `${formatter.format(start).replace(/[, ]/g, '-')}_to_${formatter.format(end).replace(/[, ]/g, '-')}`;
    };
    
    const filename = `DCSR_Report_${formatRangeLabel()}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
    console.log('✅ DCSR report exported to Excel successfully');
  } catch (error) {
    console.error('❌ Error exporting DCSR report to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export DCSR report to Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Export DCSR report to PDF
 * GET /api/dcsr-reports/monthly/:id/export/pdf
 */
async function exportDCSRReportToPDF(req, res) {
  try {
    const { id } = req.params;
    console.log('📊 Exporting DCSR report to PDF:', id);
    
    const report = await dcsrReportsModel.getDCSRReportById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'DCSR report not found'
      });
    }

    const buffer = await exportDCSRToPDF(report);
    
    const formatRangeLabel = () => {
      const start = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
      const end = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return `${formatter.format(start).replace(/[, ]/g, '-')}_to_${formatter.format(end).replace(/[, ]/g, '-')}`;
    };
    
    const filename = `DCSR_Report_${formatRangeLabel()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
    console.log('✅ DCSR report exported to PDF successfully');
  } catch (error) {
    console.error('❌ Error exporting DCSR report to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export DCSR report to PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

module.exports = {
  getAllDCSRReports,
  getDCSRReportById,
  createDCSRReport,
  updateDCSRReport,
  recalculateDCSRReport,
  deleteDCSRReport,
  exportDCSRReportToExcel,
  exportDCSRReportToPDF
};

