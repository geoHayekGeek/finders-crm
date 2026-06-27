// __tests__/utils/saleRentSourceReportExporter.test.js
const saleRentSourceExporter = require('../../utils/saleRentSourceReportExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

jest.mock('pdfkit');

describe('Sale & Rent Source Report Exporter', () => {
  const mockRows = [
    {
      property_id: 1,
      closed_date: '2024-01-12',
      team_leader_id: 1,
      team_leader_name: 'Alpha Team',
      team_leader_code: 'TL-A',
      agent_name: 'Alice Agent',
      agent_code: 'A-1',
      agent_role: 'team leader',
      reference_number: 'PROP001',
      sold_rented: 'SOLD',
      source_name: 'Website',
      owner_name: 'Jane Smith',
      phone_number: '03/222222',
      finders_commission: 5000,
      notes: 'This is a much longer note that should be merged across the notes columns'
    },
    {
      property_id: 2,
      closed_date: '2024-01-15',
      team_leader_id: 1,
      team_leader_name: 'Alpha Team',
      team_leader_code: 'TL-A',
      agent_name: 'Bob Agent',
      agent_code: 'A-2',
      agent_role: 'agent',
      reference_number: 'PROP002',
      sold_rented: 'Rented',
      source_name: 'Referral',
      owner_name: 'John Smith',
      phone_number: '03/111111',
      finders_commission: 3000,
      notes: ''
    },
    {
      property_id: 3,
      closed_date: '2024-01-20',
      team_leader_id: 2,
      team_leader_name: 'Beta Team',
      team_leader_code: 'TL-B',
      agent_name: 'Charlie Agent',
      agent_code: 'B-1',
      agent_role: 'consultant',
      reference_number: 'PROP003',
      sold_rented: 'SOLD',
      source_name: 'Facebook',
      owner_name: 'Bob Johnson',
      phone_number: '03/333333',
      finders_commission: 2500,
      notes: 'SECOND'
    }
  ];

  const mockMeta = {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  };

  describe('exportSaleRentSourceToExcel', () => {
    it('should export sale & rent source report to Excel with workbook layout', async () => {
      const buffer = await saleRentSourceExporter.exportSaleRentSourceToExcel(mockRows, mockMeta);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Sale & Rent Source');

      expect(worksheet.getCell('A1').value).toBe('Date');
      expect(worksheet.getCell('B1').value).toBe('Agent name');
      expect(worksheet.getCell('H1').value).toBe('Find Com');
      expect(worksheet.getCell('B2').value).toBe('Alice Agent');
      expect(worksheet.getCell('H2').value).toBe(5000);
      expect(worksheet.getCell('H2').numFmt).toBe('[$$-409]#,##0.00;[Red][$$-409]#,##0.00');
      expect(worksheet.getCell('B2').fill.type).toBe('pattern');
      expect(worksheet.getCell('B2').fill.pattern).toBe('solid');
      expect(worksheet.getCell('I2').value).toBe('This is a much longer note that should be merged across the notes columns');
      expect(worksheet.getCell('I4').value).toBe('SECOND');
    });

    it('should handle empty rows and still create the sheet header', async () => {
      const buffer = await saleRentSourceExporter.exportSaleRentSourceToExcel([], mockMeta);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Sale & Rent Source');
      expect(worksheet.getCell('A1').value).toBe('Date');
      expect(worksheet.rowCount).toBeGreaterThanOrEqual(1);
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
        stroke: jest.fn().mockReturnThis(),
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
      PDFDocument.mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      await expect(
        saleRentSourceExporter.exportSaleRentSourceToPDF(mockRows, mockMeta)
      ).rejects.toThrow('PDF generation failed');
    });
  });
});
