// backend/scripts/verify-report-accuracy.js
// Utility script to verify report accuracy by comparing report values with direct SQL queries

const pool = require('../config/db');
const Report = require('../models/reportsModel');

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

async function verifyReportAccuracy(reportId) {
  let warnings = [];
  try {
    console.log(`\n🔍 Verifying Report #${reportId}...\n`);

    const report = await Report.getReportById(reportId);
    if (!report) {
      console.error(`❌ Report #${reportId} not found`);
      return;
    }

    const { agent_id, start_date, end_date } = report;
    const startDateStr = start_date;
    const endDateStr = end_date;

    console.log(`📊 Report Details:`);
    console.log(`   Agent ID: ${agent_id}`);
    console.log(`   Date Range: ${startDateStr} to ${endDateStr}\n`);

    const issues = [];

    // 1. Verify Listings Count
    console.log('1️⃣  Verifying Listings Count...');
    const listingsQuery = await pool.query(
      `SELECT COUNT(*) as count 
       FROM properties 
       WHERE agent_id = $1 
       AND created_at >= $2::timestamp
       AND created_at <= $3::timestamp`,
      [agent_id, `${startDateStr} 00:00:00`, `${endDateStr} 23:59:59`]
    );
    const actualListings = parseInt(listingsQuery.rows[0].count, 10);
    const reportListings = report.listings_count || 0;

    if (actualListings !== reportListings) {
      issues.push(`Listings count mismatch: Report shows ${reportListings}, but SQL query shows ${actualListings}`);
      console.log(`   ❌ MISMATCH: Report=${reportListings}, SQL=${actualListings}`);
    } else {
      console.log(`   ✅ Match: ${reportListings} listings`);
    }

    // 2. Verify Sales Count and Amount
    console.log('\n2️⃣  Verifying Sales Count and Amount...');
    const salesQuery = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total_amount
       FROM properties 
       WHERE agent_id = $1 
       AND closed_date >= $2::date 
       AND closed_date <= $3::date
       AND status_id IN (
         SELECT id FROM statuses 
         WHERE LOWER(code) IN ('sold', 'rented', 'closed')
       )`,
      [agent_id, startDateStr, endDateStr]
    );
    const actualSalesCount = parseInt(salesQuery.rows[0].count, 10);
    const actualSalesAmount = parseFloat(salesQuery.rows[0].total_amount);
    const reportSalesCount = report.sales_count || 0;
    const reportSalesAmount = parseFloat(report.sales_amount || 0);

    if (actualSalesCount !== reportSalesCount) {
      issues.push(`Sales count mismatch: Report shows ${reportSalesCount}, but SQL query shows ${actualSalesCount}`);
      console.log(`   ❌ MISMATCH: Report=${reportSalesCount}, SQL=${actualSalesCount}`);
    } else {
      console.log(`   ✅ Sales count: ${reportSalesCount}`);
    }

    if (Math.abs(actualSalesAmount - reportSalesAmount) > 0.01) {
      issues.push(`Sales amount mismatch: Report shows ${reportSalesAmount}, but SQL query shows ${actualSalesAmount}`);
      console.log(`   ❌ MISMATCH: Report=$${reportSalesAmount}, SQL=$${actualSalesAmount}`);
    } else {
      console.log(`   ✅ Sales amount: $${reportSalesAmount.toFixed(2)}`);
    }

    // 3. Verify Viewings Count
    console.log('\n3️⃣  Verifying Viewings Count...');
    const viewingsQuery = await pool.query(
      `SELECT COUNT(*) as count 
       FROM viewings 
       WHERE agent_id = $1 
       AND viewing_date >= $2::date 
       AND viewing_date <= $3::date`,
      [agent_id, startDateStr, endDateStr]
    );
    const actualViewings = parseInt(viewingsQuery.rows[0].count, 10);
    const reportViewings = report.viewings_count || 0;

    if (actualViewings !== reportViewings) {
      issues.push(`Viewings count mismatch: Report shows ${reportViewings}, but SQL query shows ${actualViewings}`);
      console.log(`   ❌ MISMATCH: Report=${reportViewings}, SQL=${actualViewings}`);
    } else {
      console.log(`   ✅ Viewings: ${reportViewings}`);
    }

    // 4. Verify Lead Sources
    console.log('\n4️⃣  Verifying Lead Sources...');
    const leadsQuery = await pool.query(
      `SELECT rs.source_name, COUNT(*) as count
       FROM leads l
       LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
       WHERE l.agent_id = $1 
       AND DATE(l.date) >= $2::date 
       AND DATE(l.date) <= $3::date
       GROUP BY rs.source_name`,
      [agent_id, startDateStr, endDateStr]
    );

    const reportLeadSources = report.lead_sources || {};
    const actualLeadSources = {};
    leadsQuery.rows.forEach(row => {
      const sourceName = row.source_name || 'Unknown';
      actualLeadSources[sourceName] = parseInt(row.count, 10);
    });

    const allSources = new Set([
      ...Object.keys(reportLeadSources),
      ...Object.keys(actualLeadSources)
    ]);

    let leadSourcesMatch = true;
    for (const source of allSources) {
      const reportCount = reportLeadSources[source] || 0;
      const actualCount = actualLeadSources[source] || 0;
      if (reportCount !== actualCount) {
        leadSourcesMatch = false;
        issues.push(`Lead source "${source}" mismatch: Report shows ${reportCount}, but SQL query shows ${actualCount}`);
        console.log(`   ❌ "${source}": Report=${reportCount}, SQL=${actualCount}`);
      }
    }

    if (leadSourcesMatch) {
      console.log('   ✅ Lead sources match');
    }

    // 5. Verify commission totals are internally consistent.
    console.log('\n5️⃣  Verifying Commission Totals...');
    const reportAgentCommission = parseFloat(report.agent_commission || 0);
    const reportFindersCommission = parseFloat(report.finders_commission || 0);
    const reportReferralCommission = parseFloat(report.referral_commission || 0);
    const reportTeamLeaderCommission = parseFloat(report.team_leader_commission || 0);
    const reportAdministrationCommission = parseFloat(report.administration_commission || 0);
    const reportReferralsOnPropertiesCommission = parseFloat(report.referrals_on_properties_commission || 0);
    const reportTotal = parseFloat(report.total_commission || 0);

    const calculatedTotal = roundMoney(
      reportAgentCommission +
      reportFindersCommission +
      reportReferralCommission +
      reportTeamLeaderCommission +
      reportAdministrationCommission +
      reportReferralsOnPropertiesCommission
    );

    if (Math.abs(calculatedTotal - reportTotal) > 0.01) {
      issues.push(`Total commission mismatch: Report shows ${reportTotal}, but sum of individual commissions is ${calculatedTotal}`);
      console.log(`   ❌ MISMATCH: Report=$${reportTotal}, Calculated=$${calculatedTotal}`);
    } else {
      console.log(`   ✅ Total commission: $${reportTotal.toFixed(2)}`);
    }

    // 6. Verify manual referral commission fields
    console.log('\n6️⃣  Verifying Manual Referral Commission Fields...');
    console.log(`   Referral received count: ${parseInt(report.referral_received_count || 0, 10)}`);
    console.log(`   Referral received commission: $${parseFloat(report.referral_received_commission || 0).toFixed(2)}`);
    console.log(`   Referrals on properties count: ${parseInt(report.referrals_on_properties_count || 0, 10)}`);
    console.log(`   Referrals on properties commission: $${parseFloat(report.referrals_on_properties_commission || 0).toFixed(2)}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    if (issues.length === 0) {
      console.log('✅ REPORT VERIFICATION PASSED - All values match SQL queries!');
    } else {
      console.log(`❌ REPORT VERIFICATION FAILED - Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`);
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    return {
      reportId,
      passed: issues.length === 0,
      issues,
      warnings
    };

  } catch (error) {
    console.error(`❌ Error verifying report #${reportId}:`, error);
    return {
      reportId,
      passed: false,
      issues: [error.message],
      warnings: []
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const reportId = parseInt(process.argv[2], 10);
  if (!reportId) {
    console.error('Usage: node verify-report-accuracy.js <report-id>');
    process.exit(1);
  }

  verifyReportAccuracy(reportId)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { verifyReportAccuracy };
