// backend/controllers/operationsDailyController.js
// Controller for Operations Daily Reports

const operationsDailyModel = require('../models/operationsDailyReportModel');
const { exportOperationsDailyToExcel, exportOperationsDailyToPDF } = require('../utils/operationsDailyExporter');

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
    
    const { operations_id, report_date, preparing_contract, tasks_efficiency_duty_time, 
            tasks_efficiency_uniform, tasks_efficiency_after_duty, leads_responded_out_of_duty_time } = req.body;
    
    if (!operations_id || !report_date) {
      return res.status(400).json({
        success: false,
        message: 'Operations ID and report date are required'
      });
    }

    const reportDate = new Date(report_date);

    if (Number.isNaN(reportDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    }

    const reportDateStr = reportDate.toISOString().split('T')[0];
    
    const report = await operationsDailyModel.createReport(
      parseInt(operations_id),
      reportDateStr,
      {
        preparing_contract: preparing_contract || 0,
        tasks_efficiency_duty_time: tasks_efficiency_duty_time || 0,
        tasks_efficiency_uniform: tasks_efficiency_uniform || 0,
        tasks_efficiency_after_duty: tasks_efficiency_after_duty || 0,
        leads_responded_out_of_duty_time: leads_responded_out_of_duty_time || 0
      }
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
    
    const {
      preparing_contract,
      tasks_efficiency_duty_time,
      tasks_efficiency_uniform,
      tasks_efficiency_after_duty,
      leads_responded_out_of_duty_time,
      recalculate
    } = req.body;
    
    const updateData = {};
    if (preparing_contract !== undefined) updateData.preparing_contract = preparing_contract;
    if (tasks_efficiency_duty_time !== undefined) updateData.tasks_efficiency_duty_time = tasks_efficiency_duty_time;
    if (tasks_efficiency_uniform !== undefined) updateData.tasks_efficiency_uniform = tasks_efficiency_uniform;
    if (tasks_efficiency_after_duty !== undefined) updateData.tasks_efficiency_after_duty = tasks_efficiency_after_duty;
    if (leads_responded_out_of_duty_time !== undefined) updateData.leads_responded_out_of_duty_time = leads_responded_out_of_duty_time;
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
    
    const formatDateLabel = () => {
      const date = new Date(report.report_date);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return formatter.format(date).replace(/[, ]/g, '-');
    };
    const filename = `Operations_Daily_${report.operations_name.replace(/\s+/g, '_')}_${formatDateLabel()}.xlsx`;
    
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
    
    const formatDateLabel = () => {
      const date = new Date(report.report_date);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return formatter.format(date).replace(/[, ]/g, '-');
    };
    const filename = `Operations_Daily_${report.operations_name.replace(/\s+/g, '_')}_${formatDateLabel()}.pdf`;
    
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
  recalculateReport,
  deleteReport,
  exportReportToExcel,
  exportReportToPDF,
  getOperationsUsers
};

