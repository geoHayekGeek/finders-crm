// __tests__/utils/dcsrReportExporter.test.js
const dcsrExporter = require('../../utils/dcsrReportExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Mock dependencies
jest.mock('exceljs');
jest.mock('pdfkit');

describe('DCSR Report Exporter', () => {
  const mockReport = {
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    year: 2024,
    month: 1,
    listings_count: 100,
    leads_count: 50,
    sales_count: 20,
    rent_count: 15,
    viewings_count: 80
  };

  describe('exportDCSRToExcel', () => {
    it('should export DCSR report to Excel successfully', async () => {
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

      const result = await dcsrExporter.exportDCSRToExcel(mockReport);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('DCSR Report');
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format DCSR report data correctly', async () => {
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

      await dcsrExporter.exportDCSRToExcel(mockReport);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
      expect(mockWorksheet.mergeCells).toHaveBeenCalled();
    });
  });

  describe('exportDCSRToPDF', () => {
    it('should export DCSR report to PDF successfully', async () => {
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

      const result = await dcsrExporter.exportDCSRToPDF(mockReport);

      expect(PDFDocument).toHaveBeenCalledWith({ margin: 50, size: 'LETTER' });
      expect(mockDoc.text).toHaveBeenCalled();
      expect(mockDoc.end).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format PDF content correctly', async () => {
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

      await dcsrExporter.exportDCSRToPDF(mockReport);

      expect(mockDoc.text).toHaveBeenCalledWith('DCSR Company Report', expect.any(Object));
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

      await expect(dcsrExporter.exportDCSRToPDF(mockReport)).rejects.toThrow('PDF generation failed');
    });
  });
});

