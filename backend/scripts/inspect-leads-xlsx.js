/**
 * One-off script to inspect leads 24 25.xlsx structure and rows that report "Customer name is required"
 * Run: node scripts/inspect-leads-xlsx.js
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const file = path.join(process.env.USERPROFILE || '', 'Downloads', 'leads 24 25.xlsx');
if (!fs.existsSync(file)) {
  console.log('File not found:', file);
  process.exit(1);
}

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.worksheets[0];
  const name = sheet.name;
  console.log('Sheet name:', name);
  console.log('Rows:', sheet.rowCount, 'Columns:', sheet.columnCount);

  const headerRow = sheet.getRow(1);
  const headers = [];
  for (let c = 1; c <= Math.max(sheet.columnCount || 0, 15); c++) {
    const cell = headerRow.getCell(c);
    let v = cell.value;
    if (v && typeof v === 'object' && v.richText) v = v.richText.map(x => x && x.text).join('');
    if (v && typeof v === 'object' && v.text !== undefined) v = v.text;
    const raw = v == null ? '' : String(v);
    headers.push({ col: c, val: raw, charCodes: raw.slice(0, 50).split('').map((ch, i) => ch.charCodeAt(0)) });
  }
  console.log('\nHeaders:');
  headers.forEach(h => console.log('  Col', h.col, ':', JSON.stringify(h.val), 'codes:', h.charCodes.slice(0, 20)));

  function getCellVal(rowNum, col) {
    const cell = sheet.getRow(rowNum).getCell(col);
    let v = cell.value;
    if (v == null) return { raw: '', type: 'null' };
    if (typeof v === 'object' && v.richText) return { raw: v.richText.map(x => x && x.text).join(''), type: 'richText' };
    if (typeof v === 'object' && v.text !== undefined) return { raw: String(v.text), type: 'text' };
    if (typeof v === 'object' && v.result !== undefined) return { raw: String(v.result), type: 'result' };
    return { raw: String(v), type: typeof v };
  }

  // Find which column index is "Customer Name" in our parser (we skip Code and Reference)
  const parser = require('../services/leadsImport/parser');
  const buffer = fs.readFileSync(file);
  const { rows } = await parser.parseFile(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  console.log('\nFirst row keys from parser:', rows[0] ? Object.keys(rows[0]) : 'no rows');
  console.log('Row 1 (parser) customer-related:', rows[0] ? {
    'customer name': JSON.stringify((rows[0]['customer name'] || '')),
    customername: JSON.stringify((rows[0].customername || '')),
    ...Object.fromEntries(Object.entries(rows[0]).filter(([k]) => k.toLowerCase().includes('customer')))
  } : 'n/a');
  if (rows[3]) console.log('Row 4 (parser index 3, excel row 5):', { 'customer name': JSON.stringify(rows[3]['customer name']), keys: Object.keys(rows[3]) });
  if (rows[9]) console.log('Row 10 (parser index 9, excel row 11):', { 'customer name': JSON.stringify(rows[9]['customer name']) });

  console.log('\nRaw cell values for Customer Name column (B=2):');
  for (const rowNum of [2, 5, 11, 12, 14]) {
    const cellB = getCellVal(rowNum, 2);
    const repr = JSON.stringify(cellB.raw);
    const codes = cellB.raw.slice(0, 30).split('').map(c => c.charCodeAt(0));
    console.log('  Row', rowNum, 'Col 2:', repr, 'length=', cellB.raw.length, 'codes=', codes);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
