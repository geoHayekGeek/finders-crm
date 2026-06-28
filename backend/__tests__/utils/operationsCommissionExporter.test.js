// __tests__/utils/operationsCommissionExporter.test.js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const operationsCommissionExporter = require('../../utils/operationsCommissionExporter');

jest.mock('pdfkit');

describe('Operations Commission Exporter', () => {
  const mockReport = {
    start_date: '2026-01-01',
    end_date: '2026-02-28',
    year: 2026,
    month: 1,
    commission_percentage: 2.5,
    total_properties_count: 3,
    total_sales_count: 2,
    total_rent_count: 1,
    total_sales_value: 5000000,
    total_rent_value: 200000,
    total_commission_amount: 130000,
    properties: [
      {
        reference_number: 'FRA001',
        agent_name: 'Nader Bechara',
        property_type: 'sale',
        commission: 1000,
        closed_date: '2026-01-10',
        notes: 'First month note'
      },
      {
        reference_number: 'FRA002',
        agent_name: 'Yorgo Mourady',
        property_type: 'rent',
        commission: 500,
        closed_date: '2026-01-17',
        notes: ''
      },
      {
        reference_number: 'FRA003',
        agent_name: 'Elie Ghafari',
        property_type: 'sale',
        commission: 1500,
        closed_date: '2026-02-02',
        notes: 'Second month note'
      }
    ]
  };

  describe('exportOperationsCommissionToExcel', () => {
    it('should export a month-grouped workbook that matches the sheet layout', async () => {
      const buffer = await operationsCommissionExporter.exportOperationsCommissionToExcel(mockReport);

      expect(buffer).toBeInstanceOf(Buffer);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Operations Commission');

      expect(worksheet).toBeDefined();
      expect(worksheet.getCell('A1').value).toBe('Date');
      expect(worksheet.getCell('B1').value).toBe('Reference');
      expect(worksheet.getCell('C1').value).toBe('Agent');
      expect(worksheet.getCell('D1').value).toBe('Sale');
      expect(worksheet.getCell('E1').value).toBe('Rent');
      expect(worksheet.getCell('F1').value).toBe('Total Commission Operation');

      expect(worksheet.getCell('A2').value).toBe('1/10/2026');
      expect(worksheet.getCell('B2').value).toBe('FRA001');
      expect(worksheet.getCell('C2').value).toBe('Nader Bechara');
      expect(worksheet.getCell('D2').value).toBe(1);
      expect(worksheet.getCell('F2').value).toBe('$1,000.00');

      expect(worksheet.getCell('A4').value).toBe('TOTAL');
      expect(worksheet.getCell('D4').value).toBe(1);
      expect(worksheet.getCell('E4').value).toBe(1);
      expect(worksheet.getCell('F4').value).toBe('$1,500.00');

      expect(worksheet.getCell('A5').value).toBe('2/2/2026');
      expect(worksheet.getCell('B5').value).toBe('FRA003');
      expect(worksheet.getCell('C5').value).toBe('Elie Ghafari');
      expect(worksheet.getCell('D5').value).toBe(1);
      expect(worksheet.getCell('F5').value).toBe('$1,500.00');

      expect(worksheet.getCell('A6').value).toBe('TOTAL');
      expect(worksheet.getCell('D6').value).toBe(1);
      expect(worksheet.getCell('E6').value).toBe(0);
      expect(worksheet.getCell('F6').value).toBe('$1,500.00');

      expect(worksheet.getColumn(6).width).toBe(28);
    });

    it('should export successfully when closed_date values are Date objects', async () => {
      const buffer = await operationsCommissionExporter.exportOperationsCommissionToExcel({
        ...mockReport,
        properties: [
          {
            ...mockReport.properties[0],
            closed_date: new Date('2026-01-10T00:00:00.000Z')
          },
          {
            ...mockReport.properties[1],
            closed_date: new Date('2026-01-17T00:00:00.000Z')
          },
          {
            ...mockReport.properties[2],
            closed_date: new Date('2026-02-02T00:00:00.000Z')
          }
        ]
      });

      expect(buffer).toBeInstanceOf(Buffer);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Operations Commission');

      expect(worksheet.getCell('A2').value).toBe('1/10/2026');
      expect(worksheet.getCell('A3').value).toBe('1/17/2026');
      expect(worksheet.getCell('A5').value).toBe('2/2/2026');
    });

    it('should still export a workbook when no properties exist', async () => {
      const buffer = await operationsCommissionExporter.exportOperationsCommissionToExcel({
        ...mockReport,
        properties: []
      });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Operations Commission');

      expect(worksheet.getCell('A1').value).toBe('Date');
      expect(worksheet.getCell('A2').value).toBe('TOTAL');
      expect(worksheet.getCell('D2').value).toBe(0);
      expect(worksheet.getCell('E2').value).toBe(0);
      expect(worksheet.getCell('F2').value).toBe('$0.00');
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
