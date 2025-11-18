const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export Sale & Rent Source rows to Excel
 * @param {Array} rows
 * @param {Object} meta
 * @param {string} meta.agentName
 * @param {string} meta.startDate
 * @param {string} meta.endDate
 * @returns {Promise<Buffer>}
 */
async function exportSaleRentSourceToExcel(rows, meta) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sale & Rent Source');

  worksheet.columns = [
    { header: 'Date', key: 'closed_date', width: 15 },
    { header: 'Agent Name', key: 'agent_name', width: 25 },
    { header: 'Ref#', key: 'reference_number', width: 15 },
    { header: 'Sold/Rented', key: 'sold_rented', width: 15 },
    { header: 'Source', key: 'source_name', width: 20 },
    { header: 'Find Com', key: 'finders_commission', width: 15 },
    { header: 'Client Name', key: 'client_name', width: 25 }
  ];

  // Title row
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Statistics of Sale and Rent Source - ${meta.agentName}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Period row
  worksheet.mergeCells('A2:G2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Period: ${meta.startDate} to ${meta.endDate}`;
  periodCell.font = { italic: true };
  periodCell.alignment = { horizontal: 'center' };

  // Header row
  const headerRow = worksheet.getRow(4);
  headerRow.values = worksheet.columns.map(col => col.header);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5F0FF' }
  };

  // Data rows
  let currentRowIdx = 5;
  rows.forEach(row => {
    const rowValues = {
      closed_date: row.closed_date,
      agent_name: row.agent_name,
      reference_number: row.reference_number,
      sold_rented: row.sold_rented,
      source_name: row.source_name,
      finders_commission: row.finders_commission,
      client_name: row.client_name
    };
    const excelRow = worksheet.getRow(currentRowIdx);
    excelRow.values = [
      rowValues.closed_date,
      rowValues.agent_name,
      rowValues.reference_number,
      rowValues.sold_rented,
      rowValues.source_name,
      rowValues.finders_commission,
      rowValues.client_name
    ];
    currentRowIdx++;
  });

  return workbook.xlsx.writeBuffer();
}

/**
 * Export Sale & Rent Source rows to PDF
 * @param {Array} rows
 * @param {Object} meta
 * @param {string} meta.agentName
 * @param {string} meta.startDate
 * @param {string} meta.endDate
 * @returns {Promise<Buffer>}
 */
function exportSaleRentSourceToPDF(rows, meta) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Statistics of Sale and Rent Source', {
        align: 'center'
      });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text(meta.agentName, { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(11).font('Helvetica-Oblique').text(`Period: ${meta.startDate} to ${meta.endDate}`, {
        align: 'center'
      });
      doc.moveDown(1);

      // Table headers
      const startX = 40;
      let y = doc.y;
      const colWidths = [70, 100, 60, 70, 80, 70, 100];

      const drawRow = (cells, isHeader = false) => {
        let x = startX;
        cells.forEach((text, index) => {
          const width = colWidths[index];
          if (isHeader) {
            doc.rect(x, y - 3, width, 18).fill('#E5F0FF');
            doc.fillColor('#000000');
          }
          doc.fontSize(9).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
          doc.fillColor('#000000').text(String(text), x + 2, y, {
            width: width - 4,
            ellipsis: true
          });
          x += width;
        });
        y += 18;
      };

      drawRow(['Date', 'Agent', 'Ref#', 'Sold/Rented', 'Source', 'Find Com', 'Client'], true);

      // Rows
      rows.forEach(row => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 60;
          drawRow(['Date', 'Agent', 'Ref#', 'Sold/Rented', 'Source', 'Find Com', 'Client'], true);
        }
        drawRow([
          row.closed_date,
          row.agent_name,
          row.reference_number,
          row.sold_rented,
          row.source_name,
          row.finders_commission,
          row.client_name
        ]);
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


