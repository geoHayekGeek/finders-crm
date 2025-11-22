// __tests__/utils/saleRentSourceReportExporter.test.js
const saleRentSourceExporter = require('../../utils/saleRentSourceReportExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Mock dependencies
jest.mock('exceljs');
jest.mock('pdfkit');

describe('Sale & Rent Source Report Exporter', () => {
  const mockRows = [
    {
      closed_date: '2024-01-15',
      agent_name: 'John Doe',
      reference_number: 'PROP001',
      sold_rented: 'Sold',
      source_name: 'Website',
      finders_commission: 5000,
      client_name: 'Jane Smith'
    },
    {
      closed_date: '2024-01-16',
      agent_name: 'John Doe',
      reference_number: 'PROP002',
      sold_rented: 'Rented',
      source_name: 'Referral',
      finders_commission: 3000,
      client_name: 'Bob Johnson'
    }
  ];

  const mockMeta = {
    agentName: 'John Doe',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  };

  describe('exportSaleRentSourceToExcel', () => {
    it('should export sale & rent source report to Excel successfully', async () => {
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue({
          columns: [],
          mergeCells: jest.fn(),
          getCell: jest.fn().mockReturnValue({
            value: null,
            font: {},
            alignment: {}
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

      const result = await saleRentSourceExporter.exportSaleRentSourceToExcel(mockRows, mockMeta);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Sale & Rent Source');
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format date correctly', async () => {
      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {}
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

      await saleRentSourceExporter.exportSaleRentSourceToExcel(mockRows, mockMeta);

      expect(mockWorksheet.getCell).toHaveBeenCalled();
    });

    it('should handle empty rows', async () => {
      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {}
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

      await saleRentSourceExporter.exportSaleRentSourceToExcel([], mockMeta);

      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
    });

    it('should handle different date formats', async () => {
      const rowsWithDifferentDates = [
        {
          ...mockRows[0],
          closed_date: '2024-01-15T10:00:00Z'
        }
      ];

      const mockWorksheet = {
        columns: [],
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {}
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

      await saleRentSourceExporter.exportSaleRentSourceToExcel(rowsWithDifferentDates, mockMeta);

      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
    });
  });

  describe('exportSaleRentSourceToPDF', () => {
    it('should export sale & rent source report to PDF successfully', async () => {
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

      const result = await saleRentSourceExporter.exportSaleRentSourceToPDF(mockRows, mockMeta);

      expect(PDFDocument).toHaveBeenCalledWith({ margin: 40, size: 'A4' });
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

      PDFDocument.mockImplementation(() => {
        // Simulate error during construction
        throw new Error('PDF generation failed');
      });

      await expect(saleRentSourceExporter.exportSaleRentSourceToPDF(mockRows, mockMeta)).rejects.toThrow('PDF generation failed');
    });
  });
});

