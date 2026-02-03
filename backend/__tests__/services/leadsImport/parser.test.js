const ExcelJS = require('exceljs');
const { parseXlsx, parseCsv, parseFile } = require('../../../services/leadsImport/parser');

describe('leadsImport parser', () => {
  describe('parseXlsx', () => {
    it('reads sheet Customers and returns rows', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customers');
      sheet.addRow(['Date', 'Customer Name', 'Phone Number', 'Agent Name', 'Price', 'Source', 'Operations']);
      sheet.addRow(['2024-01-15', 'John Doe', '03/729646', 'Nader', '100000', 'INSTA', 'MA']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseXlsx(Buffer.from(buffer));
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['customer name'] || result.rows[0]['Customer Name']).toBe('John Doe');
      expect(result.sheetWarning).toBeUndefined();
    });

    it('merges duplicate "Customer Name" columns (first + last)', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customers');
      sheet.addRow(['Date', 'Customer Name', 'Customer Name', 'Phone Number']);
      sheet.addRow(['2024-01-15', 'Hayat', 'Moussa', '03/729646']);
      sheet.addRow(['2024-01-16', 'Marie', '', '76/321434']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseXlsx(Buffer.from(buffer));
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]['customer name']).toBe('Hayat Moussa');
      expect(result.rows[1]['customer name']).toBe('Marie');
    });

    it('uses first sheet and sets sheetWarning when Customers not found', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(['Date', 'Customer Name']);
      sheet.addRow(['2024-01-01', 'Test']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseXlsx(Buffer.from(buffer));
      expect(result.sheetWarning).toContain('Customers');
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('parseCsv', () => {
    it('parses CSV string with headers', async () => {
      const csv = 'Date,Customer Name,Phone Number\n2024-01-15,John Doe,03729646';
      const result = await parseCsv(Buffer.from(csv, 'utf8'));
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].date || result.rows[0].Date).toBeDefined();
      expect(result.rows[0]['customer name'] || result.rows[0]['Customer Name']).toContain('John');
    });
  });

  describe('parseFile', () => {
    it('dispatches to parseXlsx for xlsx mime', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customers');
      sheet.addRow(['Date', 'Customer Name']);
      sheet.addRow(['2024-01-01', 'A']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseFile(Buffer.from(buffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.rows).toHaveLength(1);
    });

    it('dispatches to parseCsv for text/csv', async () => {
      const csv = 'Date,Customer Name\n2024-01-01,Bob';
      const result = await parseFile(Buffer.from(csv, 'utf8'), 'text/csv');
      expect(result.rows).toHaveLength(1);
    });
  });
});
