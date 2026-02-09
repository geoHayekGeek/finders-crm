/**
 * Parse .xlsx or .csv for property import.
 * Sheet "Sheet1" or first sheet. Headers trimmed (trailing spaces).
 * Expected: Date, Reference, Active, Location, Category, Bldg Name, Owner Name, Phone Number,
 * Surface, Details, Interior Details, Built Year, Concierge, View, Agent Name, Price, Notes, Operations.
 */

const ExcelJS = require('exceljs');
const { parseString } = require('fast-csv');

/** Get plain text from a cell value. */
function cellToText(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val instanceof Date) return val.toISOString ? val.toISOString().split('T')[0] : String(val);
  if (typeof val === 'object') {
    if (val.result !== undefined) return cellToText(val.result);
    if (val.text !== undefined) return String(val.text);
    if (Array.isArray(val.richText)) return val.richText.map(seg => seg && seg.text).filter(Boolean).join('') || '';
  }
  return String(val);
}

function stripInvisible(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.replace(/\uFEFF/g, '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
}

function normalizeHeader(h) {
  if (h == null) return '';
  return stripInvisible(String(cellToText(h))).toLowerCase();
}

function assignCell(rowObj, key, value) {
  if (!key) return;
  const existing = rowObj[key];
  if (existing == null || existing === '') {
    rowObj[key] = value;
    return;
  }
  if (value == null || value === '') return;
  rowObj[key] = value;
}

async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  let sheet = workbook.getWorksheet('Sheet1');
  let sheetWarning;
  if (!sheet) {
    sheet = workbook.worksheets[0];
    sheetWarning = 'Sheet "Sheet1" not found; used first sheet';
  }
  if (!sheet) {
    return { rows: [], sheetWarning: 'No worksheets found' };
  }
  const rows = [];
  const headerRow = sheet.getRow(1);
  const colCount = Math.max(sheet.columnCount || 0, 25);
  const headers = [];
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    const val = cell.value;
    const h = normalizeHeader(val);
    if (h === '') continue;
    headers.push({ index: c, key: h || `col_${c}` });
  }

  for (let r = 2; r <= (sheet.rowCount || 1); r++) {
    const rowObj = {};
    let hasAny = false;
    for (const { key, index } of headers) {
      const cell = sheet.getRow(r).getCell(index);
      const val = cell.value;
      const text = cellToText(val);
      const trimmed = stripInvisible(text);
      if (trimmed !== '') hasAny = true;
      assignCell(rowObj, key, trimmed);
    }
    if (hasAny) rows.push(rowObj);
  }

  return { rows, sheetWarning };
}

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const str = buffer.toString('utf8');
    let first = true;
    let headers = [];
    parseString(str, { headers: false, trim: true })
      .on('data', (row) => {
        const arr = Array.isArray(row) ? row : Object.values(row);
        if (first) {
          first = false;
          headers = arr.map((h, i) => normalizeHeader(h) || `col_${i}`);
          return;
        }
        const obj = {};
        let hasAny = false;
        headers.forEach((key, i) => {
          const val = (arr[i] != null ? String(arr[i]).trim() : '') || '';
          if (val) hasAny = true;
          assignCell(obj, key, stripInvisible(val));
        });
        if (hasAny) rows.push(obj);
      })
      .on('end', () => resolve({ rows }))
      .on('error', reject);
  });
}

async function parseFile(buffer, mimeType) {
  const isCsv = mimeType === 'text/csv' || mimeType === 'application/csv' || mimeType === 'text/plain';
  if (isCsv) return parseCsv(buffer);
  return parseXlsx(buffer);
}

module.exports = {
  parseXlsx,
  parseCsv,
  parseFile,
  normalizeHeader,
  stripInvisible,
  cellToText,
};
