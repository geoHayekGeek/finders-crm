const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const TEAM_ACCENTS = [
  { fill: 'DDEBFF', font: '1D4ED8' },
  { fill: 'E5F6E8', font: '166534' },
  { fill: 'F1E7FF', font: '6D28D9' },
  { fill: 'FFF1DE', font: 'B45309' },
  { fill: 'FFE4EC', font: 'BE123C' },
  { fill: 'DDF7F5', font: '0F766E' },
  { fill: 'FFF5C4', font: 'A16207' },
  { fill: 'E8EEF8', font: '334155' }
];

const MAIN_HEADER = ['Date', 'Agent name', 'Ref#', 'Sold/Rented', 'Source', 'Owner Name', 'Phone Number', 'Find Com'];
const DATA_COLUMN_WIDTHS = [
  12,
  20,
  13,
  14,
  18,
  36,
  18,
  13,
  48,
  12,
  12,
  12,
  12
];

function roundMoney(value) {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function normalizeDateValue(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return new Date(Date.UTC(
      dateValue.getUTCFullYear(),
      dateValue.getUTCMonth(),
      dateValue.getUTCDate()
    ));
  }

  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue.length === 10 ? `${dateValue}T00:00:00Z` : dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate()
      ));
    }
  }

  return null;
}

function formatDisplayDate(dateValue) {
  const normalized = normalizeDateValue(dateValue);
  if (!normalized) {
    return normalizeText(dateValue, '-') || '-';
  }

  const day = String(normalized.getUTCDate()).padStart(2, '0');
  const month = normalized.toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC'
  });
  const year = String(normalized.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(roundMoney(amount));
}

function normalizeText(value, fallback = '') {
  const text = value === null || value === undefined ? fallback : String(value);
  return text.trim();
}

function hashString(value) {
  const text = normalizeText(value, 'unassigned').toLowerCase();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getTeamAccent(teamKey) {
  if (!teamKey || String(teamKey).trim() === '') {
    return TEAM_ACCENTS[TEAM_ACCENTS.length - 1];
  }

  const index = hashString(teamKey) % TEAM_ACCENTS.length;
  return TEAM_ACCENTS[index];
}

function normalizeRoleLabel(role) {
  return role ? String(role).toLowerCase().replace(/_/g, ' ').trim() : '';
}

function sortRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const teamA = normalizeText(a.team_leader_name, 'Unassigned');
    const teamB = normalizeText(b.team_leader_name, 'Unassigned');
    if (teamA !== teamB) return teamA.localeCompare(teamB, undefined, { sensitivity: 'base' });

    const agentA = normalizeText(a.agent_name, 'Unknown');
    const agentB = normalizeText(b.agent_name, 'Unknown');
    if (agentA !== agentB) return agentA.localeCompare(agentB, undefined, { sensitivity: 'base' });

    const dateA = normalizeDateValue(a.closed_date)?.getTime() ?? 0;
    const dateB = normalizeDateValue(b.closed_date)?.getTime() ?? 0;
    if (dateA !== dateB) return dateA - dateB;

    return normalizeText(a.reference_number, '').localeCompare(
      normalizeText(b.reference_number, ''),
      undefined,
      { sensitivity: 'base' }
    );
  });
}

function applyBorder(cell, isHeader = false) {
  cell.border = {
    top: { style: isHeader ? 'medium' : 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: isHeader ? 'medium' : 'thin', color: { argb: 'FF000000' } }
  };
}

function applyHeaderStyle(cell, columnIndex, columnCount, options = {}) {
  const { fontColor = 'FF000000' } = options;
  const isFirst = columnIndex === 1;
  const isLast = columnIndex === columnCount;

  cell.font = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: fontColor }
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'medium', color: { argb: 'FF000000' } },
    left: { style: isFirst ? 'medium' : 'thin', color: { argb: 'FF000000' } },
    right: { style: isLast ? 'medium' : 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'medium', color: { argb: 'FF000000' } }
  };
}

function applyDataCellStyle(cell, options = {}) {
  const {
    horizontal = 'center',
    bold = false,
    fill,
    fontColor = 'FF000000',
    numFmt,
    wrapText = false
  } = options;

  cell.font = {
    name: 'Calibri',
    size: 11,
    bold,
    color: { argb: fontColor }
  };
  cell.alignment = {
    horizontal,
    vertical: 'middle',
    wrapText
  };
  if (fill) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fill }
    };
  }
  if (numFmt) {
    cell.numFmt = numFmt;
  }
  applyBorder(cell);
}

function applyNoteCellStyle(cell) {
  cell.font = {
    name: 'Calibri',
    size: 11,
    bold: false,
    color: { argb: 'FF000000' }
  };
  cell.alignment = {
    horizontal: 'left',
    vertical: 'middle',
    wrapText: false
  };
}

function buildMainRow(row) {
  return [
    normalizeDateValue(row.closed_date),
    normalizeText(row.agent_name, 'Unknown'),
    normalizeText(row.reference_number, 'No Ref'),
    normalizeText(row.sold_rented, ''),
    normalizeText(row.source_name, 'None'),
    normalizeText(row.owner_name, ''),
    normalizeText(row.phone_number, ''),
    roundMoney(row.finders_commission)
  ];
}

async function exportSaleRentSourceToExcel(rows, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finders CRM';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Sale & Rent Source');
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.properties.defaultRowHeight = 19.95;
  worksheet.columns = DATA_COLUMN_WIDTHS.map((width, index) => ({
    key: `col_${index + 1}`,
    width
  }));
  worksheet.autoFilter = `A1:H${Math.max((rows || []).length + 1, 1)}`;

  const headerRow = worksheet.addRow(MAIN_HEADER);
  headerRow.height = 19.95;
  headerRow.eachCell((cell, columnIndex) => {
    applyHeaderStyle(cell, columnIndex, MAIN_HEADER.length, {
      fontColor: columnIndex === 8 ? 'FFFF0000' : 'FF000000'
    });
  });

  const sortedRows = sortRows(rows);

  sortedRows.forEach((row) => {
    const excelRow = worksheet.addRow(buildMainRow(row));
    excelRow.height = 19.95;

    const teamKey = row.team_leader_id || row.team_leader_name || 'Unassigned';
    const accent = getTeamAccent(teamKey);
    const isLeader = normalizeRoleLabel(row.agent_role) === 'team leader'
      || (row.team_leader_id !== null && row.agent_id !== null && Number(row.team_leader_id) === Number(row.agent_id));

    for (let col = 1; col <= 8; col += 1) {
      const cell = excelRow.getCell(col);
      const styleOptions = {
        horizontal: 'center',
        bold: false
      };

      if (col === 1) {
        styleOptions.numFmt = 'd-mmm-yy';
      } else if (col === 2) {
        styleOptions.fill = accent.fill;
        styleOptions.bold = isLeader;
        styleOptions.fontColor = accent.font;
      } else if (col === 8) {
        styleOptions.numFmt = '$#,##0.00';
        styleOptions.fontColor = 'FFFF0000';
      }

      applyDataCellStyle(cell, styleOptions);
    }

    const note = normalizeText(row.notes, '');
    if (note) {
      const noteCell = worksheet.getCell(`I${excelRow.number}`);
      noteCell.value = note;
      applyNoteCellStyle(noteCell);
    }
  });

  return workbook.xlsx.writeBuffer();
}

function drawRow(doc, y, cells, widths, isHeader = false) {
  let x = 40;
  cells.forEach((text, index) => {
    const width = widths[index];
    if (isHeader) {
      doc.rect(x, y - 2, width, 18).stroke('#000000');
    }
    doc.fontSize(8.5).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
    doc.fillColor('#000000').text(String(text), x + 2, y, {
      width: width - 4,
      align: 'center',
      ellipsis: true
    });
    x += width;
  });
}

function exportSaleRentSourceToPDF(rows, meta = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('Statistics of Sale and Rent Source', {
        align: 'center'
      });
      doc.moveDown(0.25);
      if (meta.startDate && meta.endDate) {
        doc.fontSize(11).font('Helvetica-Oblique').text(`Period: ${meta.startDate} to ${meta.endDate}`, {
          align: 'center'
        });
        doc.moveDown(0.75);
      } else {
        doc.moveDown(0.75);
      }

      const widths = [55, 72, 55, 60, 60, 94, 74, 45];
      const header = ['Date', 'Agent', 'Ref#', 'Sold/Rented', 'Source', 'Owner Name', 'Phone', 'Find Com'];
      let y = doc.y;

      drawRow(doc, y, header, widths, true);
      y += 18;

      const sortedRows = sortRows(rows);
      sortedRows.forEach((row) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 60;
          drawRow(doc, y, header, widths, true);
          y += 18;
        }

        drawRow(doc, y, [
          formatDisplayDate(row.closed_date),
          normalizeText(row.agent_name, 'Unknown'),
          normalizeText(row.reference_number, 'No Ref'),
          normalizeText(row.sold_rented, ''),
          normalizeText(row.source_name, 'None'),
          normalizeText(row.owner_name, ''),
          normalizeText(row.phone_number, ''),
          formatCurrency(row.finders_commission)
        ], widths);
        y += 18;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  exportSaleRentSourceToExcel,
  exportSaleRentSourceToPDF
};
