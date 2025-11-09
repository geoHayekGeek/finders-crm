const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export DCSR report to Excel
 */
async function exportDCSRToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DCSR Report');

  // Set column widths
  worksheet.columns = [
    { width: 30 },
    { width: 20 }
  ];

  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DCSR Company Report';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Report period
  worksheet.mergeCells('A2:B2');
  const periodCell = worksheet.getCell('A2');
  const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
  const endDate = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  periodCell.value = `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  periodCell.font = { size: 12, italic: true };
  periodCell.alignment = { horizontal: 'center' };

  let currentRow = 4;

  // Helper function to add section
  const addSection = (title, data, headerColor = 'FF4472C4') => {
    // Section title
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const sectionCell = worksheet.getCell(`A${currentRow}`);
    sectionCell.value = title;
    sectionCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    sectionCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerColor }
    };
    sectionCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Section data
    data.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
    });

    currentRow++; // Add spacing
  };

  // Description (Listings & Leads)
  addSection('Description', [
    ['Listings', report.listings_count],
    ['Leads', report.leads_count]
  ], 'FF3B82F6'); // Blue

  // Closures (Sales & Rent)
  addSection('Closures', [
    ['Sales', report.sales_count],
    ['Rent', report.rent_count]
  ], 'FF22C55E'); // Green

  // Viewings
  addSection('Viewings', [
    ['Total Viewings', report.viewings_count]
  ], 'FFA855F7'); // Purple

  // Return buffer
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

