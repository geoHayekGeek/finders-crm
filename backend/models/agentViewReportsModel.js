const pool = require('../config/db');
const { CLOSURE_STATUS_ID_SUBQUERY } = require('../utils/propertyStatusUtils');

let schemaEnsurePromise = null;

function toInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
}

function normalizeRoleValue(role) {
  return role ? String(role).toLowerCase().replace(/_/g, ' ').trim() : '';
}

function parseMonthInput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const monthOnlyMatch = raw.match(/^(\d{4})-(\d{2})$/);
  if (monthOnlyMatch) {
    const year = parseInt(monthOnlyMatch[1], 10);
    const month = parseInt(monthOnlyMatch[2], 10);
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }

  const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1, 0, 0, 0, 0));
}

function formatIsoDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  )).toISOString().split('T')[0];
}

function formatMonthKey(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0')
  ].join('-');
}

function formatSheetName(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'JAN';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC'
  }).format(date).toUpperCase();
}

function formatMonthLabel(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function bucketLeadSource(sourceName) {
  const normalized = String(sourceName || 'Unknown').trim().toLowerCase();

  if (['olx', 'dubizzle', 'dubbizle'].includes(normalized)) {
    return 'OLX';
  }

  if (['facebook', 'fb'].includes(normalized)) {
    return 'FB';
  }

  if (['instagram', 'insta', 'ig'].includes(normalized)) {
    return 'INSTA';
  }

  if (['website', 'web'].includes(normalized)) {
    return 'Website';
  }

  return 'Unknown';
}

function normalizeQuarterTargets(rawTargets, blockCount) {
  const targets = Array.isArray(rawTargets) ? rawTargets : [];

  return Array.from({ length: blockCount }, (_, index) => {
    const source = targets[index] || {};
    return {
      listings_target: toInteger(source.listings_target ?? source.listings ?? source.target_listings, 0),
      sales_amount_target: toMoney(source.sales_amount_target ?? source.sales_amount ?? source.target_sales_amount, 0)
    };
  });
}

function normalizeSummaryTargets(rawTargets = {}) {
  return {
    dev_target: toInteger(rawTargets.dev_target ?? rawTargets.dev ?? rawTargets.target_dev, 0),
    new_join_target: toInteger(rawTargets.new_join_target ?? rawTargets.new_join ?? rawTargets.target_new_join, 0),
    reviews_target: toInteger(rawTargets.reviews_target ?? rawTargets.reviews ?? rawTargets.target_reviews, 0)
  };
}

function normalizeMonthlyOverrides(rawOverrides, periods) {
  const overrideList = Array.isArray(rawOverrides) ? rawOverrides : [];

  return periods.map((period) => {
    const match = overrideList.find((override) => {
      const overrideStart = parseMonthInput(override.month_start || override.start_date || override.month_key);
      if (overrideStart && formatMonthKey(overrideStart) === formatMonthKey(period.startDateUtc)) {
        return true;
      }

      if (override.sheet_name && String(override.sheet_name).trim().toUpperCase() === period.sheetName) {
        return true;
      }

      return false;
    }) || {};

    return {
      month_key: period.monthKey,
      sheet_name: period.sheetName,
      month_label: period.monthLabel,
      start_date: period.startDateStr,
      end_date: period.endDateStr,
      dev_total: toInteger(match.dev_total ?? match.dev_count ?? match.dev, 0),
      new_join_total: toInteger(match.new_join_total ?? match.new_join_count ?? match.new_join, 0),
      reviews_total: toInteger(match.reviews_total ?? match.reviews_count ?? match.reviews, 0)
    };
  });
}

async function ensureAgentViewSchema() {
  if (!schemaEnsurePromise) {
    schemaEnsurePromise = pool.query(`
      ALTER TABLE agent_view_reports
        ADD COLUMN IF NOT EXISTS listings_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS viewings_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sales_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS dev_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS new_join_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS reviews_count DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS agent_commission DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS referral_received_commission DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_commission DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS report_payload JSONB NOT NULL DEFAULT '{}'::JSONB
    `).catch((error) => {
      schemaEnsurePromise = null;
      throw error;
    });
  }

  return schemaEnsurePromise;
}

async function ensureAgentViewDependencies() {
  await pool.query(`
    ALTER TABLE referrals
      ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL
  `);

  await pool.query(`
    ALTER TABLE lead_referrals
      ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL
  `);

  await pool.query(`
    ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS agent_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS finders_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS team_leader_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS administration_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS latest_property_referral_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS latest_lead_referral_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS external_referral_commissions JSONB DEFAULT '[]'::JSONB,
      ADD COLUMN IF NOT EXISTS external_referral_commission DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS commission DECIMAL(15,2)
  `);
}

function buildPeriodWindows(startMonthInput, periodMonths) {
  const startMonth = parseMonthInput(startMonthInput);
  if (!startMonth) {
    throw new Error('Start month is required');
  }

  const normalizedPeriodMonths = toInteger(periodMonths, 0);
  if (![3, 6, 9, 12].includes(normalizedPeriodMonths)) {
    throw new Error('Period months must be one of 3, 6, 9, or 12');
  }

  const periods = [];
  for (let index = 0; index < normalizedPeriodMonths; index += 1) {
    const monthStartUtc = new Date(Date.UTC(
      startMonth.getUTCFullYear(),
      startMonth.getUTCMonth() + index,
      1,
      0, 0, 0, 0
    ));
    const monthEndUtc = new Date(Date.UTC(
      monthStartUtc.getUTCFullYear(),
      monthStartUtc.getUTCMonth() + 1,
      0,
      23, 59, 59, 999
    ));

    periods.push({
      startDateUtc: monthStartUtc,
      endDateUtc: monthEndUtc,
      startDateStr: formatIsoDate(monthStartUtc),
      endDateStr: formatIsoDate(monthEndUtc),
      monthKey: formatMonthKey(monthStartUtc),
      monthLabel: formatSheetName(monthStartUtc),
      sheetName: formatSheetName(monthStartUtc),
      displayLabel: formatMonthLabel(monthStartUtc),
      daysInMonth: monthEndUtc.getUTCDate()
    });
  }

  return periods;
}

async function getAgentDisplayData(agentId) {
  const result = await pool.query(
    `SELECT id, name, user_code, role
     FROM users
     WHERE id = $1`,
    [agentId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Agent not found');
  }

  const role = normalizeRoleValue(row.role);
  if (!['agent', 'consultant', 'agent manager', 'team leader', 'operations', 'operations manager', 'admin'].includes(role)) {
    throw new Error('Selected user is not an agent-style user');
  }

  return row;
}

async function fetchDailyListings(agentId, startDateStr, endDateStr) {
  const result = await pool.query(
    `SELECT DATE(created_at) AS day, COUNT(*)::int AS count
     FROM properties
     WHERE agent_id = $1
       AND created_at >= $2::timestamp
       AND created_at <= $3::timestamp
     GROUP BY DATE(created_at)`,
    [agentId, `${startDateStr}T00:00:00.000Z`, `${endDateStr}T23:59:59.999Z`]
  );

  return result.rows.reduce((lookup, row) => {
    const dayKey = formatIsoDate(row.day);
    if (dayKey) {
      lookup.set(dayKey, toInteger(row.count, 0));
    }
    return lookup;
  }, new Map());
}

async function fetchDailyLeadBuckets(agentId, startDateStr, endDateStr) {
  const result = await pool.query(
    `SELECT DATE(l.date) AS day,
            COALESCE(rs.source_name, 'Unknown') AS source_name,
            COUNT(*)::int AS count
     FROM leads l
     LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
     WHERE l.agent_id = $1
       AND DATE(l.date) >= $2::date
       AND DATE(l.date) <= $3::date
     GROUP BY DATE(l.date), COALESCE(rs.source_name, 'Unknown')`,
    [agentId, startDateStr, endDateStr]
  );

  const lookup = new Map();

  result.rows.forEach((row) => {
    const dayKey = formatIsoDate(row.day);
    if (!dayKey) {
      return;
    }

    const bucketName = bucketLeadSource(row.source_name);
    const current = lookup.get(dayKey) || {
      OLX: 0,
      FB: 0,
      INSTA: 0,
      Unknown: 0,
      Website: 0
    };

    current[bucketName] += toInteger(row.count, 0);
    lookup.set(dayKey, current);
  });

  return lookup;
}

async function fetchDailyViewings(agentId, startDateStr, endDateStr) {
  const result = await pool.query(
    `SELECT viewing_date::date AS day, COUNT(*)::int AS count
     FROM viewings
     WHERE agent_id = $1
       AND viewing_date >= $2::date
       AND viewing_date <= $3::date
     GROUP BY viewing_date::date`,
    [agentId, startDateStr, endDateStr]
  );

  return result.rows.reduce((lookup, row) => {
    const dayKey = formatIsoDate(row.day);
    if (dayKey) {
      lookup.set(dayKey, toInteger(row.count, 0));
    }
    return lookup;
  }, new Map());
}

async function fetchDailySalesBreakdown(agentId, startDateStr, endDateStr) {
  const result = await pool.query(
    `SELECT
       p.closed_date::date AS day,
       COUNT(*)::int AS sales_count,
       COALESCE(SUM(COALESCE(p.price, 0)), 0) AS sales_amount,
       COALESCE(SUM(COALESCE(p.agent_commission, p.commission, 0)), 0) AS agent_commission,
       COALESCE(SUM(COALESCE(p.finders_commission, 0)), 0) AS finders_commission,
       COALESCE(SUM(
         COALESCE(p.latest_property_referral_commission, 0) +
         COALESCE(p.latest_lead_referral_commission, 0) +
         COALESCE(p.external_referral_commission, 0)
       ), 0) AS referrals_on_properties_commission,
       COALESCE(SUM(COALESCE(p.team_leader_commission, 0)), 0) AS team_leader_commission,
       COALESCE(SUM(COALESCE(p.administration_commission, 0)), 0) AS administration_commission
     FROM properties p
     WHERE p.agent_id = $1
       AND p.closed_date >= $2::date
       AND p.closed_date <= $3::date
       AND p.status_id IN (
         ${CLOSURE_STATUS_ID_SUBQUERY}
       )
     GROUP BY p.closed_date::date`,
    [agentId, startDateStr, endDateStr]
  );

  return result.rows.reduce((lookup, row) => {
    const dayKey = formatIsoDate(row.day);
    if (!dayKey) {
      return lookup;
    }

    lookup.set(dayKey, {
      sales_count: toInteger(row.sales_count, 0),
      sales_amount: toMoney(row.sales_amount, 0),
      agent_commission: toMoney(row.agent_commission, 0),
      finders_commission: toMoney(row.finders_commission, 0),
      referrals_on_properties_commission: toMoney(row.referrals_on_properties_commission, 0),
      team_leader_commission: toMoney(row.team_leader_commission, 0),
      administration_commission: toMoney(row.administration_commission, 0)
    });

    return lookup;
  }, new Map());
}

async function fetchDailyReferralReceivedCommission(agentId, startDateStr, endDateStr) {
  const propertyReferralResult = await pool.query(
    `WITH latest_property_referrals AS (
       SELECT DISTINCT ON (r.property_id)
         r.property_id,
         r.employee_id
       FROM referrals r
       WHERE r.external = FALSE
       ORDER BY r.property_id, r.date DESC, r.created_at DESC, r.id DESC
     )
     SELECT
       referred_property.closed_date::date AS day,
       COALESCE(SUM(COALESCE(referred_property.latest_property_referral_commission, 0)), 0) AS commission
     FROM properties referred_property
     INNER JOIN latest_property_referrals latest_property_referral
       ON latest_property_referral.property_id = referred_property.id
      AND latest_property_referral.employee_id = $1
     WHERE referred_property.closed_date >= $2::date
       AND referred_property.closed_date <= $3::date
       AND referred_property.status_id IN (
         ${CLOSURE_STATUS_ID_SUBQUERY}
       )
     GROUP BY referred_property.closed_date::date`,
    [agentId, startDateStr, endDateStr]
  );

  const leadReferralResult = await pool.query(
    `WITH latest_lead_referrals AS (
       SELECT DISTINCT ON (lr.lead_id)
         lr.lead_id,
         lr.agent_id
       FROM lead_referrals lr
       WHERE lr.external = FALSE
       ORDER BY lr.lead_id, lr.referral_date DESC, lr.created_at DESC, lr.id DESC
     )
     SELECT
       referred_lead_property.closed_date::date AS day,
       COALESCE(SUM(COALESCE(referred_lead_property.latest_lead_referral_commission, 0)), 0) AS commission
     FROM properties referred_lead_property
     INNER JOIN latest_lead_referrals latest_lead_referral
       ON latest_lead_referral.lead_id = referred_lead_property.owner_id
      AND latest_lead_referral.agent_id = $1
     WHERE referred_lead_property.closed_date >= $2::date
       AND referred_lead_property.closed_date <= $3::date
       AND referred_lead_property.status_id IN (
         ${CLOSURE_STATUS_ID_SUBQUERY}
       )
     GROUP BY referred_lead_property.closed_date::date`,
    [agentId, startDateStr, endDateStr]
  );

  const lookup = new Map();

  propertyReferralResult.rows.forEach((row) => {
    const dayKey = formatIsoDate(row.day);
    if (!dayKey) {
      return;
    }

    lookup.set(dayKey, (lookup.get(dayKey) || 0) + toMoney(row.commission, 0));
  });

  leadReferralResult.rows.forEach((row) => {
    const dayKey = formatIsoDate(row.day);
    if (!dayKey) {
      return;
    }

    lookup.set(dayKey, (lookup.get(dayKey) || 0) + toMoney(row.commission, 0));
  });

  return lookup;
}

function buildMonthlyRows(period, dailyMaps, monthlyOverride = {}) {
  const rows = [];
  const monthDays = period.daysInMonth;

  for (let day = 1; day <= 31; day += 1) {
    const isRealDay = day <= monthDays;
    const dateUtc = isRealDay
      ? new Date(Date.UTC(period.startDateUtc.getUTCFullYear(), period.startDateUtc.getUTCMonth(), day, 0, 0, 0, 0))
      : null;
    const dayKey = dateUtc ? formatIsoDate(dateUtc) : null;

    const listingCount = dayKey ? (dailyMaps.listings.get(dayKey) || 0) : 0;
    const leadBuckets = dayKey ? (dailyMaps.leads.get(dayKey) || {
      OLX: 0,
      FB: 0,
      INSTA: 0,
      Unknown: 0,
      Website: 0
    }) : {
      OLX: 0,
      FB: 0,
      INSTA: 0,
      Unknown: 0,
      Website: 0
    };
    const viewingCount = dayKey ? (dailyMaps.viewings.get(dayKey) || 0) : 0;
    const sales = dayKey ? (dailyMaps.sales.get(dayKey) || {
      sales_count: 0,
      sales_amount: 0,
      agent_commission: 0,
      finders_commission: 0,
      referrals_on_properties_commission: 0,
      team_leader_commission: 0,
      administration_commission: 0
    }) : {
      sales_count: 0,
      sales_amount: 0,
      agent_commission: 0,
      finders_commission: 0,
      referrals_on_properties_commission: 0,
      team_leader_commission: 0,
      administration_commission: 0
    };
    const referralReceived = dayKey ? (dailyMaps.referralsReceived.get(dayKey) || 0) : 0;

    rows.push({
      day,
      date: dayKey,
      listings: listingCount,
      olx_leads: leadBuckets.OLX || 0,
      fb_leads: leadBuckets.FB || 0,
      insta_leads: leadBuckets.INSTA || 0,
      unknown_leads: leadBuckets.Unknown || 0,
      website_leads: leadBuckets.Website || 0,
      viewing: viewingCount,
      dev: 0,
      new_join: 0,
      reviews: 0,
      sales: sales.sales_count || 0,
      sales_amount: toMoney(sales.sales_amount, 0),
      age_com: toMoney(sales.agent_commission, 0),
      fin_com: toMoney(sales.finders_commission, 0),
      ref_com: toMoney(sales.referrals_on_properties_commission, 0),
      tl_com: toMoney(sales.team_leader_commission, 0),
      adm_com: toMoney(sales.administration_commission, 0),
      ref_received: referralReceived,
      total_commission: toMoney(
        (sales.agent_commission || 0) +
        (sales.finders_commission || 0) +
        (sales.referrals_on_properties_commission || 0) +
        (sales.team_leader_commission || 0) +
        (sales.administration_commission || 0) +
        referralReceived,
        0
      )
    });
  }

  return rows;
}

async function buildMonthlySnapshot(agentId, period, monthlyOverride = {}) {
  const [listings, leads, viewings, sales, referralsReceived] = await Promise.all([
    fetchDailyListings(agentId, period.startDateStr, period.endDateStr),
    fetchDailyLeadBuckets(agentId, period.startDateStr, period.endDateStr),
    fetchDailyViewings(agentId, period.startDateStr, period.endDateStr),
    fetchDailySalesBreakdown(agentId, period.startDateStr, period.endDateStr),
    fetchDailyReferralReceivedCommission(agentId, period.startDateStr, period.endDateStr)
  ]);

  const rows = buildMonthlyRows(period, {
    listings,
    leads,
    viewings,
    sales,
    referralsReceived
  }, monthlyOverride);

  const monthlyTotals = rows.reduce((totals, row) => {
    totals.listings_count += row.listings || 0;
    totals.leads_count += (row.olx_leads || 0) + (row.fb_leads || 0) + (row.insta_leads || 0) + (row.unknown_leads || 0) + (row.website_leads || 0);
    totals.viewings_count += row.viewing || 0;
    totals.sales_count += row.sales || 0;
    totals.sales_amount += row.sales_amount || 0;
    totals.agent_commission += row.age_com || 0;
    totals.finders_commission += row.fin_com || 0;
    totals.referrals_on_properties_commission += row.ref_com || 0;
    totals.team_leader_commission += row.tl_com || 0;
    totals.administration_commission += row.adm_com || 0;
    totals.referral_received_commission += row.ref_received || 0;
    return totals;
  }, {
    listings_count: 0,
    leads_count: 0,
    viewings_count: 0,
    sales_count: 0,
    sales_amount: 0,
    agent_commission: 0,
    finders_commission: 0,
    referrals_on_properties_commission: 0,
    team_leader_commission: 0,
    administration_commission: 0,
    referral_received_commission: 0
  });

  monthlyTotals.dev_count = monthlyOverride.dev_total || 0;
  monthlyTotals.new_join_count = monthlyOverride.new_join_total || 0;
  monthlyTotals.reviews_count = monthlyOverride.reviews_total || 0;
  monthlyTotals.total_commission = toMoney(
    monthlyTotals.agent_commission +
    monthlyTotals.finders_commission +
    monthlyTotals.referrals_on_properties_commission +
    monthlyTotals.team_leader_commission +
    monthlyTotals.administration_commission +
    monthlyTotals.referral_received_commission,
    0
  );

  return {
    sheet_name: period.sheetName,
    month_key: period.monthKey,
    month_label: period.monthLabel,
    display_label: period.displayLabel,
    start_date: period.startDateStr,
    end_date: period.endDateStr,
    rows,
    totals: monthlyTotals,
    manual_totals: {
      dev_total: monthlyOverride.dev_total || 0,
      new_join_total: monthlyOverride.new_join_total || 0,
      reviews_total: monthlyOverride.reviews_total || 0
    }
  };
}

function buildSummaryFromMonths(monthSnapshots) {
  return monthSnapshots.reduce((summary, month) => {
    summary.listings_count += month.totals.listings_count || 0;
    summary.leads_count += month.totals.leads_count || 0;
    summary.viewings_count += month.totals.viewings_count || 0;
    summary.sales_count += month.totals.sales_count || 0;
    summary.sales_amount += month.totals.sales_amount || 0;
    summary.dev_count += month.manual_totals.dev_total || 0;
    summary.new_join_count += month.manual_totals.new_join_total || 0;
    summary.reviews_count += month.manual_totals.reviews_total || 0;
    summary.agent_commission += month.totals.agent_commission || 0;
    summary.finders_commission += month.totals.finders_commission || 0;
    summary.referrals_on_properties_commission += month.totals.referrals_on_properties_commission || 0;
    summary.team_leader_commission += month.totals.team_leader_commission || 0;
    summary.administration_commission += month.totals.administration_commission || 0;
    summary.referral_received_commission += month.totals.referral_received_commission || 0;
    summary.total_commission += month.totals.total_commission || 0;
    return summary;
  }, {
    listings_count: 0,
    leads_count: 0,
    viewings_count: 0,
    sales_count: 0,
    sales_amount: 0,
    dev_count: 0,
    new_join_count: 0,
    reviews_count: 0,
    agent_commission: 0,
    finders_commission: 0,
    referrals_on_properties_commission: 0,
    team_leader_commission: 0,
    administration_commission: 0,
    referral_received_commission: 0,
    total_commission: 0
  });
}

async function buildAgentViewPayload(reportData = {}) {
  await ensureAgentViewDependencies();

  const agentId = toInteger(reportData.agent_id, 0);
  if (!Number.isInteger(agentId) || agentId <= 0) {
    throw new Error('Agent ID is required');
  }

  const periodMonths = toInteger(reportData.period_months, 0);
  if (![3, 6, 9, 12].includes(periodMonths)) {
    throw new Error('Period months must be one of 3, 6, 9, or 12');
  }

  const startMonth = parseMonthInput(reportData.start_date || reportData.start_month);
  if (!startMonth) {
    throw new Error('Start month is required');
  }

  const periods = buildPeriodWindows(startMonth, periodMonths);
  const agent = await getAgentDisplayData(agentId);
  const quarterTargets = normalizeQuarterTargets(reportData.quarter_targets || reportData.block_targets, periodMonths / 3);
  const summaryTargets = normalizeSummaryTargets(reportData.summary_targets || reportData.period_targets || {});
  const monthlyOverrides = normalizeMonthlyOverrides(reportData.month_overrides || reportData.months || [], periods);

  const monthSnapshots = [];
  for (let index = 0; index < periods.length; index += 1) {
    const snapshot = await buildMonthlySnapshot(agentId, periods[index], monthlyOverrides[index]);
    monthSnapshots.push(snapshot);
  }

  const summary = buildSummaryFromMonths(monthSnapshots);

  const payload = {
    agent: {
      id: agent.id,
      name: agent.name,
      user_code: agent.user_code || null,
      role: agent.role
    },
    start_date: periods[0].startDateStr,
    end_date: periods[periods.length - 1].endDateStr,
    period_months: periodMonths,
    quarter_targets: quarterTargets,
    summary_targets: summaryTargets,
    months: monthSnapshots,
    summary
  };

  return payload;
}

function parseReportPayload(reportRow) {
  if (!reportRow) {
    return null;
  }

  const payload = typeof reportRow.report_payload === 'string'
    ? JSON.parse(reportRow.report_payload)
    : (reportRow.report_payload || {});

  return {
    ...reportRow,
    report_payload: payload
  };
}

async function createAgentViewReport(reportData = {}, createdBy) {
  await ensureAgentViewSchema();
  const payload = await buildAgentViewPayload(reportData);
  const startDateStr = payload.start_date;
  const endDateStr = payload.end_date;
  const agentId = payload.agent.id;
  const summary = payload.summary || {};
  const savedPayload = JSON.stringify(payload);
  const periodMonths = payload.period_months;
  const result = await pool.query(
    `INSERT INTO agent_view_reports (
      agent_id,
      start_date,
      end_date,
      period_months,
      listings_count,
      leads_count,
      viewings_count,
      sales_count,
      sales_amount,
      dev_count,
      new_join_count,
      reviews_count,
      agent_commission,
      referral_received_commission,
      total_commission,
      report_payload,
      created_by
    ) VALUES (
      $1, $2::date, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17
    )
    ON CONFLICT (agent_id, start_date, end_date)
    DO UPDATE SET
      period_months = EXCLUDED.period_months,
      listings_count = EXCLUDED.listings_count,
      leads_count = EXCLUDED.leads_count,
      viewings_count = EXCLUDED.viewings_count,
      sales_count = EXCLUDED.sales_count,
      sales_amount = EXCLUDED.sales_amount,
      dev_count = EXCLUDED.dev_count,
      new_join_count = EXCLUDED.new_join_count,
      reviews_count = EXCLUDED.reviews_count,
      agent_commission = EXCLUDED.agent_commission,
      referral_received_commission = EXCLUDED.referral_received_commission,
      total_commission = EXCLUDED.total_commission,
      report_payload = EXCLUDED.report_payload,
      created_by = COALESCE(agent_view_reports.created_by, EXCLUDED.created_by)
    RETURNING *`,
    [
      agentId,
      startDateStr,
      endDateStr,
      periodMonths,
      summary.listings_count || 0,
      summary.leads_count || 0,
      summary.viewings_count || 0,
      summary.sales_count || 0,
      summary.sales_amount || 0,
      summary.dev_count || 0,
      summary.new_join_count || 0,
      summary.reviews_count || 0,
      summary.agent_commission || 0,
      summary.referral_received_commission || 0,
      summary.total_commission || 0,
      savedPayload,
      createdBy
    ]
  );

  return parseReportPayload(result.rows[0]);
}

async function previewAgentViewReport(reportData = {}) {
  return buildAgentViewPayload(reportData);
}

async function getAllAgentViewReports(filters = {}) {
  await ensureAgentViewSchema();

  let query = `
    SELECT
      r.*,
      u.name AS agent_name,
      u.user_code AS agent_code,
      u.role AS agent_role
    FROM agent_view_reports r
    LEFT JOIN users u ON r.agent_id = u.id
    WHERE 1=1
  `;

  const values = [];
  let index = 1;

  if (filters.agent_id) {
    query += ` AND r.agent_id = $${index}`;
    values.push(filters.agent_id);
    index += 1;
  }

  const startDateFilter = filters.start_date || filters.date_from;
  const endDateFilter = filters.end_date || filters.date_to;

  if (startDateFilter) {
    query += ` AND r.start_date >= $${index}`;
    values.push(startDateFilter);
    index += 1;
  }

  if (endDateFilter) {
    query += ` AND r.end_date <= $${index}`;
    values.push(endDateFilter);
    index += 1;
  }

  query += ' ORDER BY r.start_date DESC, r.end_date DESC, u.name ASC';

  const result = await pool.query(query, values);
  return result.rows.map(parseReportPayload);
}

async function getAgentViewReportById(id) {
  await ensureAgentViewSchema();

  const result = await pool.query(
    `SELECT
      r.*,
      u.name AS agent_name,
      u.user_code AS agent_code,
      u.role AS agent_role
     FROM agent_view_reports r
     LEFT JOIN users u ON r.agent_id = u.id
     WHERE r.id = $1`,
    [id]
  );

  return parseReportPayload(result.rows[0] || null);
}

async function deleteAgentViewReport(id) {
  await ensureAgentViewSchema();
  const result = await pool.query(
    'DELETE FROM agent_view_reports WHERE id = $1 RETURNING *',
    [id]
  );

  return parseReportPayload(result.rows[0] || null);
}

module.exports = {
  createAgentViewReport,
  deleteAgentViewReport,
  getAllAgentViewReports,
  getAgentViewReportById,
  previewAgentViewReport
};
