/**
 * Property import parser tests: small xlsx fixture (Sheet1, expected headers).
 */

const ExcelJS = require('exceljs');
const { parseXlsx, parseCsv, parseFile } = require('../../../services/propertyImport/parser');

describe('propertyImport parser', () => {
  const propertyHeaders = [
    'Date',
    'Reference',
    'Active',
    'Location',
    'Category',
    'Bldg Name',
    'Owner Name',
    'Phone Number',
    'Surface',
    'Details ( Floor, Balcony, Parking, Cave)',
    'Interior Details',
    'Built Year',
    'Concierge',
    'View',
    'Agent Name',
    'Price',
    'Notes',
    'Operations',
  ];

  describe('parseXlsx', () => {
    it('reads Sheet1 and returns rows with normalized (lowercase) keys', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(propertyHeaders);
      sheet.addRow([
        '2024-01-15',
        'FSL26001',
        'Active',
        'Hamra',
        'Apartment',
        'Bldg A',
        'John Doe',
        '03/145375',
        '120',
        'Floor 2',
        '2BR 2 Bath',
        '2010',
        'Yes',
        'Yes',
        'Nader',
        '250000',
        'Nice view',
        'MA',
      ]);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseXlsx(Buffer.from(buffer));
      expect(result.rows).toHaveLength(1);
      expect(result.sheetWarning).toBeUndefined();
      const row = result.rows[0];
      expect(row.date || row['date']).toBeDefined();
      expect(row.reference || row['reference']).toContain('FSL26001');
      expect(row['owner name'] || row.owner_name).toContain('John');
      expect(row['phone number'] || row.phone_number).toContain('03');
      expect(row.category).toContain('Apartment');
      expect(row.operations).toContain('MA');
    });

    it('handles headers with trailing spaces (trimmed)', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(['Date ', 'Reference ', 'Owner Name ', 'Phone Number ', 'Surface ', 'Category ', 'Active ', 'Operations ']);
      sheet.addRow(['2024-02-01', 'FSL26002', 'Jane Doe', '70/966803', '85', 'Office', 'Active', 'GC']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseXlsx(Buffer.from(buffer));
      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row['date']).toBeDefined();
      expect(row['reference']).toContain('FSL26002');
      expect(row['owner name']).toContain('Jane');
      expect(row['phone number']).toContain('70');
      expect(row['surface']).toContain('85');
      expect(row['category']).toContain('Office');
    });

    it('uses first sheet and sets sheetWarning when Sheet1 not found', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('OtherSheet');
      sheet.addRow(['Date', 'Reference', 'Owner Name', 'Phone Number']);
      sheet.addRow(['2024-01-01', 'R1', 'Test', '03/123456']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseXlsx(Buffer.from(buffer));
      expect(result.sheetWarning).toBeDefined();
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('parseFile', () => {
    it('dispatches to parseXlsx for xlsx mime', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(['Date', 'Reference', 'Owner Name', 'Phone Number', 'Surface', 'Category', 'Active', 'Operations']);
      sheet.addRow(['2024-01-10', 'FSL26003', 'Bob', '76/111222', '100', 'Shop', 'Active', 'MA']);
      const buffer = await workbook.xlsx.writeBuffer();
      const result = await parseFile(Buffer.from(buffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['reference']).toContain('FSL26003');
    });

    it('dispatches to parseCsv for text/csv', async () => {
      const csv = 'Date,Reference,Owner Name,Phone Number,Surface,Category,Active,Operations\n2024-01-01,R1,Alice,03/999888,90,Land,Active,GC';
      const result = await parseFile(Buffer.from(csv, 'utf8'), 'text/csv');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].reference || result.rows[0]['reference']).toContain('R1');
    });
  });
});
