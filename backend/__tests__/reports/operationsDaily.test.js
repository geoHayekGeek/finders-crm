const operationsDailyController = require('../../controllers/operationsDailyController');
const operationsDailyModel = require('../../models/operationsDailyReportModel');
const { exportOperationsDailyToExcel, exportOperationsDailyToPDF } = require('../../utils/operationsDailyExporter');

jest.mock('../../models/operationsDailyReportModel');
jest.mock('../../utils/operationsDailyExporter');
jest.mock('../../config/db');

describe('Operations Daily Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, role: 'admin' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('passes workbook-style fields to the model', async () => {
      req.body = {
        operations_id: 1,
        report_date: '2024-01-15',
        preparing_daily_report: 2,
        phone_calls_duty_time: 3,
        replying_to_msg_on_sm_duty_time: 4,
        cvs: 5,
        filling: 6,
        preparing_contract: 7,
        tasks_efficiency: 8,
        phone_calls_out_of_duty_time: 9,
        replying_to_msg_on_sm_out_of_duty_time: 10,
        replying_to_whats_up_msg_out_of_duty_time: 11,
        leads_responded_out_of_duty_time: 1,
        tasks_efficiency_duty_time: 12
      };

      const mockReport = {
        id: 1,
        operations_id: 1,
        report_date: '2024-01-15'
      };

      operationsDailyModel.createReport.mockResolvedValue(mockReport);

      await operationsDailyController.createReport(req, res);

      expect(operationsDailyModel.createReport).toHaveBeenCalledWith(
        1,
        '2024-01-15',
        expect.objectContaining({
          preparing_daily_report: 2,
          phone_calls_duty_time: 3,
          tasks_efficiency: 8,
          tasks_efficiency_duty_time: 12
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Operations daily report created successfully'
      });
    });

    it('validates missing and invalid inputs', async () => {
      req.body = { report_date: '2024-01-15' };
      await operationsDailyController.createReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req.body = { operations_id: 1, report_date: 'invalid-date' };
      await operationsDailyController.createReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD.'
      });
    });
  });

  describe('previewReport', () => {
    it('returns the calculated preview for a single operations user', async () => {
      req.body = { operations_id: 1, report_date: '2024-01-15' };

      const preview = {
        operations_id: 1,
        operations_name: 'Operations User',
        report_date: '2024-01-15',
        properties_added: 6,
        leads_responded_to: 2,
        amending_previous_properties: 1
      };

      operationsDailyModel.calculateDailyData.mockResolvedValue(preview);

      await operationsDailyController.previewReport(req, res);

      expect(operationsDailyModel.calculateDailyData).toHaveBeenCalledWith(1, '2024-01-15');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: preview,
        message: 'Operations daily preview calculated successfully'
      });
    });
  });

  describe('previewBulkReport', () => {
    it('returns previews for multiple selected operations users', async () => {
      req.body = {
        report_date: '2024-01-15',
        operations_ids: [1, 2]
      };

      operationsDailyModel.calculateDailyData
        .mockResolvedValueOnce({
          operations_id: 1,
          operations_name: 'Ops 1',
          report_date: '2024-01-15',
          properties_added: 4,
          leads_responded_to: 2,
          amending_previous_properties: 1
        })
        .mockResolvedValueOnce({
          operations_id: 2,
          operations_name: 'Ops 2',
          report_date: '2024-01-15',
          properties_added: 7,
          leads_responded_to: 3,
          amending_previous_properties: 2
        });
      operationsDailyModel.getAllReports.mockResolvedValue([]);

      await operationsDailyController.previewBulkReport(req, res);

      expect(operationsDailyModel.calculateDailyData).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          report_date: '2024-01-15',
          reports: expect.arrayContaining([
            expect.objectContaining({ operations_id: 1, report_exists: false }),
            expect.objectContaining({ operations_id: 2, report_exists: false })
          ])
        },
        message: 'Operations daily bulk preview calculated successfully'
      });
    });

    it('requires at least one operations user', async () => {
      req.body = { report_date: '2024-01-15' };

      await operationsDailyController.previewBulkReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please select at least one operations user'
      });
    });
  });

  describe('createBulkReports', () => {
    it('creates bulk reports for all operations users', async () => {
      req.body = {
        report_date: '2024-01-15',
        all_operations: true
      };

      operationsDailyModel.getOperationsUsers.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      operationsDailyModel.createReportsBulk.mockResolvedValue({
        created: [{ id: 10 }],
        skipped: [],
        report_date: '2024-01-15'
      });

      await operationsDailyController.createBulkReports(req, res);

      expect(operationsDailyModel.getOperationsUsers).toHaveBeenCalled();
      expect(operationsDailyModel.createReportsBulk).toHaveBeenCalledWith(
        [
          { operations_id: 1 },
          { operations_id: 2 }
        ],
        '2024-01-15'
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejects bulk creation when no users are selected', async () => {
      req.body = { report_date: '2024-01-15' };

      await operationsDailyController.createBulkReports(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please select at least one operations user'
      });
    });
  });

  describe('updateReport and recalculateReport', () => {
    it('updates workbook fields and can trigger recalculation', async () => {
      req.params = { id: '7' };
      req.body = {
        preparing_contract: 5,
        tasks_efficiency: 2,
        recalculate: true
      };

      const updated = { id: 7, preparing_contract: 5, tasks_efficiency: 2 };
      operationsDailyModel.updateReport.mockResolvedValue(updated);

      await operationsDailyController.updateReport(req, res);

      expect(operationsDailyModel.updateReport).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          preparing_contract: 5,
          tasks_efficiency: 2,
          recalculate: true
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updated,
        message: 'Operations daily report updated successfully'
      });
    });

    it('recalculates an existing report', async () => {
      req.params = { id: '8' };
      operationsDailyModel.recalculateReport.mockResolvedValue({
        id: 8,
        properties_added: 11
      });

      await operationsDailyController.recalculateReport(req, res);

      expect(operationsDailyModel.recalculateReport).toHaveBeenCalledWith(8);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 8, properties_added: 11 },
        message: 'Operations daily report recalculated successfully'
      });
    });
  });

  describe('getAllReports and getReportById', () => {
    it('lists reports with filters and returns a report by id', async () => {
      req.query = {
        operations_id: '3',
        report_date: '2024-01-15'
      };
      operationsDailyModel.getAllReports.mockResolvedValue([{ id: 1 }]);

      await operationsDailyController.getAllReports(req, res);

      expect(operationsDailyModel.getAllReports).toHaveBeenCalledWith({
        operations_id: '3',
        report_date: '2024-01-15'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }],
        message: 'Operations daily reports retrieved successfully'
      });

      req.params = { id: '12' };
      operationsDailyModel.getReportById.mockResolvedValue({ id: 12 });
      await operationsDailyController.getReportById(req, res);
      expect(operationsDailyModel.getReportById).toHaveBeenCalledWith(12);
    });
  });

  describe('exports', () => {
    it('exports a report to Excel and PDF', async () => {
      req.params = { id: '21' };
      const report = {
        id: 21,
        operations_name: 'John Doe',
        report_date: '2024-01-15'
      };
      const excelBuffer = Buffer.from('excel');
      const pdfBuffer = Buffer.from('pdf');

      operationsDailyModel.getReportById.mockResolvedValue(report);
      exportOperationsDailyToExcel.mockResolvedValue(excelBuffer);
      exportOperationsDailyToPDF.mockResolvedValue(pdfBuffer);

      await operationsDailyController.exportReportToExcel(req, res);
      expect(exportOperationsDailyToExcel).toHaveBeenCalledWith(report);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.send).toHaveBeenCalledWith(excelBuffer);

      jest.clearAllMocks();
      operationsDailyModel.getReportById.mockResolvedValue(report);
      exportOperationsDailyToPDF.mockResolvedValue(pdfBuffer);

      await operationsDailyController.exportReportToPDF(req, res);
      expect(exportOperationsDailyToPDF).toHaveBeenCalledWith(report);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalledWith(pdfBuffer);
    });
  });
});
