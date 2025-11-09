const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export operations commission report to Excel
 */
async function exportOperationsCommissionToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Operations Commission');

  // Set column widths
  worksheet.columns = [
    { width: 20 },  // Reference
    { width: 15 },  // Type
    { width: 20 },  // Price
    { width: 15 },  // Commission %
    { width: 20 }   // Commission Amount
  ];

  // Title
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Total Operations Commission Report';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Report period and commission rate
  worksheet.mergeCells('A2:E2');
  const periodCell = worksheet.getCell('A2');
  const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
  const endDate = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  periodCell.value = `${formatter.format(startDate)} - ${formatter.format(endDate)} | Commission Rate: ${report.commission_percentage}%`;
  periodCell.font = { size: 12, italic: true };
  periodCell.alignment = { horizontal: 'center' };

  let currentRow = 4;

  // Summary Section
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const summaryHeaderCell = worksheet.getCell(`A${currentRow}`);
  summaryHeaderCell.value = 'Summary';
  summaryHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  summaryHeaderCell.alignment = { horizontal: 'center' };
  currentRow++;

  // Summary data
  const summaryData = [
    ['Total Properties Closed', report.total_properties_count],
    ['Sales Count', report.total_sales_count],
    ['Rent Count', report.total_rent_count],
    ['Total Sales Value', `$${parseFloat(report.total_sales_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Total Rent Value', `$${parseFloat(report.total_rent_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['TOTAL COMMISSION', `$${parseFloat(report.total_commission_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
  ];

  summaryData.forEach(([label, value], index) => {
    const isLastRow = index === summaryData.length - 1;
    worksheet.getCell(`A${currentRow}`).value = label;
    worksheet.getCell(`B${currentRow}`).value = '';
    worksheet.mergeCells(`C${currentRow}:E${currentRow}`);
    worksheet.getCell(`C${currentRow}`).value = value;
    
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
    
    // Highlight total commission row
    if (isLastRow) {
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      worksheet.getCell(`C${currentRow}`).font = { bold: true, size: 12 };
      const yellowFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD966' }
      };
      worksheet.getCell(`A${currentRow}`).fill = yellowFill;
      worksheet.getCell(`C${currentRow}`).fill = yellowFill;
    }
    
    currentRow++;
  });

  currentRow++; // Add spacing

  // Properties Detail Section
  if (report.properties && report.properties.length > 0) {
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const detailsHeaderCell = worksheet.getCell(`A${currentRow}`);
    detailsHeaderCell.value = 'Property Details';
    detailsHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    detailsHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    detailsHeaderCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Table header
    const headers = ['Reference', 'Type', 'Price', 'Commission %', 'Commission Amount'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
    });
    currentRow++;

    // Property rows
    report.properties.forEach((property) => {
      worksheet.getCell(`A${currentRow}`).value = property.reference_number;
      worksheet.getCell(`B${currentRow}`).value = property.property_type === 'sale' ? 'Sale' : 'Rent';
      worksheet.getCell(`C${currentRow}`).value = `$${parseFloat(property.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      worksheet.getCell(`D${currentRow}`).value = `${report.commission_percentage}%`;
      worksheet.getCell(`E${currentRow}`).value = `$${parseFloat(property.commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
      worksheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'right' };
      
      currentRow++;
    });
  }

  // Return buffer
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

