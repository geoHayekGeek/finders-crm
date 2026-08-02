const agentViewReportsModel = require('../models/agentViewReportsModel');
const { exportAgentViewReportToExcel } = require('../utils/agentViewReportExporter');
const { buildAttachmentFilename } = require('../utils/filenameUtils');

const normalizeRole = (role) =>
  role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';

function parsePeriodMonths(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateAgentViewPayload(body = {}) {
  const agentId = Number(body.agent_id);
  const periodMonths = parsePeriodMonths(body.period_months);

  if (!Number.isInteger(agentId) || agentId <= 0) {
    throw new Error('Agent ID is required');
  }

  if (!body.start_date) {
    throw new Error('Start month is required');
  }

  if (![3, 6, 9, 12].includes(periodMonths)) {
    throw new Error('Period months must be one of 3, 6, 9, or 12');
  }

  return {
    agent_id: agentId,
    start_date: body.start_date,
    period_months: periodMonths,
    quarter_targets: body.quarter_targets || body.block_targets || [],
    summary_targets: body.summary_targets || {},
    month_overrides: body.month_overrides || body.months || []
  };
}

function canCreateReports(role) {
  return ['admin', 'operations manager', 'operations'].includes(role);
}

async function getAllAgentViewReports(req, res) {
  try {
    const filters = {};

    if (req.query.agent_id) {
      filters.agent_id = parseInt(req.query.agent_id, 10);
    }

    if (req.query.start_date) {
      filters.start_date = req.query.start_date;
    }

    if (req.query.end_date) {
      filters.end_date = req.query.end_date;
    }

    if (req.query.date_from && !filters.start_date) {
      filters.start_date = req.query.date_from;
    }

    if (req.query.date_to && !filters.end_date) {
      filters.end_date = req.query.date_to;
    }

    const reports = await agentViewReportsModel.getAllAgentViewReports(filters);

    res.json({
      success: true,
      data: reports,
      count: reports.length,
      message: 'Agent view reports retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent view reports',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function getAgentViewReportById(req, res) {
  try {
    const { id } = req.params;
    const report = await agentViewReportsModel.getAgentViewReportById(parseInt(id, 10));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Agent view report not found'
      });
    }

    res.json({
      success: true,
      data: report,
      message: 'Agent view report retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent view report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function previewAgentViewReport(req, res) {
  try {
    const role = normalizeRole(req.user.role);
    if (!canCreateReports(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create agent view reports'
      });
    }

    const payload = validateAgentViewPayload(req.body);
    const preview = await agentViewReportsModel.previewAgentViewReport(payload);

    res.json({
      success: true,
      data: preview,
      message: 'Agent view preview generated successfully'
    });
  } catch (error) {
    if (
      error.message?.includes('Agent ID is required') ||
      error.message?.includes('Start month is required') ||
      error.message?.includes('Period months must be one of 3, 6, 9, or 12')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to preview agent view report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function createAgentViewReport(req, res) {
  try {
    const role = normalizeRole(req.user.role);
    if (!canCreateReports(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create agent view reports'
      });
    }

    const payload = validateAgentViewPayload(req.body);
    const report = await agentViewReportsModel.createAgentViewReport(payload, req.user.id);

    res.status(201).json({
      success: true,
      data: report,
      message: 'Agent view report created successfully'
    });
  } catch (error) {
    if (error.message?.includes('Report already exists')) {
      return res.status(409).json({
        success: false,
        message: 'A report already exists for this agent and date range'
      });
    }

    if (
      error.message?.includes('Agent ID is required') ||
      error.message?.includes('Start month is required') ||
      error.message?.includes('Period months must be one of 3, 6, 9, or 12')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create agent view report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function deleteAgentViewReport(req, res) {
  try {
    const role = normalizeRole(req.user.role);
    if (!canCreateReports(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete agent view reports'
      });
    }

    const { id } = req.params;
    const report = await agentViewReportsModel.getAgentViewReportById(parseInt(id, 10));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Agent view report not found'
      });
    }

    await agentViewReportsModel.deleteAgentViewReport(parseInt(id, 10));

    res.json({
      success: true,
      message: 'Agent view report deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent view report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function exportAgentViewReportExcel(req, res) {
  try {
    const { id } = req.params;
    const report = await agentViewReportsModel.getAgentViewReportById(parseInt(id, 10));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Agent view report not found'
      });
    }

    const workbookBuffer = await exportAgentViewReportToExcel(report);
    const filename = buildAttachmentFilename(
      'Agent_View',
      [
        report.agent_name || report.agent?.name || 'Agent',
        report.start_date,
        report.end_date
      ],
      'xlsx'
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(workbookBuffer));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export agent view report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

module.exports = {
  createAgentViewReport,
  deleteAgentViewReport,
  exportAgentViewReportExcel,
  getAgentViewReportById,
  getAllAgentViewReports,
  previewAgentViewReport
};
