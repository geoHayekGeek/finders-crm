// controllers/leadsController.js
const Lead = require('../models/leadsModel');
const LeadReferral = require('../models/leadReferralModel');
const Notification = require('../models/notificationModel');
const LeadNote = require('../models/leadNotesModel');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const logger = require('../utils/logger');
const { normalizeRole } = require('../utils/roleUtils');
const leadsImportService = require('../services/leadsImport');

class LeadsController {
  // Get all leads (with role-based filtering applied by middleware)
  static async getAllLeads(req, res) {
    try {
      logger.debug('Getting all leads', {
        userId: req.user?.id,
        userRole: req.user?.role
      });
      
      const normalizedRole = normalizeRole(req.user.role);

      let leads = await Lead.getLeadsForAgent(req.user.id, normalizedRole);
      
      // Filter data for agents and team leaders
      if (['agent', 'team leader'].includes(normalizedRole)) {
        leads = leads.map(lead => ({
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          added_by_id: lead.added_by_id,
          added_by_name: lead.added_by_name,
          added_by_role: lead.added_by_role,
          reference_source_id: lead.reference_source_id,
          reference_source_name: lead.reference_source_name,
          price: lead.price,
          status: lead.status,
          status_can_be_referred: lead.status_can_be_referred,
          created_at: lead.created_at,
          updated_at: lead.updated_at
        }));
      }
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} leads`,
        userRole: req.user.role // Include role so frontend knows permission level
      });
    } catch (error) {
      logger.error('Error getting leads', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leads',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get leads with filters (with role-based filtering applied by middleware)
  static async getLeadsWithFilters(req, res) {
    try {
      logger.debug('Getting filtered leads', {
        userId: req.user?.id,
        userRole: req.user?.role,
        filterCount: Object.keys(req.query).length
      });
      
      let leads;
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      const userId = req.user.id;
      
      if (normalizedRole === 'agent') {
        logger.debug('Agent user - complex filtering logic', { userId });
        // Agents see leads assigned to them or that they referred, with filters
        leads = await Lead.getLeadsAssignedOrReferredByAgent(userId);
        logger.debug('Agent leads before filtering', { count: leads.length });
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredLeads = await Lead.getLeadsWithFilters(req.query);
          logger.debug('Filtered leads from query', { count: filteredLeads.length });
          // Filter the agent's leads by the query results
          leads = leads.filter(lead => 
            filteredLeads.some(filtered => filtered.id === lead.id)
          );
          logger.debug('Final agent leads after filtering', { count: leads.length });
        }
      } else {
        logger.debug('Admin/Manager/Operations user - direct filtering');
        // Admins, operations managers, operations, and agent managers see all leads with filters
        leads = await Lead.getLeadsWithFilters(req.query);
      }
      
      logger.debug('Final leads count', { count: leads.length });
      
      // Filter data for agents and team leaders
      if (['agent', 'team leader'].includes(normalizedRole)) {
        leads = leads.map(lead => ({
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          added_by_id: lead.added_by_id,
          added_by_name: lead.added_by_name,
          added_by_role: lead.added_by_role,
          reference_source_id: lead.reference_source_id,
          reference_source_name: lead.reference_source_name,
          price: lead.price,
          status: lead.status,
          status_can_be_referred: lead.status_can_be_referred,
          created_at: lead.created_at,
          updated_at: lead.updated_at
        }));
      }
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} filtered leads`,
        userRole: req.user.role
      });
    } catch (error) {
      logger.error('Error getting filtered leads', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve filtered leads',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get single lead by ID
  static async getLeadById(req, res) {
    try {
      const { id } = req.params;
      let lead = await Lead.getLeadById(id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check if user has permission to view this lead
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access to lead data
      if (['admin', 'operations', 'operations manager', 'agent manager'].includes(normalizedRole)) {
        // Full access
      } else if (normalizedRole === 'agent' && lead.agent_id !== userId) {
        // Agents can only view leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lead'
        });
      } else if (normalizedRole === 'team leader') {
        // Team leaders can view their own leads and their team's leads
        if (lead.agent_id !== userId) {
          // Check if the lead belongs to an agent under this team leader
          const teamAgentCheck = await pool.query(
            `SELECT 1 FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, lead.agent_id]
          );
          
          if (teamAgentCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You do not have permission to view this lead'
            });
          }
        }
      } else if (['agent', 'team_leader'].includes(normalizedRole)) {
        lead = {
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          price: lead.price,
          status: lead.status,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          referrals: lead.referrals || [] // Include referrals so agents and team leaders can see referral history
        };
      }
      
      res.json({
        success: true,
        data: lead,
        userRole: userRole
      });
    } catch (error) {
      logger.error('Error getting lead by ID', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Create new lead
  static async createLead(req, res) {
    try {
      // All validation is now handled by middleware
      // Set added_by_id to the current user (person who added the lead)
      let leadData = { ...req.body };
      // For agents and team leaders, always set added_by_id to themselves
      // For admin/operations, use provided added_by_id or default to current user
      if (['agent', 'team leader'].includes(normalizeRole(req.user.role))) {
        leadData.added_by_id = req.user.id;
      } else if (!leadData.added_by_id) {
        // For other roles, default to current user if not provided
        leadData.added_by_id = req.user.id;
      }

      const newLead = await Lead.createLead(leadData);
      
      // Audit log: Lead created
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Lead created', {
        leadId: newLead.id,
        customerName: newLead.customer_name,
        phoneNumber: newLead.phone_number ? '***' : null, // Mask sensitive data
        agentId: newLead.agent_id,
        status: newLead.status,
        price: newLead.price,
        createdBy: req.user.id,
        createdByName: req.user.name,
        referralCount: req.body.referrals?.length || 0,
        ip: clientIP
      });

      // Process manual referrals from the form
      if (req.body.referrals && Array.isArray(req.body.referrals) && req.body.referrals.length > 0) {
        try {
          logger.debug('Processing manual referrals', {
            leadId: newLead.id,
            referralCount: req.body.referrals.length
          });
          for (const referral of req.body.referrals) {
            if (referral.type === 'employee' && referral.employee_id && referral.date) {
              // Get agent name for employee referral
              const agentResult = await pool.query('SELECT name FROM users WHERE id = $1', [referral.employee_id]);
              const agentName = agentResult.rows[0]?.name || referral.name || 'Unknown Agent';
              await LeadReferral.createReferral(newLead.id, referral.employee_id, agentName, 'employee', new Date(referral.date));
              logger.debug('Added employee referral', {
                leadId: newLead.id,
                agentId: referral.employee_id
              });
            } else if (referral.type === 'custom' && referral.name && referral.date) {
              // Custom referrals don't have agent_id
              await LeadReferral.createReferral(newLead.id, null, referral.name, 'custom', new Date(referral.date));
              logger.debug('Added custom referral', {
                leadId: newLead.id,
                referralName: referral.name
              });
            }
          }
          
          // Apply the 30-day external rule to all referrals for this lead
          logger.debug('Applying 30-day external rule to lead referrals', {
            leadId: newLead.id
          });
          const ruleResult = await LeadReferral.applyExternalRuleToLeadReferrals(newLead.id);
          logger.debug('External rule applied', {
            leadId: newLead.id,
            markedExternal: ruleResult.markedExternalReferrals.length
          });
        } catch (referralError) {
          logger.error('Error creating manual referrals', referralError);
          // Don't fail the lead creation if referral tracking fails
        }
      }

      // Create notifications for relevant users
      try {
        await Notification.createLeadNotification(
          newLead.id,
          'created',
          {
            customer_name: newLead.customer_name,
            phone_number: newLead.phone_number,
            status: newLead.status
          },
          req.user.id
        );

        // If an agent is assigned, create a specific "Lead Assigned" notification for them
        if (newLead.agent_id && newLead.agent_id !== req.user.id) {
          await Notification.createLeadAssignmentNotification(
            newLead.id,
            newLead.agent_id,
            {
              customer_name: newLead.customer_name,
              phone_number: newLead.phone_number
            }
          );
        }
      } catch (notificationError) {
        logger.error('Error creating lead notifications', notificationError);
        // Don't fail the lead creation if notifications fail
      }
      
      // Fetch the complete lead with all relationships including referrals
      const completeLeadData = await Lead.getLeadById(newLead.id);
      
      res.status(201).json({
        success: true,
        data: completeLeadData,
        message: 'Lead created successfully'
      });
    } catch (error) {
      logger.error('Error creating lead', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update lead
  static async updateLead(req, res) {
    try {
      const { id } = req.params;
      
      // Check if lead exists and user has permission
      const existingLead = await Lead.getLeadById(id);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access
      if (['admin', 'operations', 'operations manager', 'agent manager'].includes(normalizedRole)) {
        // Full access - no restrictions
      } else if (normalizedRole === 'agent' && existingLead.agent_id !== userId) {
        // Agents can only update leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this lead'
        });
      } else if (normalizedRole === 'team leader') {
        // Team leaders can update their own leads and their team's leads
        if (existingLead.agent_id !== userId) {
          // Check if the lead belongs to an agent under this team leader
          const teamAgentCheck = await pool.query(
            `SELECT 1 FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, existingLead.agent_id]
          );
          
          if (teamAgentCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You do not have permission to update this lead'
            });
          }
        }
      }

      const updatedLead = await Lead.updateLead(id, req.body);
      
      if (!updatedLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Handle referral tracking when agent assignment changes
      if (req.body.agent_id && req.body.agent_id !== existingLead.agent_id) {
        try {
          logger.debug('Lead agent reassignment detected', {
            leadId: id,
            previousAgentId: existingLead.agent_id,
            newAgentId: req.body.agent_id
          });
          
          // Process the referral reassignment with the 1-month external logic
          const referralResult = await LeadReferral.processLeadReassignment(
            parseInt(id),
            req.body.agent_id,
            existingLead.agent_id
          );
          
          logger.debug('Referral processing result', {
            leadId: id,
            markedExternal: referralResult.markedExternalReferrals.length
          });
        } catch (referralError) {
          logger.error('Error processing lead referral reassignment', referralError);
          // Don't fail the lead update if referral tracking fails
        }
      }

      // Handle manual referrals from the form (if provided)
      if (req.body.referrals && Array.isArray(req.body.referrals)) {
        try {
          logger.debug('Processing manual referrals for lead update', {
            leadId: id,
            referralCount: req.body.referrals.length
          });
          
          // Get existing referrals
          const existingReferrals = await LeadReferral.getReferralsByLeadId(parseInt(id));
          logger.debug('Found existing referrals to delete', {
            leadId: id,
            count: existingReferrals.length
          });
          
          // Delete all existing manual referrals (we'll recreate from the form data)
          for (const existingRef of existingReferrals) {
            await LeadReferral.deleteReferral(existingRef.id);
          }
          
          // Create new referrals from form data
          for (const referral of req.body.referrals) {
            if (referral.type === 'employee' && referral.employee_id && referral.date) {
              // Get agent name for employee referral
              const agentResult = await pool.query('SELECT name FROM users WHERE id = $1', [referral.employee_id]);
              const agentName = agentResult.rows[0]?.name || referral.name || 'Unknown Agent';
              await LeadReferral.createReferral(parseInt(id), referral.employee_id, agentName, 'employee', new Date(referral.date));
              logger.debug('Added employee referral', {
                leadId: id,
                agentId: referral.employee_id
              });
            } else if (referral.type === 'custom' && referral.name && referral.date) {
              // Custom referrals don't have agent_id
              await LeadReferral.createReferral(parseInt(id), null, referral.name, 'custom', new Date(referral.date));
              logger.debug('Added custom referral', {
                leadId: id,
                referralName: referral.name
              });
            }
          }
          
          // Apply the 30-day external rule to all referrals for this lead
          logger.debug('Applying 30-day external rule to lead referrals', {
            leadId: id
          });
          const ruleResult = await LeadReferral.applyExternalRuleToLeadReferrals(parseInt(id));
          logger.debug('External rule applied', {
            leadId: id,
            markedExternal: ruleResult.markedExternalReferrals.length
          });
        } catch (referralError) {
          logger.error('Error updating manual referrals', referralError);
          // Don't fail the lead update if referral tracking fails
        }
      }

      // Create notifications for relevant users
      try {
        const notificationData = {
          customer_name: updatedLead.customer_name,
          phone_number: updatedLead.phone_number,
          status: updatedLead.status
        };

        // Check if status changed
        if (req.body.status && req.body.status !== existingLead.status) {
          await Notification.createLeadNotification(
            parseInt(id),
            'status_changed',
            notificationData,
            req.user.id
          );
        } else {
          await Notification.createLeadNotification(
            parseInt(id),
            'updated',
            notificationData,
            req.user.id
          );
        }

        // If agent assignment changed, create a specific "Lead Assigned" notification for the new agent
        if (req.body.agent_id && req.body.agent_id !== existingLead.agent_id && req.body.agent_id !== req.user.id) {
          await Notification.createLeadAssignmentNotification(
            parseInt(id),
            req.body.agent_id,
            {
              customer_name: updatedLead.customer_name,
              phone_number: updatedLead.phone_number
            }
          );
        }
      } catch (notificationError) {
        logger.error('Error creating lead update notifications', notificationError);
        // Don't fail the lead update if notifications fail
      }
      
      // Audit log: Lead updated
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const changes = {};
      if (req.body.agent_id !== undefined && req.body.agent_id !== existingLead.agent_id) {
        changes.agent_id = { from: existingLead.agent_id, to: req.body.agent_id };
      }
      if (req.body.status !== undefined && req.body.status !== existingLead.status) {
        changes.status = { from: existingLead.status, to: req.body.status };
      }
      if (req.body.price !== undefined && req.body.price !== existingLead.price) {
        changes.price = { from: existingLead.price, to: req.body.price };
      }
      
      logger.security('Lead updated', {
        leadId: id,
        customerName: updatedLead.customer_name,
        updatedBy: req.user.id,
        updatedByName: req.user.name,
        changes: Object.keys(changes).length > 0 ? changes : null,
        ip: clientIP
      });
      
      // Fetch the complete lead with all relationships including referrals
      const completeLeadData = await Lead.getLeadById(id);
      
      res.json({
        success: true,
        data: completeLeadData,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      logger.error('Error updating lead', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete lead
  static async deleteLead(req, res) {
    try {
      const { id } = req.params;
      
      // Check if lead exists and user has permission
      const existingLead = await Lead.getLeadById(id);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions - only admin and operations manager can delete leads
      // This check is also enforced by canDeleteLeads middleware, but kept here as a safety measure
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      if (!['admin', 'operations manager'].includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete leads'
        });
      }

      // Create notifications for relevant users before deleting
      try {
        await Notification.createLeadNotification(
          parseInt(id),
          'deleted',
          {
            customer_name: existingLead.customer_name,
            phone_number: existingLead.phone_number,
            status: existingLead.status
          },
          req.user.id
        );
      } catch (notificationError) {
        logger.error('Error creating lead deletion notifications', notificationError);
        // Don't fail the lead deletion if notifications fail
      }

      const deletedLead = await Lead.deleteLead(id);
      
      if (!deletedLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }
      
      // Audit log: Lead deleted
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Lead deleted', {
        leadId: id,
        customerName: deletedLead.customer_name,
        deletedBy: req.user.id,
        deletedByName: req.user.name,
        ip: clientIP
      });
      
      res.json({
        success: true,
        data: deletedLead,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting lead', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete lead',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get leads by agent
  static async getLeadsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      logger.debug('Getting leads for agent', { agentId });
      
      const leads = await Lead.getLeadsByAgent(agentId);
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} leads for agent`
      });
    } catch (error) {
      logger.error('Error getting leads by agent', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leads by agent',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get lead statistics
  static async getLeadStats(req, res) {
    try {
      logger.debug('Getting lead statistics');
      
      const [
        stats,
        leadsByDate,
        leadsByStatus,
        leadsByAgent
      ] = await Promise.all([
        Lead.getLeadStats(),
        Lead.getLeadsByDateRange(),
        Lead.getLeadsByStatus(),
        Lead.getLeadsByAgentStats()
      ]);
      
      res.json({
        success: true,
        data: {
          overview: stats,
          byDate: leadsByDate,
          byStatus: leadsByStatus,
          byAgent: leadsByAgent
        }
      });
    } catch (error) {
      logger.error('Error getting lead statistics', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get reference sources
  static async getReferenceSources(req, res) {
    try {
      logger.debug('Getting reference sources');
      
      const sources = await Lead.getReferenceSources();
      
      res.json({
        success: true,
        data: sources,
        message: 'Reference sources retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting reference sources', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reference sources',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get users who can add leads (for backward compatibility, keeping endpoint name)
  static async getOperationsUsers(req, res) {
    try {
      logger.debug('Getting users who can add leads');
      
      const users = await Lead.getUsersWhoCanAddLeads();
      
      res.json({
        success: true,
        data: users,
        message: 'Users who can add leads retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting users who can add leads', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users who can add leads',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get referrals for a specific lead
  static async getLeadReferrals(req, res) {
    try {
      const { id } = req.params; // lead_id
      
      // Verify lead exists
      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check if user has permission to view this lead (same logic as getLeadById)
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(normalizedRole)) {
        if (normalizedRole === 'agent') {
          // Agents can view referrals for leads they're assigned to OR leads they referred
          if (lead.agent_id !== userId) {
            // Check if this agent made any referrals for this lead
            const referralCheck = await pool.query(
              `SELECT 1 FROM lead_referrals 
               WHERE lead_id = $1 AND referred_by_user_id = $2`,
              [parseInt(id), userId]
            );
            
            if (referralCheck.rows.length === 0) {
              return res.status(403).json({
                success: false,
                message: 'You do not have permission to view referrals for this lead'
              });
            }
          }
        } else if (normalizedRole === 'team leader') {
          // Team leaders can view referrals for their own leads, their team's leads, or leads they referred
          if (lead.agent_id !== userId) {
            // Check if the lead belongs to an agent under this team leader
            const teamAgentCheck = await pool.query(
              `SELECT 1 FROM team_agents 
               WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
              [userId, lead.agent_id]
            );
            
            // Also check if this team leader made any referrals for this lead
            const referralCheck = await pool.query(
              `SELECT 1 FROM lead_referrals 
               WHERE lead_id = $1 AND referred_by_user_id = $2`,
              [parseInt(id), userId]
            );
            
            if (teamAgentCheck.rows.length === 0 && referralCheck.rows.length === 0) {
              return res.status(403).json({
                success: false,
                message: 'You do not have permission to view referrals for this lead'
              });
            }
          }
        }
      }

      const referrals = await LeadReferral.getReferralsByLeadId(parseInt(id));

      res.json({
        success: true,
        data: referrals,
        message: 'Lead referrals retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting lead referrals', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead referrals',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get referral statistics for an agent
  static async getAgentReferralStats(req, res) {
    try {
      const { agentId } = req.params;
      
      const stats = await LeadReferral.getReferralStats(parseInt(agentId));
      const referrals = await LeadReferral.getReferralsByAgentId(parseInt(agentId));

      res.json({
        success: true,
        data: {
          stats,
          referrals
        },
        message: 'Agent referral statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting agent referral stats', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve agent referral statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Lead Notes: visibility rules helper
  // Helper method to get all agent IDs who have been assigned/referred to a lead
  static async getLeadAgentIds(leadId) {
    const agentIds = new Set();
    
    // Get current agent_id from lead
    const lead = await Lead.getLeadById(leadId);
    if (lead && lead.agent_id) {
      agentIds.add(lead.agent_id);
    }
    
    // Get all agents from confirmed referrals
    const referralsResult = await pool.query(
      `SELECT DISTINCT referred_to_agent_id, agent_id
       FROM lead_referrals
       WHERE lead_id = $1 
       AND status = 'confirmed'
       AND (referred_to_agent_id IS NOT NULL OR agent_id IS NOT NULL)`,
      [leadId]
    );
    
    referralsResult.rows.forEach(row => {
      if (row.referred_to_agent_id) agentIds.add(row.referred_to_agent_id);
      if (row.agent_id) agentIds.add(row.agent_id);
    });
    
    return Array.from(agentIds);
  }

  // Helper method to check if an agent is in a team leader's team
  static async isAgentInTeamLeaderTeam(teamLeaderId, agentId) {
    if (!teamLeaderId || !agentId) return false;
    
    const result = await pool.query(
      `SELECT 1 FROM team_agents 
       WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
      [teamLeaderId, agentId]
    );
    
    return result.rows.length > 0;
  }

  static async filterNotesForUser(notes, lead, user) {
    const role = normalizeRole(user.role);
    const userId = user.id;

    // Admin and Operations Manager see all notes
    if (role === 'admin' || role === 'operations manager') {
      return notes;
    }

    // Operations and Agent Manager see only their own notes
    if (['operations', 'agent manager'].includes(role)) {
      return notes.filter(n => n.created_by === userId);
    }

    // Team Leader sees notes from agents in their team + their own notes
    if (role === 'team leader') {
      // Get all agent IDs in the team leader's team
      const teamAgentsResult = await pool.query(
        `SELECT agent_id FROM team_agents 
         WHERE team_leader_id = $1 AND is_active = TRUE`,
        [userId]
      );
      const teamAgentIds = new Set(teamAgentsResult.rows.map(row => row.agent_id));
      
      return notes.filter(note => {
        // Always show own notes
        if (note.created_by === userId) {
          return true;
        }
        
        // Show notes from agents in the team
        return teamAgentIds.has(note.created_by);
      });
    }

    // Agent sees their own notes + notes from previous agents who had this lead
    if (role === 'agent') {
      // Get all agent IDs who have been assigned/referred to this lead
      const leadAgentIds = await LeadsController.getLeadAgentIds(lead.id);
      
      return notes.filter(note => {
        // Always show own notes
        if (note.created_by === userId) {
          return true;
        }
        
        // Show notes from agents who have been assigned/referred to this lead
        // (including current agent and previous agents)
        return leadAgentIds.includes(note.created_by);
      });
    }

    // Default: only own notes
    return notes.filter(n => n.created_by === userId);
  }

  // GET /api/leads/:id/notes - Get notes for a lead
  static async getLeadNotes(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.getLeadById(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found',
        });
      }

      const notes = await LeadNote.getNotesForLead(id);
      const filtered = await LeadsController.filterNotesForUser(notes, lead, req.user);

      res.json({
        success: true,
        data: filtered,
        message: `Retrieved ${filtered.length} notes for lead`,
      });
    } catch (error) {
      logger.error('Error getting lead notes', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead notes',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // POST /api/leads/:id/notes - Create note on a lead
  static async addLeadNote(req, res) {
    try {
      const { id } = req.params;
      const { note_text } = req.body || {};

      if (!note_text || !note_text.toString().trim()) {
        return res.status(400).json({
          success: false,
          message: 'Note text is required',
        });
      }

      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found',
        });
      }

      // Check if user can add notes to this lead
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;
      let canAddNote = false;

      // Admin can always add notes
      if (role === 'admin') {
        canAddNote = true;
      }
      // Operations, Operations Manager, Agent Manager can add notes (but can't see others' notes)
      else if (['operations', 'operations manager', 'agent manager'].includes(role)) {
        canAddNote = true;
      }
      // Agent can add notes if they have access to the lead
      else if (role === 'agent') {
        // Agent can add notes if they are currently assigned to the lead
        // OR if they have been assigned/referred to this lead before
        if (lead.agent_id === userId) {
          canAddNote = true;
        } else {
          // Check if agent was previously assigned/referred to this lead
          const leadAgentIds = await LeadsController.getLeadAgentIds(id);
          canAddNote = leadAgentIds.includes(userId);
        }
      }
      // Team Leader can add notes if they have access to the lead
      else if (role === 'team leader') {
        if (lead.agent_id === userId) {
          canAddNote = true;
        } else {
          // Check if the lead belongs to an agent under this team leader
          const teamAgentCheck = await pool.query(
            `SELECT 1 FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, lead.agent_id]
          );
          canAddNote = teamAgentCheck.rows.length > 0;
        }
      }

      if (!canAddNote) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add notes to this lead',
        });
      }

      const note = await LeadNote.createNote(id, req.user, note_text.toString().trim());
      const notes = await LeadNote.getNotesForLead(id);
      const filtered = await LeadsController.filterNotesForUser(notes, lead, req.user);
      const createdForUser = filtered.find(n => n.id === note.id) || note;

      res.status(201).json({
        success: true,
        data: createdForUser,
        message: 'Note added successfully',
      });
    } catch (error) {
      logger.error('Error adding lead note', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add lead note',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Manually add a referral to a lead
  static async addLeadReferral(req, res) {
    try {
      const { id } = req.params; // lead_id
      const { name, type, employee_id, date } = req.body;

      // Verify lead exists
      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions - only admins, operations, operations managers, and agent managers can manually add referrals
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      if (!['admin', 'operations', 'operations manager', 'agent manager'].includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add referrals'
        });
      }

      // Validate required fields
      if (!name || !type || !date) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, and date are required'
        });
      }

      // Validate type
      if (!['employee', 'custom'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "employee" or "custom"'
        });
      }

      // For employee type, employee_id is required
      if (type === 'employee' && !employee_id) {
        return res.status(400).json({
          success: false,
          message: 'employee_id is required for employee referrals'
        });
      }

      const referral = await LeadReferral.createReferral(
        parseInt(id), 
        type === 'employee' ? employee_id : null, 
        name, 
        type, 
        new Date(date)
      );

      res.json({
        success: true,
        data: referral,
        message: 'Referral added successfully'
      });
    } catch (error) {
      logger.error('Error adding lead referral', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add referral',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete a referral from a lead
  static async deleteLeadReferral(req, res) {
    try {
      const { id, referralId } = req.params;

      // Verify lead exists
      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions - only admins, operations, operations managers, and agent managers can delete referrals
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete referrals'
        });
      }

      const deletedReferral = await LeadReferral.deleteReferral(parseInt(referralId));

      if (!deletedReferral) {
        return res.status(404).json({
          success: false,
          message: 'Referral not found'
        });
      }

      res.json({
        success: true,
        message: 'Referral deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting lead referral', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete referral',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // PUT /api/leads/:id/notes/:noteId - Update a lead note
  static async updateLeadNote(req, res) {
    try {
      const { id, noteId } = req.params;
      const { note_text } = req.body || {};

      if (!note_text || !note_text.toString().trim()) {
        return res.status(400).json({
          success: false,
          message: 'Note text is required',
        });
      }

      // Get the note
      const note = await LeadNote.getNoteById(noteId);
      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found',
        });
      }

      // Verify note belongs to the lead
      if (note.lead_id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Note does not belong to this lead',
        });
      }

      // Check permissions
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;

      // Admin can edit all notes
      // Others can only edit their own notes
      if (role !== 'admin' && note.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this note',
        });
      }

      const updatedNote = await LeadNote.updateNote(noteId, note_text.toString().trim());
      
      // Get all notes and filter for user visibility
      const lead = await Lead.getLeadById(id);
      const notes = await LeadNote.getNotesForLead(id);
      const filtered = await LeadsController.filterNotesForUser(notes, lead, req.user);
      const updatedForUser = filtered.find(n => n.id === updatedNote.id) || updatedNote;

      res.json({
        success: true,
        data: updatedForUser,
        message: 'Note updated successfully',
      });
    } catch (error) {
      logger.error('Error updating lead note', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update lead note',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // DELETE /api/leads/:id/notes/:noteId - Delete a lead note
  static async deleteLeadNote(req, res) {
    try {
      const { id, noteId } = req.params;

      // Get the note
      const note = await LeadNote.getNoteById(noteId);
      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found',
        });
      }

      // Verify note belongs to the lead
      if (note.lead_id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Note does not belong to this lead',
        });
      }

      // Check permissions
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;

      // Admin can delete all notes
      // Others can only delete their own notes
      if (role !== 'admin' && note.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this note',
        });
      }

      await LeadNote.deleteNote(noteId);

      res.json({
        success: true,
        message: 'Note deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting lead note', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete lead note',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Refer a lead to an agent
  static async referLeadToAgent(req, res) {
    try {
      const { id } = req.params;
      const { referred_to_agent_id } = req.body;
      const { roleFilters } = req;
      const userId = req.user.id;

      // Check if user can view leads (agents and team leaders can refer)
      if (!roleFilters.canViewLeads) {
        return res.status(403).json({ 
          message: 'Access denied. You do not have permission to refer leads.' 
        });
      }

      if (!referred_to_agent_id) {
        return res.status(400).json({ message: 'referred_to_agent_id is required' });
      }

      // Check if lead exists
      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      // Check if the lead's status allows referrals
      if (lead.status_can_be_referred === false) {
        return res.status(400).json({ 
          message: `Leads with status "${lead.status}" cannot be referred.` 
        });
      }
      
      // Fallback check for undefined/null (shouldn't happen after migration, but just in case)
      if (lead.status_can_be_referred === undefined || lead.status_can_be_referred === null) {
        const isClosed = lead.status && ['closed', 'converted'].includes(lead.status.toLowerCase());
        if (isClosed) {
          return res.status(400).json({ 
            message: `Leads with status "${lead.status}" cannot be referred.` 
          });
        }
      }

      // For agents and team leaders, they can only refer leads assigned to them
      if (roleFilters.role === 'agent' || roleFilters.role === 'team leader') {
        if (lead.agent_id !== userId) {
          return res.status(403).json({ 
            message: 'Access denied. You can only refer leads that are assigned to you.' 
          });
        }
      }

      // Create the referral
      const referral = await LeadReferral.referLeadToAgent(
        parseInt(id),
        parseInt(referred_to_agent_id),
        userId
      );

      // Create notification for the referred agent
      try {
        await Notification.createNotification({
          user_id: parseInt(referred_to_agent_id),
          type: 'lead_referral',
          title: 'New Lead Referral',
          message: `${req.user.name} referred lead ${lead.customer_name} to you`,
          lead_id: parseInt(id),
          is_read: false
        });
      } catch (notifError) {
        logger.error('Error creating notification', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        data: referral,
        message: 'Lead referred successfully'
      });
    } catch (error) {
      logger.error('Error referring lead', error);
      res.status(500).json({ 
        message: error.message || 'Server error' 
      });
    }
  }

  // Get pending referrals for current user
  static async getPendingReferrals(req, res) {
    try {
      const { roleFilters } = req;
      const userId = req.user.id;

      // Only agents and team leaders can have pending referrals
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
        return res.status(403).json({ 
          message: 'Access denied. Only agents and team leaders can have pending referrals.' 
        });
      }

      const pendingReferrals = await LeadReferral.getPendingReferralsForUser(userId);

      res.json({
        success: true,
        data: pendingReferrals,
        count: pendingReferrals.length
      });
    } catch (error) {
      logger.error('Error getting pending referrals', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get pending referrals count for current user
  static async getPendingReferralsCount(req, res) {
    try {
      const { roleFilters } = req;
      const userId = req.user.id;

      // Only agents and team leaders can have pending referrals
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
        return res.json({
          success: true,
          count: 0
        });
      }

      const count = await LeadReferral.getPendingReferralsCount(userId);

      res.json({
        success: true,
        count
      });
    } catch (error) {
      logger.error('Error getting pending referrals count', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Confirm a referral
  static async confirmReferral(req, res) {
    try {
      const { id } = req.params;
      const { roleFilters } = req;
      const userId = req.user.id;

      // Only agents and team leaders can confirm referrals
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
        return res.status(403).json({ 
          message: 'Access denied. Only agents and team leaders can confirm referrals.' 
        });
      }

      const result = await LeadReferral.confirmReferral(parseInt(id), userId);

      // Create notification for the referrer
      try {
        if (result.referral && result.referral.referred_by_user_id) {
          await Notification.createNotification({
            user_id: result.referral.referred_by_user_id,
            type: 'lead_referral_confirmed',
            title: 'Lead Referral Confirmed',
            message: `Your referral for lead ${result.lead.customer_name} has been confirmed`,
            lead_id: result.lead.id,
            is_read: false
          });
        }
      } catch (notifError) {
        logger.error('Error creating notification', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        data: result,
        message: 'Referral confirmed and lead assigned successfully'
      });
    } catch (error) {
      logger.error('Error confirming referral', error);
      res.status(500).json({ 
        message: error.message || 'Server error' 
      });
    }
  }

  // Reject a referral
  static async rejectReferral(req, res) {
    try {
      const { id } = req.params;
      const { roleFilters } = req;
      const userId = req.user.id;

      // Only agents and team leaders can reject referrals
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
        return res.status(403).json({ 
          message: 'Access denied. Only agents and team leaders can reject referrals.' 
        });
      }

      const referral = await LeadReferral.rejectReferral(parseInt(id), userId);

      // Create notification for the referrer
      try {
        if (referral.referred_by_user_id) {
          const lead = await Lead.getLeadById(referral.lead_id);
          await Notification.createNotification({
            user_id: referral.referred_by_user_id,
            type: 'lead_referral_rejected',
            title: 'Lead Referral Rejected',
            message: `Your referral for lead ${lead.customer_name} has been rejected`,
            lead_id: referral.lead_id,
            is_read: false
          });
        }
      } catch (notifError) {
        logger.error('Error creating notification', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        data: referral,
        message: 'Referral rejected successfully'
      });
    } catch (error) {
      logger.error('Error rejecting referral', error);
      res.status(500).json({ 
        message: error.message || 'Server error' 
      });
    }
  }

  // Get viewings for a lead
  static async getLeadViewings(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      
      // Only admin, operations manager, operations, and agent manager can view lead profile
      if (!['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view lead profile'
        });
      }

      const viewings = await Lead.getLeadViewings(id);
      
      res.json({
        success: true,
        data: viewings
      });
    } catch (error) {
      logger.error('Error getting lead viewings', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Import leads from Excel/CSV (dry-run or commit)
  static async importLeads(req, res) {
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Use field name "file" and upload .xlsx or .csv',
        });
      }
      const dryRun = req.query.dryRun === 'true' || req.query.dryRun === '1';
      const mode = (req.body && (req.body.mode === 'skip' || req.body.mode === 'upsert')) ? req.body.mode : 'skip';
      const importerUserId = req.user.id;
      const importerRole = req.user.role || '';

      if (dryRun) {
        const result = await leadsImportService.dryRun(
          file.buffer,
          file.mimetype,
          importerUserId,
          importerRole
        );
        logger.debug('Leads import dry-run', {
          userId: importerUserId,
          total: result.summary.total,
          valid: result.summary.valid,
          invalid: result.summary.invalid,
        });
        return res.json(result);
      }

      const result = await leadsImportService.commitImport(
        file.buffer,
        file.mimetype,
        importerUserId,
        importerRole,
        mode
      );
      logger.security('Leads import completed', {
        userId: importerUserId,
        importedCount: result.importedCount,
        skippedCount: result.skippedDuplicatesCount,
        errorCount: result.errorCount,
      });
      return res.json(result);
    } catch (error) {
      logger.error('Error in lead import', error);
      return res.status(500).json({
        success: false,
        message: 'Import failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Get owned properties for a lead
  static async getLeadOwnedProperties(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      
      // Only admin, operations manager, operations, and agent manager can view lead profile
      if (!['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view lead profile'
        });
      }

      const properties = await Lead.getLeadOwnedProperties(id);
      
      res.json({
        success: true,
        data: properties
      });
    } catch (error) {
      logger.error('Error getting lead owned properties', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead owned properties',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = LeadsController;
