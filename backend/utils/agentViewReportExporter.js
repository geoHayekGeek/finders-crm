const ExcelJS = require('exceljs');

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF3F4F6' }
};

const TITLE_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' }
};

const TOTAL_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' }
};

const WHITE_FONT = { argb: 'FFFFFFFF' };
const BLACK_FONT = { argb: 'FF111827' };
const BORDER_COLOR = { argb: 'FF111827' };

const MONTH_SHEET_WIDTHS = [
  10.5546875,
  7.44140625,
  10.21875,
  9.5546875,
  11.44140625,
  10.109375,
  11.44140625,
  8.88671875,
  8,
  10.88671875,
  10.21875,
  9.33203125,
  15.77734375,
  8.88671875,
  8.88671875,
  8.33203125,
  8.5546875,
  7.88671875,
  9.5546875,
  12.5546875,
  8.88671875
];

const SUMMARY_SHEET_WIDTHS = [
  8.88671875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  15.77734375,
  10.21875,
  12.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  10.5546875,
  12.5546875,
  12.5546875,
  8.88671875
];

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
  return Math.round(toNumber(value, fallback) * 100) / 100;
}

function toDateObject(dateValue) {
  if (!dateValue) {
    return null;
  }

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(dateValue) {
  const date = toDateObject(dateValue);
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function createBorder(style = 'thin') {
  return {
    top: { style, color: BORDER_COLOR },
    left: { style, color: BORDER_COLOR },
    bottom: { style, color: BORDER_COLOR },
    right: { style, color: BORDER_COLOR }
  };
}

function writeCell(worksheet, row, col, value, options = {}) {
  const cell = worksheet.getCell(row, col);
  cell.value = value;

  cell.font = {
    name: 'Calibri',
    size: options.fontSize || 11,
    bold: Boolean(options.bold),
    color: { argb: options.fontColor || BLACK_FONT.argb }
  };

  cell.alignment = {
    horizontal: options.align || 'center',
    vertical: 'middle',
    wrapText: true
  };

  cell.border = options.border || createBorder();

  if (options.fill) {
    cell.fill = options.fill;
  }

  if (options.numFmt) {
    cell.numFmt = options.numFmt;
  }

  return cell;
}

function mergeAndWrite(worksheet, range, value, options = {}) {
  worksheet.mergeCells(range);
  const [startCell] = range.split(':');
  return writeCell(worksheet, worksheet.getCell(startCell).row, worksheet.getCell(startCell).col, value, options);
}

function formatPercentValue(value) {
  return toNumber(value, 0);
}

function safeDivide(numerator, denominator) {
  const left = toNumber(numerator, 0);
  const right = toNumber(denominator, 0);
  if (right === 0) {
    return 0;
  }

  return left / right;
}

function getMonthRows(sheetSnapshot) {
  const rows = sheetSnapshot.rows || [];
  return rows.map((row) => ({
    date: row.date ? toDateObject(row.date) : null,
    listings: toNumber(row.listings, 0),
    olx_leads: toNumber(row.olx_leads, 0),
    fb_leads: toNumber(row.fb_leads, 0),
    insta_leads: toNumber(row.insta_leads, 0),
    unknown_leads: toNumber(row.unknown_leads, 0),
    website_leads: toNumber(row.website_leads, 0),
    viewing: toNumber(row.viewing, 0),
    dev: toNumber(row.dev, 0),
    new_join: toNumber(row.new_join, 0),
    reviews: toNumber(row.reviews, 0),
    sales: toNumber(row.sales, 0),
    sales_amount: toMoney(row.sales_amount, 0),
    age_com: toMoney(row.age_com, 0),
    fin_com: toMoney(row.fin_com, 0),
    ref_com: toMoney(row.ref_com, 0),
    tl_com: toMoney(row.tl_com, 0),
    adm_com: toMoney(row.adm_com, 0),
    ref_received: toMoney(row.ref_received, 0),
    total_commission: toMoney(row.total_commission, 0)
  }));
}

function sumMonthRows(monthRows) {
  return monthRows.reduce((totals, row) => {
    totals.listings += row.listings;
    totals.olx_leads += row.olx_leads;
    totals.fb_leads += row.fb_leads;
    totals.insta_leads += row.insta_leads;
    totals.unknown_leads += row.unknown_leads;
    totals.website_leads += row.website_leads;
    totals.viewing += row.viewing;
    totals.dev += row.dev;
    totals.new_join += row.new_join;
    totals.reviews += row.reviews;
    totals.sales += row.sales;
    totals.sales_amount += row.sales_amount;
    totals.age_com += row.age_com;
    totals.fin_com += row.fin_com;
    totals.ref_com += row.ref_com;
    totals.tl_com += row.tl_com;
    totals.adm_com += row.adm_com;
    totals.ref_received += row.ref_received;
    totals.total_commission += row.total_commission;
    return totals;
  }, {
    listings: 0,
    olx_leads: 0,
    fb_leads: 0,
    insta_leads: 0,
    unknown_leads: 0,
    website_leads: 0,
    viewing: 0,
    dev: 0,
    new_join: 0,
    reviews: 0,
    sales: 0,
    sales_amount: 0,
    age_com: 0,
    fin_com: 0,
    ref_com: 0,
    tl_com: 0,
    adm_com: 0,
    ref_received: 0,
    total_commission: 0
  });
}

function buildMonthRowsForSheet(snapshot) {
  const rows = getMonthRows(snapshot);
  const monthStart = toDateObject(snapshot.start_date);
  const monthDays = monthStart
    ? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate()
    : 31;

  return Array.from({ length: 31 }, (_, index) => {
    const dayNumber = index + 1;
    if (dayNumber > monthDays) {
      return {
        dayNumber,
        date: null,
        listings: 0,
        olx_leads: 0,
        fb_leads: 0,
        insta_leads: 0,
        unknown_leads: 0,
        website_leads: 0,
        viewing: 0,
        dev: 0,
        new_join: 0,
        reviews: 0,
        sales: 0,
        sales_amount: 0,
        age_com: 0,
        fin_com: 0,
        ref_com: 0,
        tl_com: 0,
        adm_com: 0,
        ref_received: 0,
        total_commission: 0
      };
    }

    const row = rows[index] || {};
    return {
      dayNumber,
      date: row.date || (monthStart ? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), dayNumber, 0, 0, 0, 0)) : null),
      listings: toNumber(row.listings, 0),
      olx_leads: toNumber(row.olx_leads, 0),
      fb_leads: toNumber(row.fb_leads, 0),
      insta_leads: toNumber(row.insta_leads, 0),
      unknown_leads: toNumber(row.unknown_leads, 0),
      website_leads: toNumber(row.website_leads, 0),
      viewing: toNumber(row.viewing, 0),
      dev: toNumber(row.dev, 0),
      new_join: toNumber(row.new_join, 0),
      reviews: toNumber(row.reviews, 0),
      sales: toNumber(row.sales, 0),
      sales_amount: toMoney(row.sales_amount, 0),
      age_com: toMoney(row.age_com, 0),
      fin_com: toMoney(row.fin_com, 0),
      ref_com: toMoney(row.ref_com, 0),
      tl_com: toMoney(row.tl_com, 0),
      adm_com: toMoney(row.adm_com, 0),
      ref_received: toMoney(row.ref_received, 0),
      total_commission: toMoney(row.total_commission, 0)
    };
  });
}

function renderMonthlySheet(workbook, snapshot) {
  const worksheet = workbook.addWorksheet(snapshot.sheet_name);
  worksheet.columns = MONTH_SHEET_WIDTHS.map((width) => ({ width }));
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  worksheet.getRow(1).height = 8;
  worksheet.getRow(2).height = 24;

  const headers = [
    null,
    'LISTING',
    'OLX LEADS',
    'FB LEADS',
    'INSTA LEADS',
    'Unknown ',
    'Website ',
    'VIEWING',
    'DEV',
    'NEW JOIN',
    'REVIEWS',
    'SALES',
    'SALES AMMOUNT',
    'TOT COM',
    'AGE COM',
    'FIN COM',
    'REF COM',
    'T L COM',
    'ADM COM',
    'REF RECEIVED',
    null
  ];

  worksheet.mergeCells('A1:U1');
  writeCell(worksheet, 1, 1, '', {
    fill: TITLE_FILL,
    border: createBorder('thin')
  });

  headers.forEach((header, index) => {
    writeCell(worksheet, 2, index + 1, header, {
      bold: true,
      fill: HEADER_FILL,
      border: createBorder('thin'),
      fontColor: BLACK_FONT.argb
    });
  });

  const rows = buildMonthRowsForSheet(snapshot);
  rows.forEach((row, index) => {
    const rowNumber = 3 + index;
    worksheet.getRow(rowNumber).height = 22;

    writeCell(worksheet, rowNumber, 1, row.date ? row.date : null, {
      align: 'center',
      numFmt: 'dd/mm/yyyy'
    });
    writeCell(worksheet, rowNumber, 2, row.listings, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 3, row.olx_leads, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 4, row.fb_leads, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 5, row.insta_leads, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 6, row.unknown_leads, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 7, row.website_leads, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 8, row.viewing, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 9, row.dev, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 10, row.new_join, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 11, row.reviews, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 12, row.sales, { numFmt: '#,##0' });
    writeCell(worksheet, rowNumber, 13, row.sales_amount, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 14, row.age_com, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 15, row.fin_com, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 16, row.ref_com, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 17, row.tl_com, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 18, row.adm_com, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 19, row.ref_received, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 20, row.total_commission, { numFmt: '$#,##0.00' });
    writeCell(worksheet, rowNumber, 21, null, { fill: TITLE_FILL });
  });

  const monthTotals = sumMonthRows(rows);
  const totalRow = 34;
  worksheet.getRow(totalRow).height = 24;

  writeCell(worksheet, totalRow, 1, 'TOTAL', {
    bold: true,
    fill: TOTAL_FILL
  });

  writeCell(worksheet, totalRow, 2, {
    formula: '=SUM(B3:B33)',
    result: monthTotals.listings
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 3, {
    formula: '=SUM(C3:C33)',
    result: monthTotals.olx_leads
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 4, {
    formula: '=SUM(D3:D33)',
    result: monthTotals.fb_leads
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 5, {
    formula: '=SUM(E3:E33)',
    result: monthTotals.insta_leads
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 6, {
    formula: '=SUM(F3:F33)',
    result: monthTotals.unknown_leads
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 7, {
    formula: '=SUM(G3:G33)',
    result: monthTotals.website_leads
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 8, {
    formula: '=SUM(H3:H33)',
    result: monthTotals.viewing
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });

  writeCell(worksheet, totalRow, 9, snapshot.manual_totals?.dev_total || 0, {
    bold: true,
    fill: TOTAL_FILL,
    numFmt: '#,##0'
  });
  writeCell(worksheet, totalRow, 10, snapshot.manual_totals?.new_join_total || 0, {
    bold: true,
    fill: TOTAL_FILL,
    numFmt: '#,##0'
  });
  writeCell(worksheet, totalRow, 11, snapshot.manual_totals?.reviews_total || 0, {
    bold: true,
    fill: TOTAL_FILL,
    numFmt: '#,##0'
  });

  writeCell(worksheet, totalRow, 12, {
    formula: '=SUM(L3:L33)',
    result: monthTotals.sales
  }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
  writeCell(worksheet, totalRow, 13, {
    formula: '=SUM(M3:M33)',
    result: monthTotals.sales_amount
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 14, {
    formula: '=SUM(O3:T33)',
    result: monthTotals.total_commission
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 15, {
    formula: '=SUM(O3:O33)',
    result: monthTotals.age_com
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 16, {
    formula: '=SUM(P3:P33)',
    result: monthTotals.fin_com
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 17, {
    formula: '=SUM(Q3:Q33)',
    result: monthTotals.ref_com
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 18, {
    formula: '=SUM(R3:R33)',
    result: monthTotals.tl_com
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 19, {
    formula: '=SUM(S3:S33)',
    result: monthTotals.adm_com
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 20, {
    formula: '=SUM(T3:T33)',
    result: monthTotals.ref_received
  }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  writeCell(worksheet, totalRow, 21, null, { fill: TOTAL_FILL });

  return { worksheet, monthTotals };
}

function computeSummaryBlockMonthRanges(monthSnapshots) {
  const ranges = [];

  for (let startIndex = 0; startIndex < monthSnapshots.length; startIndex += 3) {
    ranges.push({
      startIndex,
      endIndex: Math.min(startIndex + 2, monthSnapshots.length - 1)
    });
  }

  return ranges;
}

function renderSummarySheet(workbook, report) {
  const worksheet = workbook.addWorksheet('AGENT VIEW');
  worksheet.columns = SUMMARY_SHEET_WIDTHS.map((width) => ({ width }));
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  worksheet.getRow(1).height = 8;
  worksheet.getRow(2).height = 26;

  worksheet.mergeCells('A1:U1');
  writeCell(worksheet, 1, 1, '', {
    fill: TITLE_FILL,
    border: createBorder('thin')
  });

  const headers = [
    null,
    'LISTING',
    'TARGET',
    'LEADS',
    'VIEWING',
    '%VIEWING',
    'SALES',
    '%SALES L',
    '%SALES V',
    'SALES AMMOUNT',
    'SALES',
    'TARGET',
    'DEV',
    'TARGET',
    'NEW JOIN',
    'TARGET',
    'REVIEWS',
    'TARGET',
    'AGE COM',
    'REF RECEIVED',
    null
  ];

  headers.forEach((header, index) => {
    writeCell(worksheet, 2, index + 1, header, {
      bold: true,
      fill: HEADER_FILL,
      border: createBorder('thin')
    });
  });

  const months = Array.isArray(report.months) ? report.months : [];
  const quarterTargets = Array.isArray(report.quarter_targets) ? report.quarter_targets : [];
  const summaryTargets = report.summary_targets || {};
  const blockRanges = computeSummaryBlockMonthRanges(months);
  const totalRow = 3 + months.length;

  months.forEach((month, index) => {
    const rowNumber = 3 + index;
    const monthTotals = month.totals || {};
    const blockIndex = Math.floor(index / 3);
    const block = quarterTargets[blockIndex] || {};
    const blockRange = blockRanges[blockIndex];
    const blockStartRow = 3 + (blockRange?.startIndex || 0);
    const blockEndRow = 3 + (blockRange?.endIndex || index);
    const isBlockStart = index === (blockRange?.startIndex || 0);

    writeCell(worksheet, rowNumber, 1, month.sheet_name || month.month_label || '', {
      bold: true,
      fill: TOTAL_FILL,
      border: createBorder('thin')
    });

    writeCell(worksheet, rowNumber, 2, {
      formula: `='${month.sheet_name}'!B34`,
      result: monthTotals.listings_count || 0
    }, { numFmt: '#,##0' });

    if (isBlockStart) {
      const targetCell = worksheet.getCell(rowNumber, 3);
      targetCell.value = block.listings_target || 0;
      targetCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_FONT.argb } };
      targetCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      targetCell.border = createBorder('thin');
      targetCell.fill = TOTAL_FILL;
      targetCell.numFmt = '#,##0';

      if (blockRange) {
        worksheet.mergeCells(`C${blockStartRow}:C${blockEndRow}`);
      }
    }

    writeCell(worksheet, rowNumber, 4, {
      formula: `=SUM('${month.sheet_name}'!C34:G34)`,
      result: monthTotals.leads_count || 0
    }, { numFmt: '#,##0' });

    writeCell(worksheet, rowNumber, 5, {
      formula: `='${month.sheet_name}'!H34`,
      result: monthTotals.viewings_count || 0
    }, { numFmt: '#,##0' });

    writeCell(worksheet, rowNumber, 6, {
      formula: `=IFERROR(E${rowNumber}/D${rowNumber},0)`,
      result: formatPercentValue((monthTotals.viewings_count || 0) / Math.max(monthTotals.leads_count || 0, 0))
    }, { numFmt: '0.0%' });

    writeCell(worksheet, rowNumber, 7, {
      formula: `='${month.sheet_name}'!L34`,
      result: monthTotals.sales_count || 0
    }, { numFmt: '#,##0' });

    writeCell(worksheet, rowNumber, 8, {
      formula: `=IFERROR(G${rowNumber}/D${rowNumber},0)`,
      result: formatPercentValue((monthTotals.sales_count || 0) / Math.max(monthTotals.leads_count || 0, 0))
    }, { numFmt: '0.0%' });

    writeCell(worksheet, rowNumber, 9, {
      formula: `=IFERROR(G${rowNumber}/E${rowNumber},0)`,
      result: formatPercentValue((monthTotals.sales_count || 0) / Math.max(monthTotals.viewings_count || 0, 0))
    }, { numFmt: '0.0%' });

    writeCell(worksheet, rowNumber, 10, {
      formula: `='${month.sheet_name}'!M34`,
      result: monthTotals.sales_amount || 0
    }, { numFmt: '$#,##0.00' });

    writeCell(worksheet, rowNumber, 11, {
      formula: `=SUM(J${blockStartRow}:J${blockEndRow})`,
      result: blockRange
        ? months.slice(blockRange.startIndex, blockRange.endIndex + 1).reduce((sum, item) => sum + toNumber(item.totals?.sales_amount, 0), 0)
        : monthTotals.sales_amount || 0
    }, { numFmt: '$#,##0.00' });

    if (isBlockStart) {
      const salesTargetCell = worksheet.getCell(rowNumber, 12);
      salesTargetCell.value = toMoney(block.sales_amount_target || 0, 0);
      salesTargetCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_FONT.argb } };
      salesTargetCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      salesTargetCell.border = createBorder('thin');
      salesTargetCell.fill = TOTAL_FILL;
      salesTargetCell.numFmt = '$#,##0.00';

      if (blockRange) {
        worksheet.mergeCells(`L${blockStartRow}:L${blockEndRow}`);
      }
    }

    writeCell(worksheet, rowNumber, 13, {
      formula: `='${month.sheet_name}'!I34`,
      result: month.manual_totals?.dev_total || 0
    }, { numFmt: '#,##0' });

    if (rowNumber === 3) {
      const devTargetCell = worksheet.getCell(3, 14);
      devTargetCell.value = toNumber(summaryTargets.dev_target, 0);
      devTargetCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_FONT.argb } };
      devTargetCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      devTargetCell.border = createBorder('thin');
      devTargetCell.fill = TOTAL_FILL;
      devTargetCell.numFmt = '#,##0';
    }

    writeCell(worksheet, rowNumber, 15, {
      formula: `='${month.sheet_name}'!J34`,
      result: month.manual_totals?.new_join_total || 0
    }, { numFmt: '#,##0' });

    if (rowNumber === 3) {
      const newJoinTargetCell = worksheet.getCell(3, 16);
      newJoinTargetCell.value = toNumber(summaryTargets.new_join_target, 0);
      newJoinTargetCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_FONT.argb } };
      newJoinTargetCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      newJoinTargetCell.border = createBorder('thin');
      newJoinTargetCell.fill = TOTAL_FILL;
      newJoinTargetCell.numFmt = '#,##0';
    }

    writeCell(worksheet, rowNumber, 17, {
      formula: `='${month.sheet_name}'!K34`,
      result: month.manual_totals?.reviews_total || 0
    }, { numFmt: '#,##0' });

    if (rowNumber === 3) {
      const reviewsTargetCell = worksheet.getCell(3, 18);
      reviewsTargetCell.value = toNumber(summaryTargets.reviews_target, 0);
      reviewsTargetCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_FONT.argb } };
      reviewsTargetCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      reviewsTargetCell.border = createBorder('thin');
      reviewsTargetCell.fill = TOTAL_FILL;
      reviewsTargetCell.numFmt = '0.0%';
    }

    writeCell(worksheet, rowNumber, 19, {
      formula: `='${month.sheet_name}'!O34`,
      result: monthTotals.agent_commission || 0
    }, { numFmt: '$#,##0.00' });

    writeCell(worksheet, rowNumber, 20, {
      formula: `='${month.sheet_name}'!T34`,
      result: monthTotals.referral_received_commission || 0
    }, { numFmt: '$#,##0.00' });

    writeCell(worksheet, rowNumber, 21, {
      formula: `=SUM(S${rowNumber}:T${rowNumber})`,
      result: (monthTotals.agent_commission || 0) + (monthTotals.referral_received_commission || 0)
    }, { numFmt: '$#,##0.00' });
  });

  if (months.length > 0) {
    const firstDataRow = 3;
    const lastDataRow = 2 + months.length;
    worksheet.mergeCells(`N${firstDataRow}:N${lastDataRow}`);
    worksheet.mergeCells(`P${firstDataRow}:P${lastDataRow}`);
    worksheet.mergeCells(`R${firstDataRow}:R${lastDataRow}`);

    const totalSummary = months.reduce((acc, month) => {
      const totals = month.totals || {};
      const manualTotals = month.manual_totals || {};
      acc.listings += totals.listings_count || 0;
      acc.leads += totals.leads_count || 0;
      acc.viewings += totals.viewings_count || 0;
      acc.sales += totals.sales_count || 0;
      acc.sales_amount += totals.sales_amount || 0;
      acc.dev += manualTotals.dev_total || 0;
      acc.new_join += manualTotals.new_join_total || 0;
      acc.reviews += manualTotals.reviews_total || 0;
      acc.agent_commission += totals.agent_commission || 0;
      acc.ref_received += totals.referral_received_commission || 0;
      acc.total_commission += (totals.agent_commission || 0) + (totals.referral_received_commission || 0);
      return acc;
    }, {
      listings: 0,
      leads: 0,
      viewings: 0,
      sales: 0,
      sales_amount: 0,
      dev: 0,
      new_join: 0,
      reviews: 0,
      agent_commission: 0,
      ref_received: 0,
      total_commission: 0
    });

    writeCell(worksheet, lastDataRow + 1, 1, null, { fill: TOTAL_FILL });
    writeCell(worksheet, lastDataRow + 1, 2, { formula: `=SUM(B${firstDataRow}:B${lastDataRow})`, result: totalSummary.listings }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 3, { formula: `=SUM(C${firstDataRow}:C${lastDataRow})`, result: quarterTargets.reduce((sum, block) => sum + toNumber(block.listings_target, 0), 0) }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 4, { formula: `=SUM(D${firstDataRow}:D${lastDataRow})`, result: totalSummary.leads }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 5, { formula: `=SUM(E${firstDataRow}:E${lastDataRow})`, result: totalSummary.viewings }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 6, { formula: `=IFERROR(E${lastDataRow + 1}/D${lastDataRow + 1},0)`, result: formatPercentValue(safeDivide(totalSummary.viewings, totalSummary.leads)) }, { bold: true, fill: TOTAL_FILL, numFmt: '0.0%' });
    writeCell(worksheet, lastDataRow + 1, 7, { formula: `=SUM(G${firstDataRow}:G${lastDataRow})`, result: totalSummary.sales }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 8, { formula: `=IFERROR(G${lastDataRow + 1}/D${lastDataRow + 1},0)`, result: formatPercentValue(safeDivide(totalSummary.sales, totalSummary.leads)) }, { bold: true, fill: TOTAL_FILL, numFmt: '0.0%' });
    writeCell(worksheet, lastDataRow + 1, 9, { formula: `=IFERROR(G${lastDataRow + 1}/E${lastDataRow + 1},0)`, result: formatPercentValue(safeDivide(totalSummary.sales, totalSummary.viewings)) }, { bold: true, fill: TOTAL_FILL, numFmt: '0.0%' });
    writeCell(worksheet, lastDataRow + 1, 10, { formula: `=SUM(J${firstDataRow}:J${lastDataRow})`, result: totalSummary.sales_amount }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
    writeCell(worksheet, lastDataRow + 1, 11, { formula: `=SUM(K${firstDataRow}:K${lastDataRow})`, result: months.reduce((sum, month) => sum + toMoney(month.totals?.sales_amount, 0), 0) }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
    writeCell(worksheet, lastDataRow + 1, 12, { formula: `=SUM(L${firstDataRow}:L${lastDataRow})`, result: quarterTargets.reduce((sum, block) => sum + toMoney(block.sales_amount_target, 0), 0) }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
    writeCell(worksheet, lastDataRow + 1, 13, { formula: `=SUM(M${firstDataRow}:M${lastDataRow})`, result: totalSummary.dev }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 14, { formula: `=SUM(N${firstDataRow}:N${lastDataRow})`, result: toNumber(report.summary_targets?.dev_target, 0) }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 15, { formula: `=SUM(O${firstDataRow}:O${lastDataRow})`, result: totalSummary.new_join }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 16, { formula: `=SUM(P${firstDataRow}:P${lastDataRow})`, result: toNumber(report.summary_targets?.new_join_target, 0) }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 17, { formula: `=SUM(Q${firstDataRow}:Q${lastDataRow})`, result: totalSummary.reviews }, { bold: true, fill: TOTAL_FILL, numFmt: '#,##0' });
    writeCell(worksheet, lastDataRow + 1, 18, { formula: `=SUM(R${firstDataRow}:R${lastDataRow})`, result: toNumber(report.summary_targets?.reviews_target, 0) }, { bold: true, fill: TOTAL_FILL, numFmt: '0.0%' });
    writeCell(worksheet, lastDataRow + 1, 19, { formula: `=SUM(S${firstDataRow}:S${lastDataRow})`, result: totalSummary.agent_commission }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
    writeCell(worksheet, lastDataRow + 1, 20, 'TOTAL', { bold: true, fill: TOTAL_FILL });
    writeCell(worksheet, lastDataRow + 1, 21, { formula: `=SUM(U${firstDataRow}:U${lastDataRow})`, result: totalSummary.total_commission }, { bold: true, fill: TOTAL_FILL, numFmt: '$#,##0.00' });
  }
}

async function exportAgentViewReportToExcel(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finders CRM';
  workbook.lastModifiedBy = 'Finders CRM';
  workbook.created = new Date();
  workbook.modified = new Date();

  const payload = report?.report_payload || report;
  const months = Array.isArray(payload.months) ? payload.months : [];

  months.forEach((snapshot) => {
    renderMonthlySheet(workbook, snapshot);
  });

  renderSummarySheet(workbook, payload);

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  exportAgentViewReportToExcel
};
