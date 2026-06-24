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
        addWorksheet: jest.fn(),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      const mockWorksheet = {
        columns: [],
        pageSetup: {},
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {},
          border: {},
          numFmt: null
        })
      };

      mockWorkbook.addWorksheet.mockReturnValue(mockWorksheet);
      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      const result = await dcsrExporter.exportDCSRToExcel(mockReport, {
        team_breakdown: [
          {
            team_leader_id: 1,
            team_leader_name: 'Ali Ayash',
            team_leader_code: 'AA',
            agent_breakdown: [
              {
                id: 1,
                name: 'Ali Ayash',
                user_code: 'AA',
                role: 'team_leader',
                listings_count: 10,
                leads_count: 20,
                sales_count: 5,
                rent_count: 2,
                viewings_count: 7
              },
              {
                id: 2,
                name: 'Ara Markarian',
                user_code: 'AM',
                role: 'agent',
                listings_count: 4,
                leads_count: 8,
                sales_count: 1,
                rent_count: 0,
                viewings_count: 3
              }
            ]
          }
        ]
      }, {
        operations_breakdown: [
          { id: 11, name: 'Elsy Wehbe', user_code: 'EW', role: 'operations_manager', leads_count: 0 },
          { id: 12, name: 'Melissa Atallah', user_code: 'MA', role: 'operations', leads_count: 516 },
          { id: 13, name: 'Gaelle Chamoun', user_code: 'GC', role: 'operations', leads_count: 561 }
        ],
        total_leads_count: 1077,
        total_operations_users: 3
      });

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('DCSR Report');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(1);
      expect(mockWorksheet.mergeCells).toHaveBeenCalledWith('A2:A3');
      expect(mockWorksheet.mergeCells).toHaveBeenCalledWith('C2:D2');
      expect(mockWorksheet.mergeCells).toHaveBeenCalledWith('E2:F2');
      expect(mockWorksheet.mergeCells).toHaveBeenCalledWith('G2:G3');
      expect(mockWorksheet.mergeCells).toHaveBeenCalledWith('A6:B6');
      expect(mockWorksheet.mergeCells).toHaveBeenCalledWith('J9:K9');
      expect(mockWorksheet.getCell).toHaveBeenCalledWith(2, 10);
      expect(mockWorksheet.getCell).toHaveBeenCalledWith(2, 11);
      expect(mockWorksheet.getCell).toHaveBeenCalledWith(2, 12);
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format DCSR report data correctly', async () => {
      const mockWorksheet = {
        columns: [],
        pageSetup: {},
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {},
          border: {},
          numFmt: null
        })
      };

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await dcsrExporter.exportDCSRToExcel(mockReport, {
        team_breakdown: []
      }, {
        operations_breakdown: [],
        total_leads_count: 0,
        total_operations_users: 0
      });

      expect(mockWorksheet.getCell).toHaveBeenCalled();
      expect(mockWorksheet.mergeCells).toHaveBeenCalled();
    });

    it('should keep the operations table on the same worksheet', async () => {
      const createWorksheetMock = () => ({
        columns: [],
        pageSetup: {},
        mergeCells: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: null,
          font: {},
          alignment: {},
          fill: {},
          border: {},
          numFmt: null
        })
      });

      const worksheet = createWorksheetMock();
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(worksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      const operationsData = {
        operations_breakdown: [
          { id: 1, name: 'Elsy Wehbe', user_code: 'EW', role: 'operations_manager', leads_count: 0 },
          { id: 2, name: 'Melissa Atallah', user_code: 'MA', role: 'operations', leads_count: 516 },
          { id: 3, name: 'Gaelle Chamoun', user_code: 'GC', role: 'operations', leads_count: 561 }
        ],
        total_leads_count: 1077,
        total_operations_users: 3
      };

      const result = await dcsrExporter.exportDCSRToExcel(mockReport, {
        team_breakdown: [
          {
            team_leader_id: 1,
            team_leader_name: 'Ali Ayash',
            team_leader_code: 'AA',
            agent_breakdown: [
              {
                id: 1,
                name: 'Ali Ayash',
                user_code: 'AA',
                role: 'team_leader',
                listings_count: 12,
                leads_count: 95,
                sales_count: 0,
                rent_count: 0,
                viewings_count: 33
              }
            ]
          }
        ]
      }, operationsData);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(1);
      expect(worksheet.mergeCells).toHaveBeenCalledWith('J9:K9');
      expect(worksheet.getCell).toHaveBeenCalledWith(2, 10);
      expect(worksheet.getCell).toHaveBeenCalledWith(2, 11);
      expect(worksheet.getCell).toHaveBeenCalledWith(2, 12);
      expect(result).toBeInstanceOf(Buffer);
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

