// __tests__/utils/reportExporter.test.js
const reportExporter = require('../../utils/reportExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Mock dependencies
jest.mock('exceljs');
jest.mock('pdfkit');

describe('Report Exporter', () => {
  const mockReport = {
    agent_name: 'John Doe',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    year: 2024,
    month: 1,
    listings_count: 10,
    viewings_count: 20,
    boosts: 5,
    sales_count: 3,
    sales_amount: 500000,
    agent_commission: 10000,
    finders_commission: 5000,
    // referral_commission removed - use referrals_on_properties_commission instead
    team_leader_commission: 1000,
    administration_commission: 500,
    referrals_on_properties_commission: 300,
    referrals_on_properties_count: 2,
    total_commission: 16800, // Updated: removed referral_commission (2000)
    referral_received_count: 1,
    referral_received_commission: 1000,
    lead_sources: {
      'Website': 5,
      'Referral': 3
    }
  };

  describe('exportToExcel', () => {
    it('should export report to Excel successfully', async () => {
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
          getRow: jest.fn().mockReturnValue({
            values: [],
            font: {},
            fill: {}
          })
        }),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      const result = await reportExporter.exportToExcel(mockReport);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Agent Report');
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
        getRow: jest.fn().mockReturnValue({
          values: [],
          font: {},
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

      await reportExporter.exportToExcel(mockReport);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
      expect(mockWorksheet.mergeCells).toHaveBeenCalled();
    });

    it('should handle reports with lead sources', async () => {
      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {}
        }),
        getRow: jest.fn().mockReturnValue({
          values: [],
          font: {},
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

      await reportExporter.exportToExcel(mockReport);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
    });

    it('should handle reports without lead sources', async () => {
      const reportWithoutSources = { ...mockReport };
      delete reportWithoutSources.lead_sources;

      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {}
        }),
        getRow: jest.fn().mockReturnValue({
          values: [],
          font: {},
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

      await reportExporter.exportToExcel(reportWithoutSources);

      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
    });
  });

  describe('exportToPDF', () => {
    it('should export report to PDF successfully', async () => {
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

      const result = await reportExporter.exportToPDF(mockReport);

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

      await reportExporter.exportToPDF(mockReport);

      expect(mockDoc.text).toHaveBeenCalledWith('Agent Report', expect.any(Object));
      expect(mockDoc.text).toHaveBeenCalledWith('John Doe', expect.any(Object));
    });

    it('should handle reports with lead sources in PDF', async () => {
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

      await reportExporter.exportToPDF(mockReport);

      expect(mockDoc.text).toHaveBeenCalled();
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

      await expect(reportExporter.exportToPDF(mockReport)).rejects.toThrow('PDF generation failed');
    });
  });
});

