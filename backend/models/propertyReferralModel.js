// models/propertyReferralModel.js
const pool = require('../config/db');

class PropertyReferral {
  /**
   * Create a new property referral record
   * @param {number} propertyId - The property ID
   * @param {number|null} employeeId - The employee ID (for employee referrals) or null (for custom)
   * @param {string} name - The name of the referrer
   * @param {string} type - The type: 'employee' or 'custom'
   * @param {Date} date - The date of the referral
   * @returns {Promise<Object>} The created referral record
   */
  static async createReferral(propertyId, employeeId, name, type = 'employee', date = new Date()) {
    const result = await pool.query(
      `INSERT INTO referrals (property_id, employee_id, name, type, date, external)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
      [propertyId, employeeId, name, type, date]
    );
    return result.rows[0];
  }

  /**
   * Get all referrals for a specific property
   * @param {number} propertyId - The property ID
   * @returns {Promise<Array>} Array of referral records with employee details
   */
  static async getReferralsByPropertyId(propertyId) {
    const result = await pool.query(
      `SELECT 
        r.id,
        r.property_id,
        r.employee_id,
        r.name,
        r.type,
        u.name as employee_name,
        u.role as employee_role,
        r.date,
        r.external,
        r.created_at,
        r.updated_at
       FROM referrals r
       LEFT JOIN users u ON r.employee_id = u.id
       WHERE r.property_id = $1
       ORDER BY r.date DESC`,
      [propertyId]
    );
    return result.rows;
  }

  /**
   * Get all referrals made by a specific employee
   * @param {number} employeeId - The employee ID
   * @returns {Promise<Array>} Array of referral records with property details
   */
  static async getReferralsByEmployeeId(employeeId) {
    const result = await pool.query(
      `SELECT 
        r.id,
        r.property_id,
        p.reference_number,
        p.location,
        p.property_type,
        p.price,
        p.status_id,
        s.name as status_name,
        r.employee_id,
        r.date,
        r.external,
        r.created_at,
        r.updated_at
       FROM referrals r
       LEFT JOIN properties p ON r.property_id = p.id
       LEFT JOIN statuses s ON p.status_id = s.id
       WHERE r.employee_id = $1
       ORDER BY r.date DESC`,
      [employeeId]
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
      `UPDATE referrals 
       SET external = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [referralId]
    );
    return result.rows[0];
  }

  /**
   * Mark multiple referrals as external by property ID and before a certain date
   * @param {number} propertyId - The property ID
   * @param {Date} beforeDate - Mark referrals before this date as external
   * @returns {Promise<Array>} The updated referral records
   */
  static async markReferralsAsExternalByDate(propertyId, beforeDate) {
    const result = await pool.query(
      `UPDATE referrals 
       SET external = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE property_id = $1 
         AND date < $2
         AND external = FALSE
       RETURNING *`,
      [propertyId, beforeDate]
    );
    return result.rows;
  }

  /**
   * Get the most recent internal (active) referral for a property
   * @param {number} propertyId - The property ID
   * @returns {Promise<Object|null>} The most recent internal referral or null
   */
  static async getMostRecentInternalReferral(propertyId) {
    const result = await pool.query(
      `SELECT 
        r.id,
        r.property_id,
        r.employee_id,
        u.name as employee_name,
        r.date,
        r.external,
        r.created_at,
        r.updated_at
       FROM referrals r
       LEFT JOIN users u ON r.employee_id = u.id
       WHERE r.property_id = $1 
         AND r.external = FALSE
       ORDER BY r.date DESC
       LIMIT 1`,
      [propertyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Process property reassignment and handle referral logic
   * This is the core method that implements the 1-month external referral rule
   * 
   * @param {number} propertyId - The property ID
   * @param {number} newEmployeeId - The new employee ID being assigned
   * @param {number|null} previousEmployeeId - The previous employee ID (if any)
   * @returns {Promise<Object>} Object containing the new referral and any updated referrals
   */
  static async processPropertyReassignment(propertyId, newEmployeeId, previousEmployeeId = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = {
        newReferral: null,
        markedExternalReferrals: [],
        message: ''
      };

      // Get ALL internal (non-external) referrals for this property
      const internalReferralsResult = await client.query(
        `SELECT id, employee_id, date, external
         FROM referrals
         WHERE property_id = $1 AND external = FALSE
         ORDER BY date DESC`,
        [propertyId]
      );

      const internalReferrals = internalReferralsResult.rows;
      const currentTime = new Date();

      // Mark ALL referrals older than 30 days as external
      if (internalReferrals.length > 0) {
        console.log(`📊 Property ${propertyId} - Found ${internalReferrals.length} internal referral(s)`);
        
        for (const referral of internalReferrals) {
          const referralDate = new Date(referral.date);
          const daysSinceReferral = (currentTime - referralDate) / (1000 * 60 * 60 * 24);
          
          console.log(`   Referral ${referral.id} - ${daysSinceReferral.toFixed(2)} days old`);
          
          // If more than 30 days (1 month), mark as external
          if (daysSinceReferral >= 30) {
            console.log(`   ⚠️ Marking referral ${referral.id} as external (>= 30 days)`);
            
            const markExternalResult = await client.query(
              `UPDATE referrals 
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
        console.log(`✅ Property ${propertyId} - No existing internal referrals`);
        result.message = 'First referral for this property';
      }

      // Create a new referral record for the new employee
      // Get the employee's name
      const employeeNameResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [newEmployeeId]
      );
      const employeeName = employeeNameResult.rows[0]?.name || 'Unknown Employee';
      
      const newReferralResult = await client.query(
        `INSERT INTO referrals (property_id, employee_id, name, type, date, external)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING *`,
        [propertyId, newEmployeeId, employeeName, 'employee', currentTime]
      );
      
      result.newReferral = newReferralResult.rows[0];
      
      await client.query('COMMIT');
      console.log(`✅ Property ${propertyId} - Referral processing complete`);
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error processing property reassignment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply the 30-day external rule to all referrals for a property
   * This checks all internal referrals and marks those older than 30 days from the most recent referral as external
   * 
   * @param {number} propertyId - The property ID
   * @returns {Promise<Object>} Object containing the number of referrals marked as external
   */
  static async applyExternalRuleToPropertyReferrals(propertyId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = {
        markedExternalReferrals: [],
        message: ''
      };

      // Get ALL referrals for this property, ordered by date (newest first)
      const allReferralsResult = await client.query(
        `SELECT id, employee_id, name, type, date, external
         FROM referrals
         WHERE property_id = $1
         ORDER BY date DESC`,
        [propertyId]
      );

      const allReferrals = allReferralsResult.rows;
      
      if (allReferrals.length === 0) {
        console.log(`📊 Property ${propertyId} - No referrals found`);
        result.message = 'No referrals to process';
        await client.query('COMMIT');
        return result;
      }

      // The most recent referral is always internal (stays false)
      const mostRecentReferral = allReferrals[0];
      const mostRecentDate = new Date(mostRecentReferral.date);
      
      console.log(`📊 Property ${propertyId} - Processing ${allReferrals.length} referral(s)`);
      console.log(`   Most recent referral: ${mostRecentReferral.id} on ${mostRecentDate.toISOString()}`);

      // Check all other referrals against the most recent one
      for (let i = 1; i < allReferrals.length; i++) {
        const referral = allReferrals[i];
        const referralDate = new Date(referral.date);
        const daysDifference = (mostRecentDate - referralDate) / (1000 * 60 * 60 * 24);
        
        console.log(`   Referral ${referral.id} - ${daysDifference.toFixed(2)} days before most recent`);
        
        // If this referral is more than 30 days older than the most recent one, mark as external
        if (daysDifference >= 30 && !referral.external) {
          console.log(`   ⚠️ Marking referral ${referral.id} as external (>= 30 days old)`);
          
          const markExternalResult = await client.query(
            `UPDATE referrals 
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
            `UPDATE referrals 
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
      console.log(`✅ Property ${propertyId} - External rule application complete: ${result.message}`);
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error applying external rule to property referrals:', error);
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
      'DELETE FROM referrals WHERE id = $1 RETURNING *',
      [referralId]
    );
    return result.rows[0];
  }

  /**
   * Get referral statistics for a specific employee
   * @param {number} employeeId - The employee ID
   * @returns {Promise<Object>} Statistics about the employee's referrals
   */
  static async getReferralStats(employeeId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN external = FALSE THEN 1 END) as internal_referrals,
        COUNT(CASE WHEN external = TRUE THEN 1 END) as external_referrals,
        MIN(date) as first_referral_date,
        MAX(date) as last_referral_date
       FROM referrals
       WHERE employee_id = $1`,
      [employeeId]
    );
    return result.rows[0];
  }
}

module.exports = PropertyReferral;

