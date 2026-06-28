const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' }
};

const TOTAL_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF00' }
};

function parseIsoDateParts(dateValue) {
  if (!dateValue) return null;

  const [year, month, day] = String(dateValue).split('-').map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function formatDisplayDate(dateValue) {
  const parts = parseIsoDateParts(dateValue);
  if (!parts) return dateValue || '';

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function getAgentDisplayName(row = {}) {
  return row.agent_name || row.agent_code || 'Unknown';
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'unknown') {
    return 'Unknown month';
  }

  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function groupPropertiesByMonth(properties = []) {
  const sortedRows = [...properties].sort((left, right) => {
    const leftDate = left.closed_date || '';
    const rightDate = right.closed_date || '';

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    return (left.reference_number || '').localeCompare(right.reference_number || '');
  });

  const groups = [];

  sortedRows.forEach((row) => {
    const monthKey = row.closed_date ? row.closed_date.slice(0, 7) : 'unknown';
    const commission = Number(row.commission) || 0;
    const isSale = row.property_type === 'sale';
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.key !== monthKey) {
      groups.push({
        key: monthKey,
        label: formatMonthLabel(monthKey),
        rows: [],
        saleCount: 0,
        rentCount: 0,
        commissionTotal: 0
      });
    }

    const group = groups[groups.length - 1];
    group.rows.push(row);
    group.saleCount += isSale ? 1 : 0;
    group.rentCount += isSale ? 0 : 1;
    group.commissionTotal += commission;
  });

  return groups;
}

function writeCell(worksheet, rowNumber, columnNumber, value, style = {}) {
  const cell = worksheet.getCell(rowNumber, columnNumber);
  cell.value = value;

  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.border) cell.border = style.border;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.numFmt) cell.numFmt = style.numFmt;

  return cell;
}

/**
 * Export operations commission report to Excel
 */
async function exportOperationsCommissionToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Operations Commission');
  worksheet.columns = [
    { width: 14 },
    { width: 18 },
    { width: 24 },
    { width: 10 },
    { width: 10 },
    { width: 28 }
  ];

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = 'A1:F1';

  const headerRow = [
    'Date',
    'Reference',
    'Agent',
    'Sale',
    'Rent',
    'Total Commission Operation'
  ];

  headerRow.forEach((header, index) => {
    writeCell(worksheet, 1, index + 1, header, {
      font: { bold: true },
      fill: HEADER_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
  });

  let currentRow = 2;
  const groups = groupPropertiesByMonth(report.properties || []);

  if (groups.length === 0) {
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    writeCell(worksheet, currentRow, 1, 'TOTAL', {
      font: { bold: true },
      fill: TOTAL_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    writeCell(worksheet, currentRow, 4, 0, {
      font: { bold: true },
      fill: TOTAL_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    writeCell(worksheet, currentRow, 5, 0, {
      font: { bold: true },
      fill: TOTAL_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    writeCell(worksheet, currentRow, 6, formatCurrency(0), {
      font: { bold: true, color: { argb: 'FFFF0000' } },
      fill: TOTAL_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: 'right', vertical: 'middle' }
    });
  } else {
    groups.forEach((group) => {
      group.rows.forEach((row) => {
        writeCell(worksheet, currentRow, 1, formatDisplayDate(row.closed_date), {
          border: THIN_BORDER,
          alignment: { horizontal: 'center', vertical: 'middle' }
        });
        writeCell(worksheet, currentRow, 2, row.reference_number || 'No Ref', {
          border: THIN_BORDER,
          alignment: { horizontal: 'center', vertical: 'middle' }
        });
        writeCell(worksheet, currentRow, 3, getAgentDisplayName(row), {
          border: THIN_BORDER,
          alignment: { horizontal: 'center', vertical: 'middle' }
        });
        writeCell(worksheet, currentRow, 4, row.property_type === 'sale' ? 1 : '', {
          border: THIN_BORDER,
          alignment: { horizontal: 'center', vertical: 'middle' }
        });
        writeCell(worksheet, currentRow, 5, row.property_type === 'rent' ? 1 : '', {
          border: THIN_BORDER,
          alignment: { horizontal: 'center', vertical: 'middle' }
        });
        writeCell(worksheet, currentRow, 6, formatCurrency(row.commission), {
          border: THIN_BORDER,
          alignment: { horizontal: 'right', vertical: 'middle' }
        });

        currentRow += 1;
      });

      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      writeCell(worksheet, currentRow, 1, 'TOTAL', {
        font: { bold: true },
        fill: TOTAL_FILL,
        border: THIN_BORDER,
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      writeCell(worksheet, currentRow, 4, group.saleCount, {
        font: { bold: true },
        fill: TOTAL_FILL,
        border: THIN_BORDER,
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      writeCell(worksheet, currentRow, 5, group.rentCount, {
        font: { bold: true },
        fill: TOTAL_FILL,
        border: THIN_BORDER,
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      writeCell(worksheet, currentRow, 6, formatCurrency(group.commissionTotal), {
        font: { bold: true, color: { argb: 'FFFF0000' } },
        fill: TOTAL_FILL,
        border: THIN_BORDER,
        alignment: { horizontal: 'right', vertical: 'middle' }
      });

      currentRow += 1;
    });
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export operations commission report to PDF
 */
function exportOperationsCommissionToPDF(report) {
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
         .text('Total Operations Commission', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Oblique').fillColor('#666666')
         .text(`${formatter.format(startDate)} - ${formatter.format(endDate)} | Rate: ${report.commission_percentage}%`, { align: 'center' });
      doc.moveDown(1.5);
      doc.fillColor('#000000');

      // Helper function to add section with proper styling
      const addSection = (title, data, headerColor = '#2563EB', highlightLastRow = false) => {
        const startY = doc.y;
        const sectionWidth = 495;
        const headerHeight = 28;
        const leftMargin = 50;
        
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
        data.forEach(([label, value], index) => {
          const isLastRow = index === data.length - 1;
          const currentY = doc.y;
          const rowHeight = 20;
          
          // Highlight total commission row if requested
          if (highlightLastRow && isLastRow) {
            doc.rect(leftMargin, currentY - 3, sectionWidth, rowHeight)
               .fill('#FFF9C4'); // Light yellow highlight
          }
          
          // Label
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
             .text(label + ':', leftMargin + 10, currentY, { width: 280, continued: false });
          
          // Value
          doc.fontSize(11).font(isLastRow && highlightLastRow ? 'Helvetica-Bold' : 'Helvetica')
             .fillColor('#000000')
             .text(String(value), leftMargin + 290, currentY, { width: 195, align: 'right' });
          
          doc.moveDown(0.5);
        });

        doc.moveDown(0.6);
      };

      // Summary Section
      addSection('Summary', [
        ['Total Properties Closed', report.total_properties_count],
        ['Sales Count', report.total_sales_count],
        ['Rent Count', report.total_rent_count],
        ['Total Sales Value', `$${parseFloat(report.total_sales_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Rent Value', `$${parseFloat(report.total_rent_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['TOTAL COMMISSION', `$${parseFloat(report.total_commission_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ], '#2563EB', true);

      // Properties Detail Table
      if (report.properties && report.properties.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563EB')
           .text('Property Details', { align: 'left' });
        doc.moveDown(0.5);
        
        const leftMargin = 50;
        const colWidths = [100, 80, 120, 80, 115]; // Reference, Type, Price, Commission %, Commission Amount
        const rowHeight = 18;
        
        // Table header
        let yPos = doc.y;
        doc.rect(leftMargin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight)
           .fill('#E5E7EB');
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Reference', leftMargin + 5, yPos + 5, { width: colWidths[0] - 10 });
        doc.text('Type', leftMargin + colWidths[0] + 5, yPos + 5, { width: colWidths[1] - 10 });
        doc.text('Price', leftMargin + colWidths[0] + colWidths[1] + 5, yPos + 5, { width: colWidths[2] - 10 });
        doc.text('Com %', leftMargin + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPos + 5, { width: colWidths[3] - 10 });
        doc.text('Com Amount', leftMargin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, yPos + 5, { width: colWidths[4] - 10 });
        
        yPos += rowHeight;
        
        // Property rows
        doc.fontSize(9).font('Helvetica');
        report.properties.forEach((property, index) => {
          // Alternate row colors
          if (index % 2 === 0) {
            doc.rect(leftMargin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight)
               .fill('#F9FAFB');
          }
          
          doc.fillColor('#000000');
          doc.text(property.reference_number, leftMargin + 5, yPos + 4, { width: colWidths[0] - 10 });
          doc.text(property.property_type === 'sale' ? 'Sale' : 'Rent', leftMargin + colWidths[0] + 5, yPos + 4, { width: colWidths[1] - 10 });
          doc.text(`$${parseFloat(property.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, leftMargin + colWidths[0] + colWidths[1] + 5, yPos + 4, { width: colWidths[2] - 10, align: 'right' });
          doc.text(`${report.commission_percentage}%`, leftMargin + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPos + 4, { width: colWidths[3] - 10, align: 'center' });
          doc.text(`$${parseFloat(property.commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, leftMargin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, yPos + 4, { width: colWidths[4] - 10, align: 'right' });
          
          yPos += rowHeight;
          
          // New page if needed
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
        });
      }

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
  exportOperationsCommissionToExcel,
  exportOperationsCommissionToPDF
};

