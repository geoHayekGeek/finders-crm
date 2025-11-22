const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export operations daily report to Excel
 */
async function exportOperationsDailyToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Operations Daily Report');

  // Set column widths
  worksheet.columns = [
    { width: 30 },  // Field
    { width: 20 }   // Value
  ];

  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Operations Daily Report';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Report date and operations name
  worksheet.mergeCells('A2:B2');
  const periodCell = worksheet.getCell('A2');
  const reportDate = new Date(report.report_date);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  periodCell.value = `${report.operations_name} | ${formatter.format(reportDate)}`;
  periodCell.font = { size: 12, italic: true };
  periodCell.alignment = { horizontal: 'center' };

  let currentRow = 4;

  // Calculated Fields Section
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const calculatedHeaderCell = worksheet.getCell(`A${currentRow}`);
  calculatedHeaderCell.value = 'Calculated Fields';
  calculatedHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  calculatedHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  calculatedHeaderCell.alignment = { horizontal: 'center' };
  currentRow++;

  // Calculate effective leads responded to (subtract out of duty time)
  const effectiveLeadsResponded = Math.max(0, report.leads_responded_to - (report.leads_responded_out_of_duty_time || 0));

  const calculatedData = [
    ['Properties Added', report.properties_added],
    ['Leads Responded To', `${effectiveLeadsResponded} (${report.leads_responded_to} total, ${report.leads_responded_out_of_duty_time || 0} out of duty)`],
    ['Amending Previous Properties', report.amending_previous_properties]
  ];

  calculatedData.forEach(([label, value]) => {
    worksheet.getCell(`A${currentRow}`).value = label;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = value;
    currentRow++;
  });

  currentRow++; // Add spacing

  // Manual Fields Section
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const manualHeaderCell = worksheet.getCell(`A${currentRow}`);
  manualHeaderCell.value = 'Manual Fields';
  manualHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  manualHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }
  };
  manualHeaderCell.alignment = { horizontal: 'center' };
  currentRow++;

  const manualData = [
    ['Preparing Contract', report.preparing_contract || 0],
    ['Tasks Efficiency - Duty Time', report.tasks_efficiency_duty_time || 0],
    ['Tasks Efficiency - Uniform', report.tasks_efficiency_uniform || 0],
    ['Tasks Efficiency - After Duty Performance', report.tasks_efficiency_after_duty || 0],
    ['Leads Responded Out of Duty Time', report.leads_responded_out_of_duty_time || 0]
  ];

  manualData.forEach(([label, value]) => {
    worksheet.getCell(`A${currentRow}`).value = label;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = value;
    // Highlight negative values in red
    if (typeof value === 'number' && value < 0) {
      worksheet.getCell(`B${currentRow}`).font = { color: { argb: 'FFFF0000' } };
    }
    currentRow++;
  });

  // Return buffer
  return await workbook.xlsx.writeBuffer();
}

/**
 * Export operations daily report to PDF
 */
function exportOperationsDailyToPDF(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const reportDate = new Date(report.report_date);
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

      // Title Section
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#2563EB')
         .text('Operations Daily Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Oblique').fillColor('#666666')
         .text(`${report.operations_name} | ${formatter.format(reportDate)}`, { align: 'center' });
      doc.moveDown(1.5);
      doc.fillColor('#000000');

      // Helper function to add section with proper styling
      const addSection = (title, data, headerColor = '#2563EB') => {
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

      // Calculate effective leads responded to
      const effectiveLeadsResponded = Math.max(0, report.leads_responded_to - (report.leads_responded_out_of_duty_time || 0));

      // Calculated Fields Section
      addSection('Calculated Fields', [
        ['Properties Added', report.properties_added],
        ['Leads Responded To', `${effectiveLeadsResponded} (${report.leads_responded_to} total, ${report.leads_responded_out_of_duty_time || 0} out of duty)`],
        ['Amending Previous Properties', report.amending_previous_properties]
      ], '#2563EB');

      // Manual Fields Section
      addSection('Manual Fields', [
        ['Preparing Contract', report.preparing_contract || 0],
        ['Tasks Efficiency - Duty Time', report.tasks_efficiency_duty_time || 0],
        ['Tasks Efficiency - Uniform', report.tasks_efficiency_uniform || 0],
        ['Tasks Efficiency - After Duty Performance', report.tasks_efficiency_after_duty || 0],
        ['Leads Responded Out of Duty Time', report.leads_responded_out_of_duty_time || 0]
      ], '#059669');

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
  exportOperationsDailyToExcel,
  exportOperationsDailyToPDF
};

