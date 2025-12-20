// backend/scripts/verify-report-accuracy.js
// Utility script to verify report accuracy by comparing report values with direct SQL queries

const pool = require('../config/db');
const Report = require('../models/reportsModel');

/**
 * Verify a report's accuracy by comparing it with direct SQL queries
 * @param {number} reportId - The report ID to verify
 */
async function verifyReportAccuracy(reportId) {
  try {
    console.log(`\n🔍 Verifying Report #${reportId}...\n`);

    // Get the report
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
    const warnings = [];

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
    const actualListings = parseInt(listingsQuery.rows[0].count);
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
    const actualSalesCount = parseInt(salesQuery.rows[0].count);
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
    const actualViewings = parseInt(viewingsQuery.rows[0].count);
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
      actualLeadSources[sourceName] = parseInt(row.count);
    });

    // Compare lead sources
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
      console.log(`   ✅ Lead sources match`);
    }

    // 5. Verify Commission Calculations
    console.log('\n5️⃣  Verifying Commission Calculations...');
    
    // Get commission settings
    const commissionsResult = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings 
       WHERE setting_key IN ('commission_agent_percentage', 'commission_finders_percentage', 
                             'commission_referral_internal_percentage', 'commission_referral_external_percentage',
                             'commission_team_leader_percentage', 'commission_administration_percentage')`
    );
    
    const commissions = {};
    commissionsResult.rows.forEach(row => {
      const key = row.setting_key.replace('commission_', '').replace('_percentage', '');
      commissions[key] = parseFloat(row.setting_value) || 0;
    });

    // Use defaults if settings missing
    const agentRate = commissions.agent || 2;
    const findersRate = commissions.finders || 1;
    const referralInternalRate = commissions.referral_internal || 0.5;
    const referralExternalRate = commissions.referral_external || 2;
    const teamLeaderRate = commissions.team_leader || 1;
    const adminRate = commissions.administration || 4;

    // Calculate expected commissions
    const expectedAgentCommission = Math.round((reportSalesAmount * agentRate / 100) * 100) / 100;
    const expectedFindersCommission = Math.round((reportSalesAmount * findersRate / 100) * 100) / 100;
    const expectedReferralCommission = Math.round((reportSalesAmount * referralInternalRate / 100) * 100) / 100;
    const expectedTeamLeaderCommission = Math.round((reportSalesAmount * teamLeaderRate / 100) * 100) / 100;
    const expectedAdminCommission = Math.round((reportSalesAmount * adminRate / 100) * 100) / 100;

    // Compare commissions
    const commissionChecks = [
      { name: 'Agent', report: parseFloat(report.agent_commission || 0), expected: expectedAgentCommission, rate: agentRate },
      { name: 'Finders', report: parseFloat(report.finders_commission || 0), expected: expectedFindersCommission, rate: findersRate },
      { name: 'Referral', report: parseFloat(report.referral_commission || 0), expected: expectedReferralCommission, rate: referralInternalRate },
      { name: 'Team Leader', report: parseFloat(report.team_leader_commission || 0), expected: expectedTeamLeaderCommission, rate: teamLeaderRate },
      { name: 'Administration', report: parseFloat(report.administration_commission || 0), expected: expectedAdminCommission, rate: adminRate }
    ];

    commissionChecks.forEach(check => {
      if (Math.abs(check.report - check.expected) > 0.01) {
        issues.push(`${check.name} commission mismatch: Report shows ${check.report}, expected ${check.expected} (${check.rate}% of $${reportSalesAmount})`);
        console.log(`   ❌ ${check.name}: Report=$${check.report}, Expected=$${check.expected} (${check.rate}%)`);
      } else {
        console.log(`   ✅ ${check.name}: $${check.report.toFixed(2)} (${check.rate}%)`);
      }
    });

    // 6. Verify Total Commission
    console.log('\n6️⃣  Verifying Total Commission...');
    const calculatedTotal = 
      parseFloat(report.agent_commission || 0) +
      parseFloat(report.finders_commission || 0) +
      parseFloat(report.referral_commission || 0) +
      parseFloat(report.team_leader_commission || 0) +
      parseFloat(report.administration_commission || 0) +
      parseFloat(report.referrals_on_properties_commission || 0);
    
    const reportTotal = parseFloat(report.total_commission || 0);
    
    if (Math.abs(calculatedTotal - reportTotal) > 0.01) {
      issues.push(`Total commission mismatch: Report shows ${reportTotal}, but sum of individual commissions is ${calculatedTotal}`);
      console.log(`   ❌ MISMATCH: Report=$${reportTotal}, Calculated=$${calculatedTotal}`);
    } else {
      console.log(`   ✅ Total commission: $${reportTotal.toFixed(2)}`);
    }

    // 7. Verify Referral Received Commission
    console.log('\n7️⃣  Verifying Referral Received Commission...');
    const propertyReferralsQuery = await pool.query(
      `SELECT 
         COUNT(DISTINCT p.id) as count,
         COALESCE(SUM(
           CASE 
             WHEN (r.external = TRUE) THEN p.price * $4 / 100
             ELSE p.price * $5 / 100
           END
         ), 0) as total_commission,
         COALESCE(SUM(p.price), 0) as total_amount
       FROM properties p
       INNER JOIN referrals r ON p.id = r.property_id
       WHERE r.employee_id = $1 
       AND p.closed_date >= $2::date 
       AND p.closed_date <= $3::date
       AND p.status_id IN (
         SELECT id FROM statuses 
         WHERE LOWER(code) IN ('sold', 'rented', 'closed')
       )`,
      [agent_id, startDateStr, endDateStr, referralExternalRate, referralInternalRate]
    );

    // Check for lead_referrals table
    let leadReferralsQuery;
    try {
      leadReferralsQuery = await pool.query(
        `SELECT 
           COUNT(DISTINCT p.id) as count,
           COALESCE(SUM(
             CASE 
               WHEN (lr.external = TRUE) THEN p.price * $4 / 100
               ELSE p.price * $5 / 100
             END
           ), 0) as total_commission,
           COALESCE(SUM(p.price), 0) as total_amount
         FROM properties p
         INNER JOIN leads l ON p.owner_id = l.id
         INNER JOIN lead_referrals lr ON l.id = lr.lead_id
         WHERE lr.agent_id = $1 
         AND p.closed_date >= $2::date 
         AND p.closed_date <= $3::date
         AND p.status_id IN (
           SELECT id FROM statuses 
           WHERE LOWER(code) IN ('sold', 'rented', 'closed')
         )`,
        [agent_id, startDateStr, endDateStr, referralExternalRate, referralInternalRate]
      );
    } catch (error) {
      // lead_referrals table might not exist
      leadReferralsQuery = { rows: [{ count: 0, total_commission: 0, total_amount: 0 }] };
    }

    const propertyReferralCount = parseInt(propertyReferralsQuery.rows[0].count) || 0;
    const propertyReferralCommission = Math.round(parseFloat(propertyReferralsQuery.rows[0].total_commission || 0) * 100) / 100;
    
    const leadReferralCount = parseInt(leadReferralsQuery.rows[0].count) || 0;
    const leadReferralCommission = Math.round(parseFloat(leadReferralsQuery.rows[0].total_commission || 0) * 100) / 100;

    const expectedReferralReceivedCount = propertyReferralCount + leadReferralCount;
    const expectedReferralReceivedCommission = propertyReferralCommission + leadReferralCommission;

    const reportReferralCount = report.referral_received_count || 0;
    const reportReferralCommission = parseFloat(report.referral_received_commission || 0);

    if (expectedReferralReceivedCount !== reportReferralCount) {
      issues.push(`Referral received count mismatch: Report shows ${reportReferralCount}, but SQL query shows ${expectedReferralReceivedCount}`);
      console.log(`   ❌ Count MISMATCH: Report=${reportReferralCount}, SQL=${expectedReferralReceivedCount}`);
    } else {
      console.log(`   ✅ Referral count: ${reportReferralCount}`);
    }

    if (Math.abs(expectedReferralReceivedCommission - reportReferralCommission) > 0.01) {
      issues.push(`Referral received commission mismatch: Report shows ${reportReferralCommission}, but SQL query shows ${expectedReferralReceivedCommission}`);
      console.log(`   ❌ Commission MISMATCH: Report=$${reportReferralCommission}, SQL=$${expectedReferralReceivedCommission}`);
    } else {
      console.log(`   ✅ Referral commission: $${reportReferralCommission.toFixed(2)}`);
    }

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
    console.log('='.repeat(60) + '\n');

    return {
      reportId,
      passed: issues.length === 0,
      issues,
      warnings
    };

  } catch (error) {
    console.error('❌ Error verifying report:', error);
    throw error;
  }
}

/**
 * Verify all reports for a specific agent
 * @param {number} agentId - The agent ID
 */
async function verifyAllAgentReports(agentId) {
  try {
    const reports = await Report.getAllReports({ agent_id: agentId });
    console.log(`\n📊 Found ${reports.length} report(s) for agent ${agentId}\n`);

    const results = [];
    for (const report of reports) {
      const result = await verifyReportAccuracy(report.id);
      results.push(result);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('\n' + '='.repeat(60));
    console.log(`📈 SUMMARY: ${passed} passed, ${failed} failed out of ${reports.length} reports`);
    console.log('='.repeat(60) + '\n');

    return results;
  } catch (error) {
    console.error('❌ Error verifying agent reports:', error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node verify-report-accuracy.js <reportId>     - Verify a specific report');
    console.log('  node verify-report-accuracy.js --agent <agentId> - Verify all reports for an agent');
    process.exit(1);
  }

  if (args[0] === '--agent' && args[1]) {
    const agentId = parseInt(args[1]);
    verifyAllAgentReports(agentId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    const reportId = parseInt(args[0]);
    verifyReportAccuracy(reportId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = {
  verifyReportAccuracy,
  verifyAllAgentReports
};



















