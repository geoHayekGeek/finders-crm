// __tests__/utils/operationsDailyExporter.test.js
const operationsDailyExporter = require('../../utils/operationsDailyExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Mock dependencies
jest.mock('exceljs');
jest.mock('pdfkit');

describe('Operations Daily Exporter', () => {
  const mockReport = {
    report_date: '2024-01-15',
    operations_name: 'John Doe',
    properties_added: 5,
    leads_responded_to: 10,
    leads_responded_out_of_duty_time: 2,
    amending_previous_properties: 3,
    preparing_contract: 2,
    tasks_efficiency_duty_time: 8,
    tasks_efficiency_uniform: 7,
    tasks_efficiency_after_duty: 6
  };

  describe('exportOperationsDailyToExcel', () => {
    it('should export operations daily report to Excel successfully', async () => {
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue({
          columns: [],
          mergeCells: jest.fn(),
          getCell: jest.fn().mockReturnValue({
            value: null,
            font: {},
            alignment: {},
            fill: {}
          })
        }),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      const result = await operationsDailyExporter.exportOperationsDailyToExcel(mockReport);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Operations Daily Report');
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should calculate effective leads responded correctly', async () => {
      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {}
        })
      };

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await operationsDailyExporter.exportOperationsDailyToExcel(mockReport);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
    });

    it('should highlight negative values in red', async () => {
      const reportWithNegative = {
        ...mockReport,
        tasks_efficiency_duty_time: -1
      };

      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {}
        })
      };

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await operationsDailyExporter.exportOperationsDailyToExcel(reportWithNegative);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
    });
  });

  describe('exportOperationsDailyToPDF', () => {
    it('should export operations daily report to PDF successfully', async () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        fillColor: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        y: 100,
        page: { height: 792 },
        rect: jest.fn().mockReturnThis(),
        fill: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 0);
          }
          return mockDoc;
        }),
        end: jest.fn()
      };

      PDFDocument.mockImplementation(() => mockDoc);

      const result = await operationsDailyExporter.exportOperationsDailyToPDF(mockReport);

      expect(PDFDocument).toHaveBeenCalledWith({ margin: 50, size: 'LETTER' });
      expect(mockDoc.text).toHaveBeenCalled();
      expect(mockDoc.end).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle PDF generation errors', async () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        fillColor: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        y: 100,
        page: { height: 792 },
        rect: jest.fn().mockReturnThis(),
        fill: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('PDF generation failed')), 0);
          }
          return mockDoc;
        }),
        end: jest.fn()
      };

      PDFDocument.mockImplementation(() => mockDoc);

      await expect(operationsDailyExporter.exportOperationsDailyToPDF(mockReport)).rejects.toThrow('PDF generation failed');
    });
  });
});

