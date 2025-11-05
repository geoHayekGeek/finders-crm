const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export report to Excel
 */
async function exportToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Agent Report');

  // Set column widths
  worksheet.columns = [
    { width: 30 },
    { width: 20 }
  ];

  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Monthly Agent Report - ${report.agent_name}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Report period
  worksheet.mergeCells('A2:B2');
  const periodCell = worksheet.getCell('A2');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  periodCell.value = `${monthNames[report.month - 1]} ${report.year}`;
  periodCell.font = { size: 12, italic: true };
  periodCell.alignment = { horizontal: 'center' };

  let currentRow = 4;

  // Helper function to add section
  const addSection = (title, data, highlightLastRow = false) => {
    // Section title
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const sectionCell = worksheet.getCell(`A${currentRow}`);
    sectionCell.value = title;
    sectionCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    sectionCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sectionCell.alignment = { horizontal: 'center' };
    currentRow++;

    // Section data
    data.forEach(([label, value], index) => {
      const isLastRow = index === data.length - 1;
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      
      // Highlight last row if requested
      if (highlightLastRow && isLastRow) {
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 12 };
        const yellowFill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD966' } // Yellow color
        };
        worksheet.getCell(`A${currentRow}`).fill = yellowFill;
        worksheet.getCell(`B${currentRow}`).fill = yellowFill;
      }
      
      currentRow++;
    });

    currentRow++; // Add spacing
  };

  // Performance Metrics
  addSection('Performance Metrics', [
    ['Listings', report.listings_count],
    ['Viewings', report.viewings_count],
    ['Boosts', report.boosts],
    ['Sales Count', report.sales_count],
    ['Sales Amount', `$${parseFloat(report.sales_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
  ]);

  // Lead Sources
  if (report.lead_sources && Object.keys(report.lead_sources).length > 0) {
    const leadSourcesData = Object.entries(report.lead_sources).map(([source, count]) => [source, count]);
    addSection('Lead Sources', leadSourcesData);
  }

  // Commissions on Agent Properties - highlight TOTAL COMMISSION row
  addSection('Commissions on Agent Properties', [
    ['Agent Commission', `$${parseFloat(report.agent_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Finders Commission', `$${parseFloat(report.finders_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Referral Commission', `$${parseFloat(report.referral_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Team Leader Commission', `$${parseFloat(report.team_leader_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Administration Commission', `$${parseFloat(report.administration_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Referrals On Properties', `$${parseFloat(report.referrals_on_properties_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${report.referrals_on_properties_count || 0})`],
    ['TOTAL COMMISSION', `$${parseFloat(report.total_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
  ], true); // true = highlight the last row (TOTAL COMMISSION)

  // Commissions on Referrals Given By Agent
  addSection('Commissions on Referrals Given By Agent', [
    ['Referrals Count', report.referral_received_count || 0],
    ['Commission Received', `$${parseFloat(report.referral_received_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
  ]);

  // Return buffer
  return await workbook.xlsx.writeBuffer();
}

/**
 * Export report to PDF
 */
function exportToPDF(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

      // Title Section
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#000000')
         .text('Monthly Agent Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(18).font('Helvetica').text(report.agent_name, { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(14).font('Helvetica-Oblique').fillColor('#666666')
         .text(`${monthNames[report.month - 1]} ${report.year}`, { align: 'center' });
      doc.moveDown(1.5);
      doc.fillColor('#000000');

      // Helper function to add section with proper styling
      const addSection = (title, data, headerColor = '#4472C4', highlightLastRow = false) => {
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
        data.forEach(([label, value], index) => {
          const isLastRow = index === data.length - 1;
          const currentY = doc.y;
          const rowHeight = 20;
          
          // Highlight total commission row if requested (draw before text)
          if (highlightLastRow && isLastRow) {
            doc.rect(leftMargin, currentY - 3, sectionWidth, rowHeight)
               .fill('#FFF9C4'); // Light yellow highlight
          }
          
          // Label
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
             .text(label + ':', leftMargin + 10, currentY, { width: 280, continued: false });
          
          // Value - make it bold if it's the highlighted row
          doc.fontSize(11).font(isLastRow && highlightLastRow ? 'Helvetica-Bold' : 'Helvetica')
             .fillColor('#000000')
             .text(String(value), leftMargin + 290, currentY, { width: 195, align: 'right' });
          
          doc.moveDown(0.5);
        });

        doc.moveDown(0.6);
      };

      // Performance Metrics
      addSection('Performance Metrics', [
        ['Listings', report.listings_count],
        ['Viewings', report.viewings_count],
        ['Boosts', report.boosts],
        ['Sales Count', report.sales_count],
        ['Sales Amount', `$${parseFloat(report.sales_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ]);

      // Lead Sources
      if (report.lead_sources && Object.keys(report.lead_sources).length > 0) {
        const leadSourcesData = Object.entries(report.lead_sources)
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .map(([source, count]) => [source, count]);
        addSection('Lead Sources', leadSourcesData);
      }

      // Commissions on Agent Properties - highlight TOTAL COMMISSION
      addSection('Commissions on Agent Properties', [
        ['Agent Commission', `$${parseFloat(report.agent_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Finders Commission', `$${parseFloat(report.finders_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Referral Commission', `$${parseFloat(report.referral_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Team Leader Commission', `$${parseFloat(report.team_leader_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Administration Commission', `$${parseFloat(report.administration_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Referrals On Properties', `$${parseFloat(report.referrals_on_properties_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${report.referrals_on_properties_count || 0})`],
        ['TOTAL COMMISSION', `$${parseFloat(report.total_commission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ], '#4472C4', true); // Highlight the last row (TOTAL COMMISSION)

      // Commissions on Referrals Given By Agent
      addSection('Commissions on Referrals Given By Agent', [
        ['Referrals Count', report.referral_received_count || 0],
        ['Commission Received', `$${parseFloat(report.referral_received_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ], '#10B981');

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
  exportToExcel,
  exportToPDF
};



