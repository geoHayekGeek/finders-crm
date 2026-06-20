const ExcelJS = require('exceljs');

function toNumber(value, fallback = 0) {
  const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatCurrencyValue(value) {
  return `$${toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDateValue(dateString) {
  if (!dateString) return '-';
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatRangeLabel(report) {
  const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
  const endDate = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  return `${formatter.format(startDate).replace(/[, ]/g, '-')}_to_${formatter.format(endDate).replace(/[, ]/g, '-')}`;
}

function sanitizeSheetName(name, fallback = 'Report') {
  const cleaned = String(name || fallback)
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 31) || fallback;
}

function uniqueSheetName(workbook, baseName) {
  let name = sanitizeSheetName(baseName);
  let counter = 2;
  while (workbook.worksheets.some(sheet => sheet.name === name)) {
    const suffix = ` ${counter}`;
    name = sanitizeSheetName(baseName.slice(0, 31 - suffix.length) + suffix);
    counter++;
  }
  return name;
}

function getDisplayName(report) {
  return report.agent_name || report.team_leader_name || 'Report';
}

function addSection(worksheet, currentRowRef, title, data, options = {}) {
  const { highlightLastRow = false, sectionWidth = 2 } = options;
  const { currentRow } = currentRowRef;

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
  currentRowRef.current++;

  data.forEach(([label, value], index) => {
    const isLastRow = index === data.length - 1;
    worksheet.getCell(`A${currentRowRef.current}`).value = label;
    worksheet.getCell(`B${currentRowRef.current}`).value = value;
    worksheet.getCell(`A${currentRowRef.current}`).font = { bold: true };

    if (highlightLastRow && isLastRow) {
      const yellowFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD966' }
      };
      worksheet.getCell(`A${currentRowRef.current}`).fill = yellowFill;
      worksheet.getCell(`B${currentRowRef.current}`).fill = yellowFill;
      worksheet.getCell(`A${currentRowRef.current}`).font = { bold: true, size: 12 };
      worksheet.getCell(`B${currentRowRef.current}`).font = { bold: true, size: 12 };
    }

    currentRowRef.current++;
  });

  currentRowRef.current++;
}

function populateReportWorksheet(worksheet, report, options = {}) {
  const {
    titlePrefix = 'Agent Report',
    includeTeamOverview = false
  } = options;

  worksheet.columns = [
    { width: 30 },
    { width: 20 }
  ];

  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${titlePrefix} - ${getDisplayName(report)}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:B2');
  const periodCell = worksheet.getCell('A2');
  const startDate = report.start_date ? new Date(report.start_date) : new Date(report.year, report.month - 1, 1);
  const endDate = report.end_date ? new Date(report.end_date) : new Date(report.year, report.month, 0);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  periodCell.value = `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  periodCell.font = { size: 12, italic: true };
  periodCell.alignment = { horizontal: 'center' };

  const currentRowRef = { current: 4 };

  if (includeTeamOverview) {
    const overviewData = [
      ['Team Leader', report.team_leader_name || 'Unknown'],
      ['Agents', Array.isArray(report.agent_reports) ? report.agent_reports.length : report.agent_count || 0]
    ];
    addSection(worksheet, currentRowRef, 'Team Overview', overviewData);
  }

  const performanceMetrics = [
    ['Listings', report.listings_count ?? 0],
    ['Viewings', report.viewings_count ?? 0]
  ];

  if (report.boosts !== undefined && report.boosts !== null) {
    performanceMetrics.push(['Boosts', formatCurrencyValue(report.boosts)]);
  }

  performanceMetrics.push(
    ['Sales Count', report.sales_count ?? 0],
    ['Sales Amount', formatCurrencyValue(report.sales_amount ?? 0)]
  );

  addSection(worksheet, currentRowRef, titlePrefix === 'Team Report' ? 'Team Performance Metrics' : 'Performance Metrics', performanceMetrics);

  if (report.lead_sources && typeof report.lead_sources === 'object' && Object.keys(report.lead_sources).length > 0) {
    const leadSourcesData = Object.entries(report.lead_sources).map(([source, count]) => [source, count]);
    addSection(worksheet, currentRowRef, 'Lead Sources', leadSourcesData);
  }

  if (report.agent_commission !== undefined || report.total_commission !== undefined) {
    const commissionsData = [];

    if (report.agent_commission !== undefined) {
      commissionsData.push(['Agent Commission', formatCurrencyValue(report.agent_commission)]);
    }
    if (report.finders_commission !== undefined) {
      commissionsData.push(['Finders Commission', formatCurrencyValue(report.finders_commission)]);
    }
    if (report.team_leader_commission !== undefined) {
      commissionsData.push(['Team Leader Commission', formatCurrencyValue(report.team_leader_commission)]);
    }
    if (report.administration_commission !== undefined) {
      commissionsData.push(['Administration Commission', formatCurrencyValue(report.administration_commission)]);
    }
    if (report.referrals_on_properties_commission !== undefined) {
      commissionsData.push(['Referrals On Properties', `${formatCurrencyValue(report.referrals_on_properties_commission || 0)} (${report.referrals_on_properties_count || 0})`]);
    }
    if (report.total_commission !== undefined) {
      commissionsData.push(['TOTAL COMMISSION', formatCurrencyValue(report.total_commission)]);
    }

    if (commissionsData.length > 0) {
      addSection(
        worksheet,
        currentRowRef,
        titlePrefix === 'Team Report' ? 'Team Commissions' : 'Commissions on Agent Properties',
        commissionsData,
        { highlightLastRow: true }
      );
    }
  }

  if (report.referral_received_count !== undefined || report.referral_received_commission !== undefined) {
    const referralData = [];
    if (report.referral_received_count !== undefined) {
      referralData.push(['Referrals Received Count', report.referral_received_count || 0]);
    }
    if (report.referral_received_commission !== undefined) {
      referralData.push(['Commission Received', formatCurrencyValue(report.referral_received_commission || 0)]);
    }

    if (referralData.length > 0) {
      const sectionTitle = report.referral_received_commission !== undefined
        ? (titlePrefix === 'Team Report' ? 'Team Referrals Given' : 'Commissions on Referrals Given By Agent')
        : 'Referrals Received';
      addSection(worksheet, currentRowRef, sectionTitle, referralData);
    }
  }
}

async function exportTeamReportToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Team Summary');
  populateReportWorksheet(summarySheet, report, {
    titlePrefix: 'Team Report',
    includeTeamOverview: true
  });

  const agentReports = Array.isArray(report.agent_reports) ? report.agent_reports : [];
  agentReports.forEach((agentReport, index) => {
    const sheetName = uniqueSheetName(
      workbook,
      agentReport.agent_name ? `Agent ${index + 1} - ${agentReport.agent_name}` : `Agent ${index + 1}`
    );
    const worksheet = workbook.addWorksheet(sheetName);
    populateReportWorksheet(worksheet, agentReport, {
      titlePrefix: 'Agent Report'
    });
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  exportTeamReportToExcel
};
