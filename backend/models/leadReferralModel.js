// models/leadReferralModel.js
const pool = require('../config/db');

class LeadReferral {
  /**
   * Create a new lead referral record
   * @param {number} leadId - The lead ID
   * @param {number|null} agentId - The agent ID (for employee referrals) or null (for custom)
   * @param {string} name - The name of the referrer
   * @param {string} type - The type: 'employee' or 'custom'
   * @param {Date} referralDate - The date of the referral (defaults to now)
   * @returns {Promise<Object>} The created referral record
   */
  static async createReferral(leadId, agentId, name, type = 'employee', referralDate = new Date()) {
    const result = await pool.query(
      `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
      [leadId, agentId, name, type, referralDate]
    );
    return result.rows[0];
  }

  /**
   * Get all referrals for a specific lead
   * @param {number} leadId - The lead ID
   * @returns {Promise<Array>} Array of referral records with agent details
   */
  static async getReferralsByLeadId(leadId) {
    const result = await pool.query(
      `SELECT 
        lr.id,
        lr.lead_id,
        lr.agent_id,
        lr.name,
        lr.type,
        u.name as agent_name,
        u.role as agent_role,
        lr.referral_date,
        lr.external,
        lr.created_at,
        lr.updated_at
       FROM lead_referrals lr
       LEFT JOIN users u ON lr.agent_id = u.id
       WHERE lr.lead_id = $1
       ORDER BY lr.referral_date DESC`,
      [leadId]
    );
    return result.rows;
  }

  /**
   * Get all referrals made by a specific agent
   * @param {number} agentId - The agent ID
   * @returns {Promise<Array>} Array of referral records with lead details
   */
  static async getReferralsByAgentId(agentId) {
    const result = await pool.query(
      `SELECT 
        lr.id,
        lr.lead_id,
        l.customer_name,
        l.phone_number,
        l.status as lead_status,
        lr.agent_id,
        lr.referral_date,
        lr.external,
        lr.created_at,
        lr.updated_at
       FROM lead_referrals lr
       LEFT JOIN leads l ON lr.lead_id = l.id
       WHERE lr.agent_id = $1
       ORDER BY lr.referral_date DESC`,
      [agentId]
    );
    return result.rows;
  }

  /**
   * Mark a referral as external (no longer earning commission)
   * @param {number} referralId - The referral ID
   * @returns {Promise<Object>} The updated referral record
   */
  static async markAsExternal(referralId) {
    const result = await pool.query(
      `UPDATE lead_referrals 
       SET external = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [referralId]
    );
    return result.rows[0];
  }

  /**
   * Mark multiple referrals as external by lead ID and before a certain date
   * @param {number} leadId - The lead ID
   * @param {Date} beforeDate - Mark referrals before this date as external
   * @returns {Promise<Array>} The updated referral records
   */
  static async markReferralsAsExternalByDate(leadId, beforeDate) {
    const result = await pool.query(
      `UPDATE lead_referrals 
       SET external = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE lead_id = $1 
         AND referral_date < $2
         AND external = FALSE
       RETURNING *`,
      [leadId, beforeDate]
    );
    return result.rows;
  }

  /**
   * Get the most recent internal (active) referral for a lead
   * @param {number} leadId - The lead ID
   * @returns {Promise<Object|null>} The most recent internal referral or null
   */
  static async getMostRecentInternalReferral(leadId) {
    const result = await pool.query(
      `SELECT 
        lr.id,
        lr.lead_id,
        lr.agent_id,
        u.name as agent_name,
        lr.referral_date,
        lr.external,
        lr.created_at,
        lr.updated_at
       FROM lead_referrals lr
       LEFT JOIN users u ON lr.agent_id = u.id
       WHERE lr.lead_id = $1 
         AND lr.external = FALSE
       ORDER BY lr.referral_date DESC
       LIMIT 1`,
      [leadId]
    );
    return result.rows[0] || null;
  }

  /**
   * Process lead reassignment and handle referral logic
   * This is the core method that implements the 1-month external referral rule
   * 
   * @param {number} leadId - The lead ID
   * @param {number} newAgentId - The new agent ID being assigned
   * @param {number|null} previousAgentId - The previous agent ID (if any)
   * @returns {Promise<Object>} Object containing the new referral and any updated referrals
   */
  static async processLeadReassignment(leadId, newAgentId, previousAgentId = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = {
        newReferral: null,
        markedExternalReferrals: [],
        message: ''
      };

      // Get ALL internal (non-external) referrals for this lead
      const internalReferralsResult = await client.query(
        `SELECT id, agent_id, referral_date, external
         FROM lead_referrals
         WHERE lead_id = $1 AND external = FALSE
         ORDER BY referral_date DESC`,
        [leadId]
      );

      const internalReferrals = internalReferralsResult.rows;
      const currentTime = new Date();

      // Mark ALL referrals older than 30 days as external
      if (internalReferrals.length > 0) {
        console.log(`📊 Lead ${leadId} - Found ${internalReferrals.length} internal referral(s)`);
        
        for (const referral of internalReferrals) {
          const referralDate = new Date(referral.referral_date);
          const daysSinceReferral = (currentTime - referralDate) / (1000 * 60 * 60 * 24);
          
          console.log(`   Referral ${referral.id} - ${daysSinceReferral.toFixed(2)} days old`);
          
          // If more than 30 days (1 month), mark as external
          if (daysSinceReferral >= 30) {
            console.log(`   ⚠️ Marking referral ${referral.id} as external (>= 30 days)`);
            
            const markExternalResult = await client.query(
              `UPDATE lead_referrals 
               SET external = TRUE, updated_at = CURRENT_TIMESTAMP
               WHERE id = $1
               RETURNING *`,
              [referral.id]
            );
            
            result.markedExternalReferrals.push(markExternalResult.rows[0]);
          } else {
            console.log(`   ✅ Referral ${referral.id} remains internal (< 30 days)`);
          }
        }
        
        if (result.markedExternalReferrals.length > 0) {
          result.message = `Marked ${result.markedExternalReferrals.length} referral(s) as external (over 1 month old)`;
        } else {
          result.message = 'All previous referrals remain internal (within 1 month)';
        }
      } else {
        console.log(`✅ Lead ${leadId} - No existing internal referrals`);
        result.message = 'First referral for this lead';
      }

      // Create a new referral record for the new agent
      // Get the agent's name
      const agentNameResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [newAgentId]
      );
      const agentName = agentNameResult.rows[0]?.name || 'Unknown Agent';
      
      const newReferralResult = await client.query(
        `INSERT INTO lead_referrals (lead_id, agent_id, name, type, referral_date, external)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING *`,
        [leadId, newAgentId, agentName, 'employee', currentTime]
      );
      
      result.newReferral = newReferralResult.rows[0];
      
      await client.query('COMMIT');
      console.log(`✅ Lead ${leadId} - Referral processing complete`);
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error processing lead reassignment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply the 30-day external rule to all referrals for a lead
   * This checks all internal referrals and marks those older than 30 days from the most recent referral as external
   * 
   * @param {number} leadId - The lead ID
   * @returns {Promise<Object>} Object containing the number of referrals marked as external
   */
  static async applyExternalRuleToLeadReferrals(leadId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = {
        markedExternalReferrals: [],
        message: ''
      };

      // Get ALL referrals for this lead, ordered by date (newest first)
      const allReferralsResult = await client.query(
        `SELECT id, agent_id, name, type, referral_date, external
         FROM lead_referrals
         WHERE lead_id = $1
         ORDER BY referral_date DESC`,
        [leadId]
      );

      const allReferrals = allReferralsResult.rows;
      
      if (allReferrals.length === 0) {
        console.log(`📊 Lead ${leadId} - No referrals found`);
        result.message = 'No referrals to process';
        await client.query('COMMIT');
        return result;
      }

      // The most recent referral is always internal (stays false)
      const mostRecentReferral = allReferrals[0];
      const mostRecentDate = new Date(mostRecentReferral.referral_date);
      
      console.log(`📊 Lead ${leadId} - Processing ${allReferrals.length} referral(s)`);
      console.log(`   Most recent referral: ${mostRecentReferral.id} on ${mostRecentDate.toISOString()}`);

      // Check all other referrals against the most recent one
      for (let i = 1; i < allReferrals.length; i++) {
        const referral = allReferrals[i];
        const referralDate = new Date(referral.referral_date);
        const daysDifference = (mostRecentDate - referralDate) / (1000 * 60 * 60 * 24);
        
        console.log(`   Referral ${referral.id} - ${daysDifference.toFixed(2)} days before most recent`);
        
        // If this referral is more than 30 days older than the most recent one, mark as external
        if (daysDifference >= 30 && !referral.external) {
          console.log(`   ⚠️ Marking referral ${referral.id} as external (>= 30 days old)`);
          
          const markExternalResult = await client.query(
            `UPDATE lead_referrals 
             SET external = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [referral.id]
          );
          
          result.markedExternalReferrals.push(markExternalResult.rows[0]);
        } else if (referral.external && daysDifference < 30) {
          // If marked as external but within 30 days, mark back as internal
          console.log(`   ✅ Marking referral ${referral.id} back as internal (< 30 days)`);
          
          const markInternalResult = await client.query(
            `UPDATE lead_referrals 
             SET external = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [referral.id]
          );
        } else if (!referral.external) {
          console.log(`   ✅ Referral ${referral.id} remains internal (< 30 days)`);
        }
      }
      
      if (result.markedExternalReferrals.length > 0) {
        result.message = `Marked ${result.markedExternalReferrals.length} referral(s) as external (>= 30 days old)`;
      } else {
        result.message = 'All referrals are correctly marked based on 30-day rule';
      }
      
      await client.query('COMMIT');
      console.log(`✅ Lead ${leadId} - External rule application complete: ${result.message}`);
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error applying external rule to lead referrals:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a referral record
   * @param {number} referralId - The referral ID
   * @returns {Promise<Object>} The deleted referral record
   */
  static async deleteReferral(referralId) {
    const result = await pool.query(
      'DELETE FROM lead_referrals WHERE id = $1 RETURNING *',
      [referralId]
    );
    return result.rows[0];
  }

  /**
   * Get referral statistics for a specific agent
   * @param {number} agentId - The agent ID
   * @returns {Promise<Object>} Statistics about the agent's referrals
   */
  static async getReferralStats(agentId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN external = FALSE THEN 1 END) as internal_referrals,
        COUNT(CASE WHEN external = TRUE THEN 1 END) as external_referrals,
        MIN(referral_date) as first_referral_date,
        MAX(referral_date) as last_referral_date
       FROM lead_referrals
       WHERE agent_id = $1`,
      [agentId]
    );
    return result.rows[0];
  }
}

module.exports = LeadReferral;

