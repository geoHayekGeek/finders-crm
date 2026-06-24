const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const THIN_BORDER_COLOR = { argb: 'FF000000' };
const DEFAULT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const SUBTLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

function createBorder(styles = {}) {
  const top = styles.top || 'thin';
  const left = styles.left || 'thin';
  const bottom = styles.bottom || 'thin';
  const right = styles.right || 'thin';

  return {
    top: { style: top, color: THIN_BORDER_COLOR },
    left: { style: left, color: THIN_BORDER_COLOR },
    bottom: { style: bottom, color: THIN_BORDER_COLOR },
    right: { style: right, color: THIN_BORDER_COLOR }
  };
}

function applyCellStyle(cell, options = {}) {
  const {
    align = 'center',
    bold = false,
    fill = DEFAULT_FILL,
    fontColor = 'FF000000',
    fontSize = 11,
    italic = false,
    numFmt = null,
    border = createBorder()
  } = options;

  cell.font = {
    name: 'Calibri',
    size: fontSize,
    bold,
    italic,
    color: { argb: fontColor }
  };

  cell.alignment = {
    horizontal: align,
    vertical: 'middle',
    wrapText: true
  };

  cell.border = border;

  if (fill) {
    cell.fill = fill;
  }

  if (numFmt) {
    cell.numFmt = numFmt;
  }
}

function styleRange(worksheet, startRow, endRow, startCol, endCol, options = {}) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      applyCellStyle(worksheet.getCell(row, col), options);
    }
  }
}

function writeCell(worksheet, row, col, value, options = {}) {
  const cell = worksheet.getCell(row, col);
  cell.value = value;
  applyCellStyle(cell, options);
}

function normalizeCompanyBreakdownData(companyBreakdownData) {
  if (!companyBreakdownData) {
    return { groups: [], rows: [] };
  }

  if (Array.isArray(companyBreakdownData.team_breakdown)) {
    const groups = companyBreakdownData.team_breakdown;
    const rows = groups.flatMap((group) => (group.agent_breakdown || []).map((row) => ({
      ...row,
      team_leader_id: group.team_leader_id ?? row.team_leader_id ?? null,
      team_leader_name: group.team_leader_name || row.team_leader_name || 'Unassigned',
      team_leader_code: group.team_leader_code || row.team_leader_code || null
    })));

    if (rows.length > 0) {
      return { groups, rows };
    }
  }

  if (Array.isArray(companyBreakdownData.agent_breakdown)) {
    return {
      groups: [],
      rows: companyBreakdownData.agent_breakdown
    };
  }

  if (Array.isArray(companyBreakdownData)) {
    return {
      groups: [],
      rows: companyBreakdownData
    };
  }

  return { groups: [], rows: [] };
}

function normalizeOperationsData(operationsData) {
  if (!operationsData || !Array.isArray(operationsData.operations_breakdown)) {
    return {
      rows: [],
      totalLeads: 0
    };
  }

  return {
    rows: operationsData.operations_breakdown,
    totalLeads: operationsData.total_leads_count || 0
  };
}

function renderCompanyTable(worksheet, companyBreakdownData) {
  const normalized = normalizeCompanyBreakdownData(companyBreakdownData);
  const groups = normalized.groups.length > 0
    ? normalized.groups
    : [{
        team_leader_id: null,
        team_leader_name: null,
        team_leader_code: null,
        agent_breakdown: normalized.rows
      }];

  worksheet.mergeCells('A2:A3');
  worksheet.getCell('A2').value = '#';
  styleRange(worksheet, 2, 3, 1, 1, { bold: true, fontSize: 11 });

  worksheet.mergeCells('B2:B3');
  worksheet.getCell('B2').value = '';
  styleRange(worksheet, 2, 3, 2, 2, { fill: DEFAULT_FILL });

  worksheet.mergeCells('C2:D2');
  worksheet.getCell('C2').value = 'Description';
  styleRange(worksheet, 2, 2, 3, 4, { bold: true, fontSize: 11 });

  worksheet.mergeCells('E2:F2');
  worksheet.getCell('E2').value = 'Closure';
  styleRange(worksheet, 2, 2, 5, 6, { bold: true, fontSize: 11 });

  worksheet.mergeCells('G2:G3');
  worksheet.getCell('G2').value = 'Viewings';
  styleRange(worksheet, 2, 3, 7, 7, { bold: true, fontSize: 11 });

  writeCell(worksheet, 3, 3, 'Data', { bold: true, fontSize: 10 });
  writeCell(worksheet, 3, 4, 'Calls', { bold: true, fontSize: 10 });
  writeCell(worksheet, 3, 5, 'Sale', { bold: true, fontSize: 10 });
  writeCell(worksheet, 3, 6, 'Rent', { bold: true, fontSize: 10 });

  let currentRow = 4;
  let displayIndex = 1;

  groups.forEach((group, groupIndex) => {
    const agents = Array.isArray(group.agent_breakdown) ? group.agent_breakdown : [];

    agents.forEach((agent, agentIndex) => {
      const isGroupStart = groupIndex > 0 && agentIndex === 0;
      const isLeader = Boolean(group.team_leader_id) && agent.id === group.team_leader_id;
      const topBorder = isGroupStart ? 'medium' : 'thin';
      const rowBorder = createBorder({ top: topBorder });

      writeCell(worksheet, currentRow, 1, displayIndex, {
        bold: true,
        border: rowBorder
      });

      writeCell(worksheet, currentRow, 2, String(agent.name || '').toUpperCase(), {
        bold: isLeader,
        fill: isLeader ? SUBTLE_FILL : DEFAULT_FILL,
        border: rowBorder
      });

      writeCell(worksheet, currentRow, 3, agent.listings_count || 0, {
        border: rowBorder,
        numFmt: '#,##0'
      });

      writeCell(worksheet, currentRow, 4, agent.leads_count || 0, {
        border: rowBorder,
        numFmt: '#,##0'
      });

      writeCell(worksheet, currentRow, 5, agent.sales_count || 0, {
        border: rowBorder,
        numFmt: '#,##0'
      });

      writeCell(worksheet, currentRow, 6, agent.rent_count || 0, {
        border: rowBorder,
        numFmt: '#,##0'
      });

      writeCell(worksheet, currentRow, 7, agent.viewings_count || 0, {
        border: rowBorder,
        numFmt: '#,##0'
      });

      currentRow += 1;
      displayIndex += 1;
    });
  });

  const totalRow = currentRow;
  worksheet.mergeCells(`A${totalRow}:B${totalRow}`);
  styleRange(worksheet, totalRow, totalRow, 1, 2, { bold: true, fill: DEFAULT_FILL });
  worksheet.getCell(totalRow, 1).value = 'Total';

  const totals = normalized.rows.reduce((acc, row) => {
    acc.listings_count += row.listings_count || 0;
    acc.leads_count += row.leads_count || 0;
    acc.sales_count += row.sales_count || 0;
    acc.rent_count += row.rent_count || 0;
    acc.viewings_count += row.viewings_count || 0;
    return acc;
  }, {
    listings_count: 0,
    leads_count: 0,
    sales_count: 0,
    rent_count: 0,
    viewings_count: 0
  });

  writeCell(worksheet, totalRow, 3, totals.listings_count, { bold: true, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 4, totals.leads_count, { bold: true, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 5, totals.sales_count, { bold: true, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 6, totals.rent_count, { bold: true, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 7, totals.viewings_count, { bold: true, numFmt: '#,##0' });
}

function renderOperationsTable(worksheet, operationsData) {
  const normalized = normalizeOperationsData(operationsData);
  const visibleRows = Math.max(normalized.rows.length, 6);

  writeCell(worksheet, 2, 10, '#', { bold: true, fontSize: 11 });
  writeCell(worksheet, 2, 11, 'ADMIN', { bold: true, fontSize: 11 });
  writeCell(worksheet, 2, 12, 'CALLS', { bold: true, fontSize: 11 });

  for (let index = 0; index < visibleRows; index += 1) {
    const row = normalized.rows[index] || {
      name: '',
      leads_count: 0
    };

    const targetRow = 3 + index;

    writeCell(worksheet, targetRow, 10, index + 1, { numFmt: '0' });
    writeCell(worksheet, targetRow, 11, String(row.name || '').toUpperCase(), {});
    writeCell(worksheet, targetRow, 12, row.leads_count || 0, { numFmt: '#,##0' });
  }

  const totalRow = 3 + visibleRows;
  worksheet.mergeCells(`J${totalRow}:K${totalRow}`);
  styleRange(worksheet, totalRow, totalRow, 10, 11, { bold: true });
  worksheet.getCell(totalRow, 10).value = 'Total';
  writeCell(worksheet, totalRow, 12, normalized.totalLeads, { bold: true, numFmt: '#,##0' });
}

/**
 * Export DCSR report to Excel
 */
async function exportDCSRToExcel(report, companyBreakdownData = null, operationsData = null) {
  if (operationsData === null && companyBreakdownData && Array.isArray(companyBreakdownData.operations_breakdown)) {
    operationsData = companyBreakdownData;
    companyBreakdownData = null;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DCSR Report');

  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  worksheet.columns = [
    { width: 6 },
    { width: 28 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 11 },
    { width: 4 },
    { width: 4 },
    { width: 6 },
    { width: 28 },
    { width: 12 }
  ];

  renderCompanyTable(worksheet, companyBreakdownData);
  renderOperationsTable(worksheet, operationsData);

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export DCSR report to PDF
 */
function exportDCSRToPDF(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
      const endDate = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

      // Title Section
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#2563EB')
         .text('DCSR Company Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Oblique').fillColor('#666666')
         .text(`${formatter.format(startDate)} - ${formatter.format(endDate)}`, { align: 'center' });
      doc.moveDown(1.5);
      doc.fillColor('#000000');

      // Helper function to add section with proper styling
      const addSection = (title, data, headerColor = '#3B82F6') => {
        const startY = doc.y;
        const sectionWidth = 495;
        const headerHeight = 28;
        const leftMargin = 50;
        
        // Draw header background first
        doc.rect(leftMargin, startY, sectionWidth, headerHeight)
           .fill(headerColor);
        
        // Add header text on top of the background
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF')
           .text(title, leftMargin, startY + 6, { width: sectionWidth, align: 'center' });
        
        // Move to position after header
        doc.y = startY + headerHeight + 10;
        doc.fillColor('#000000');

        // Add data rows
        data.forEach(([label, value]) => {
          const currentY = doc.y;
          const rowHeight = 20;
          
          // Label
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
             .text(label + ':', leftMargin + 10, currentY, { width: 280, continued: false });
          
          // Value
          doc.fontSize(11).font('Helvetica')
             .fillColor('#000000')
             .text(String(value), leftMargin + 290, currentY, { width: 195, align: 'right' });
          
          doc.moveDown(0.5);
        });

        doc.moveDown(0.6);
      };

      // Description (Listings & Leads)
      addSection('Description', [
        ['Listings', report.listings_count],
        ['Leads', report.leads_count]
      ], '#3B82F6'); // Blue

      // Closures (Sales & Rent)
      addSection('Closures', [
        ['Sales', report.sales_count],
        ['Rent', report.rent_count]
      ], '#22C55E'); // Green

      // Viewings
      addSection('Viewings', [
        ['Total Viewings', report.viewings_count]
      ], '#A855F7'); // Purple

      // Footer
      const footerY = doc.page.height - 50;
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#999999')
         .text(`Generated on ${new Date().toLocaleString('en-US')}`, 50, footerY, { 
           align: 'center',
           width: 495
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  exportDCSRToExcel,
  exportDCSRToPDF
};
