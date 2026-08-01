const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const {
  DAILY_EXPORT_HEADERS,
  LEGACY_DAILY_FIELD_DEFINITIONS,
  WORKBOOK_DAILY_FIELD_DEFINITIONS,
  normalizeDailyIntegerValue
} = require('../models/operationsDailyReportModel');

const DAILY_COLUMN_WIDTHS = [
  9.4140625,
  17.484375,
  9.4140625,
  11.56640625,
  11.43359375,
  13,
  9.55078125,
  11.43359375,
  9.4140625,
  13.44921875,
  13,
  13,
  14.52734375,
  14.390625
];

const HEADER_BORDER = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'medium', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const DATA_BORDER = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' }
};

const DATA_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' }
};

function parseDateOnly(dateValue) {
  if (!dateValue) {
    return null;
  }

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const rawValue = String(dateValue).trim();
  if (!rawValue) {
    return null;
  }

  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatReportDate(dateValue, options) {
  const parsed = parseDateOnly(dateValue);
  if (!parsed) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC'
  }).format(parsed);
}

/**
 * Export operations daily report to Excel
 */
async function exportOperationsDailyToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const dailyRows = buildDailyExportRows(report);
  const firstReport = Array.isArray(report)
    ? report[0]
    : Array.isArray(report?.operations_rows) && report.operations_rows.length > 0
      ? report.operations_rows[0]
      : report;
  const sheetName = getDailySheetName(firstReport?.report_date);
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = DAILY_COLUMN_WIDTHS.map((width) => ({ width }));

  const headerStyle = {
    font: { name: 'Aptos Narrow', size: 11, bold: true },
    fill: HEADER_FILL,
    border: HEADER_BORDER,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
  };

  const dataStyle = {
    font: { name: 'Aptos Narrow', size: 11 },
    fill: DATA_FILL,
    border: DATA_BORDER,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    numFmt: '0'
  };

  worksheet.getRow(2).height = 30;
  worksheet.getRow(3).height = 42;
  dailyRows.forEach((row, index) => {
    worksheet.getRow(4 + index).height = 30;
  });

  writeWorkbookCell(worksheet, 2, 1, getDailyDayNumber(firstReport?.report_date), {
    font: { name: 'Aptos Narrow', size: 11, bold: true },
    border: DATA_BORDER,
    alignment: { horizontal: 'center', vertical: 'middle' },
    numFmt: '0'
  });

  writeWorkbookCell(worksheet, 3, 1, null, headerStyle);
  DAILY_EXPORT_HEADERS.forEach((header, index) => {
    writeWorkbookCell(worksheet, 3, index + 2, header, headerStyle);
  });

  dailyRows.forEach((row, index) => {
    const rowNumber = 4 + index;
    writeWorkbookCell(worksheet, rowNumber, 1, row.sequence, {
      font: { name: 'Aptos Narrow', size: 11, bold: true },
      fill: DATA_FILL,
      border: DATA_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle' },
      numFmt: '0'
    });

    writeWorkbookCell(worksheet, rowNumber, 2, row.values[0], {
      font: { name: 'Aptos Narrow', size: 11 },
      fill: DATA_FILL,
      border: DATA_BORDER,
      alignment: { horizontal: 'left', vertical: 'middle' }
    });

    row.values.slice(1).forEach((value, valueIndex) => {
      const cell = writeWorkbookCell(worksheet, rowNumber, valueIndex + 3, value, {
        font: { name: 'Aptos Narrow', size: 11 },
        fill: DATA_FILL,
        border: DATA_BORDER,
        alignment: { horizontal: 'center', vertical: 'middle' },
        numFmt: '0'
      });

      if (typeof value === 'number' && value < 0) {
        cell.font = { name: 'Aptos Narrow', size: 11, color: { argb: 'FFFF0000' } };
      }
    });
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export operations daily report to PDF
 */
function exportOperationsDailyToPDF(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER', layout: 'landscape' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const firstReport = Array.isArray(report)
        ? report[0]
        : Array.isArray(report?.operations_rows) && report.operations_rows.length > 0
          ? report.operations_rows[0]
          : report;
      const reportDateLabel = formatReportDate(firstReport?.report_date, { month: 'long', day: '2-digit', year: 'numeric' });
      const reportName = Array.isArray(report?.operations_rows) && report.operations_rows.length > 0
        ? report.operations_rows.map((row) => row.operations_name || 'Operations').join(' + ')
        : report.operations_name || 'Operations';

      // Title Section
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#2563EB')
         .text('Operations Daily Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica-Oblique').fillColor('#666666')
         .text(`${reportName} | ${reportDateLabel}`, { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#000000');

      // Helper function to add section with proper styling
      const addSection = (title, data, headerColor = '#2563EB') => {
        const startY = doc.y;
        const sectionWidth = doc.page.width - 80;
        const headerHeight = 28;
        const leftMargin = 40;
        
        // Draw header background
        doc.rect(leftMargin, startY, sectionWidth, headerHeight)
           .fill(headerColor);
        
        // Add header text
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
          
          // Value - highlight negative values in red
          const isNegative = typeof value === 'number' && value < 0;
          doc.fontSize(11).font('Helvetica')
             .fillColor(isNegative ? '#FF0000' : '#000000')
             .text(String(value), leftMargin + 290, currentY, { width: 195, align: 'right' });
          
          doc.moveDown(0.5);
        });

        doc.moveDown(0.6);
      };

      // Workbook-style daily fields
      addSection('Workbook Daily Fields', WORKBOOK_DAILY_FIELD_DEFINITIONS.map((field) => [
        field.label,
        normalizeDailyIntegerValue(firstReport?.[field.key], 0)
      ]), '#2563EB');

      // Legacy internal fields kept for compatibility
      addSection('Legacy Internal Fields', LEGACY_DAILY_FIELD_DEFINITIONS.map((field) => [
        field.label,
        normalizeDailyIntegerValue(firstReport?.[field.key], 0)
      ]), '#2563EB');

      // Footer
      const footerY = doc.page.height - 50;
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#999999')
         .text(`Generated on ${new Date().toLocaleString('en-US')}`, 50, footerY, { 
           align: 'center',
           width: doc.page.width - 100
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getDailySheetName(dateValue) {
  const parsed = parseDateOnly(dateValue);
  if (!parsed) {
    return 'Daily';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC'
  }).format(parsed).toUpperCase();
}

function getDailyDayNumber(dateValue) {
  const parsed = parseDateOnly(dateValue);
  if (!parsed) {
    return '';
  }

  return parsed.getUTCDate();
}

function buildDailyExportRows(reportOrReports) {
  const reports = Array.isArray(reportOrReports)
    ? reportOrReports.filter(Boolean)
    : Array.isArray(reportOrReports?.operations_rows) && reportOrReports.operations_rows.length > 0
      ? reportOrReports.operations_rows.filter(Boolean)
      : [reportOrReports].filter(Boolean);

  return reports.map((report, index) => ({
    sequence: index + 1,
    report,
    values: [
      report.operations_name || 'Operations',
      ...WORKBOOK_DAILY_FIELD_DEFINITIONS.map((field) => normalizeDailyIntegerValue(report[field.key], 0))
    ]
  }));
}

function writeWorkbookCell(worksheet, rowNumber, columnNumber, value, style = {}) {
  const cell = worksheet.getCell(rowNumber, columnNumber);
  cell.value = value;

  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.border) cell.border = style.border;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.numFmt) cell.numFmt = style.numFmt;

  return cell;
}

module.exports = {
  exportOperationsDailyToExcel,
  exportOperationsDailyToPDF
};

