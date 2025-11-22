// __tests__/utils/operationsCommissionExporter.test.js
const operationsCommissionExporter = require('../../utils/operationsCommissionExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Mock dependencies
jest.mock('exceljs');
jest.mock('pdfkit');

describe('Operations Commission Exporter', () => {
  const mockReport = {
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    year: 2024,
    month: 1,
    commission_percentage: 3,
    total_properties_count: 50,
    total_sales_count: 30,
    total_rent_count: 20,
    total_sales_value: 5000000,
    total_rent_value: 200000,
    total_commission_amount: 156000,
    properties: [
      {
        reference_number: 'PROP001',
        type: 'Sale',
        price: 100000,
        commission_percentage: 3,
        commission_amount: 3000
      }
    ]
  };

  describe('exportOperationsCommissionToExcel', () => {
    it('should export operations commission report to Excel successfully', async () => {
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue({
          columns: [],
          mergeCells: jest.fn(),
          getCell: jest.fn().mockReturnValue({
            value: null,
            font: {},
            alignment: {},
            fill: {}
          }),
          addRow: jest.fn()
        }),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      const result = await operationsCommissionExporter.exportOperationsCommissionToExcel(mockReport);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Operations Commission');
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format report data correctly', async () => {
      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {}
        }),
        addRow: jest.fn()
      };

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await operationsCommissionExporter.exportOperationsCommissionToExcel(mockReport);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
      expect(mockWorksheet.mergeCells).toHaveBeenCalled();
    });

    it('should handle reports with properties', async () => {
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

      await operationsCommissionExporter.exportOperationsCommissionToExcel(mockReport);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
    });

    it('should handle reports without properties', async () => {
      const reportWithoutProperties = { ...mockReport };
      delete reportWithoutProperties.properties;

      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {}
        }),
        addRow: jest.fn()
      };

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await operationsCommissionExporter.exportOperationsCommissionToExcel(reportWithoutProperties);

      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
    });
  });

  describe('exportOperationsCommissionToPDF', () => {
    it('should export operations commission report to PDF successfully', async () => {
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

      const result = await operationsCommissionExporter.exportOperationsCommissionToPDF(mockReport);

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

      await expect(operationsCommissionExporter.exportOperationsCommissionToPDF(mockReport)).rejects.toThrow('PDF generation failed');
    });
  });
});

