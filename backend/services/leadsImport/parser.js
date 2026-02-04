/**
 * Parse .xlsx or .csv buffer; read sheet "Customers" or first sheet.
 * Expected headers: Date, Customer Name, Phone Number, Agent Name, Price, Source, Operations.
 * Ignore columns: empty spacer columns.
 */

const ExcelJS = require('exceljs');
const { parseString } = require('fast-csv');

const EXPECTED_HEADERS = [
  'date',
  'customer name',
  'phone number',
  'agent name',
  'price',
  'source',
  'operations',
];

const IGNORE_COLUMNS = new Set(['']);

/** Get plain text from a cell value (string, { text }, { richText: [{ text }] }, or formula result). */
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

/** Strip BOM and zero-width/invisible chars that Excel sometimes exports. */
function stripInvisible(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.replace(/\uFEFF/g, '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
}

/** Normalize string: trim, collapse spaces, replace non-breaking and other Unicode spaces with regular space. */
function normalizeHeader(h) {
  if (h == null) return '';
  const s = stripInvisible(String(cellToText(h)));
  return s.toLowerCase();
}

/**
 * Assign a value to a row object, handling duplicate headers safely.
 * - For duplicate "customer name" columns, join non-empty parts with a space (first + last).
 * - For other duplicates, prefer the first non-empty value.
 */
function assignCell(rowObj, key, value) {
  if (!key) return;
  const existing = rowObj[key];
  if (existing == null || existing === '') {
    rowObj[key] = value;
    return;
  }
  if (value == null || value === '') return;

  if (key === 'customer name') {
    // Join parts like "Hayat" + "Moussa" => "Hayat Moussa"
    const combined = stripInvisible(`${existing} ${value}`);
    rowObj[key] = combined;
    return;
  }

  // Keep the first non-empty value for other columns.
}

/**
 * Parse XLSX buffer. Sheet "Customers" if exists, else first sheet.
 * @param {Buffer} buffer
 * @returns {{ rows: Array<Record<string, string>>, sheetWarning?: string }}
 */
async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  let sheet = workbook.getWorksheet('Customers');
  let sheetWarning;
  if (!sheet) {
    sheet = workbook.worksheets[0];
    sheetWarning = 'Sheet "Customers" not found; used first sheet';
  }
  if (!sheet) {
    return { rows: [], sheetWarning: 'No worksheets found' };
  }
  const rows = [];
  const headerRow = sheet.getRow(1);
  const colCount = sheet.columnCount || 20;
  const headers = [];
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    const val = cell.value;
    const h = normalizeHeader(val);
    if (IGNORE_COLUMNS.has(h)) continue;
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

/**
 * Parse CSV buffer (first row = headers).
 * @param {Buffer} buffer
 * @returns {Promise<{ rows: Array<Record<string, string>> }>}
 */
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
          headers = arr.map((h, i) => {
            const key = normalizeHeader(h);
            return IGNORE_COLUMNS.has(key) ? null : (key || `col_${i}`);
          });
          return;
        }
        const obj = {};
        let hasAny = false;
        headers.forEach((key, i) => {
          if (key == null) return;
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

/**
 * @param {Buffer} buffer
 * @param {string} mimeType - e.g. application/vnd.openxmlformats-officedocument.spreadsheetml.sheet or text/csv
 * @returns {Promise<{ rows: Array<Record<string, string>>, sheetWarning?: string }>}
 */
async function parseFile(buffer, mimeType) {
  const isCsv = mimeType === 'text/csv' || mimeType === 'application/csv' || mimeType === 'text/plain';
  if (isCsv) {
    return parseCsv(buffer);
  }
  return parseXlsx(buffer);
}

module.exports = {
  parseXlsx,
  parseCsv,
  parseFile,
  normalizeHeader,
  EXPECTED_HEADERS,
  IGNORE_COLUMNS,
};
