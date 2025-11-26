// controllers/leadsController.js
const Lead = require('../models/leadsModel');
const LeadReferral = require('../models/leadReferralModel');
const Notification = require('../models/notificationModel');
const LeadNote = require('../models/leadNotesModel');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

const normalizeRole = (role) =>
  role ? role.toLowerCase().replace(/\s+/g, '_') : '';

class LeadsController {
  // Get all leads (with role-based filtering applied by middleware)
  static async getAllLeads(req, res) {
    try {
      console.log('📋 Getting all leads for user:', req.user?.name, 'Role:', req.user?.role);
      
      const normalizedRole = normalizeRole(req.user.role);

      let leads = await Lead.getLeadsForAgent(req.user.id, normalizedRole);
      
      // Filter data for agents and team leaders
      if (['agent', 'team_leader'].includes(normalizedRole)) {
        leads = leads.map(lead => ({
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          operations_id: lead.operations_id,
          operations_name: lead.operations_name,
          operations_role: lead.operations_role,
          reference_source_id: lead.reference_source_id,
          reference_source_name: lead.reference_source_name,
          contact_source: lead.contact_source,
          price: lead.price,
          status: lead.status,
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
      console.error('❌ Error getting leads:', error);
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
      console.log('🔍 Getting filtered leads for user:', req.user?.name, 'Filters:', req.query);
      console.log('🔍 User role:', req.user?.role, 'User ID:', req.user?.id);
      console.log('🔍 Date filters from query:', { 
        date_from: req.query.date_from, 
        date_to: req.query.date_to,
        date_from_type: typeof req.query.date_from,
        date_to_type: typeof req.query.date_to
      });
      
      let leads;
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      const userId = req.user.id;
      
      if (normalizedRole === 'agent') {
        console.log('🔍 Agent user - complex filtering logic');
        // Agents see leads assigned to them or that they referred, with filters
        leads = await Lead.getLeadsAssignedOrReferredByAgent(userId);
        console.log('🔍 Agent leads before filtering:', leads.length);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredLeads = await Lead.getLeadsWithFilters(req.query);
          console.log('🔍 Filtered leads from query:', filteredLeads.length);
          // Filter the agent's leads by the query results
          leads = leads.filter(lead => 
            filteredLeads.some(filtered => filtered.id === lead.id)
          );
          console.log('🔍 Final agent leads after filtering:', leads.length);
        }
      } else {
        console.log('🔍 Admin/Manager/Operations user - direct filtering');
        // Admins, operations managers, operations, and agent managers see all leads with filters
        leads = await Lead.getLeadsWithFilters(req.query);
      }
      
      console.log('🔍 Final leads count:', leads.length);
      
      // Filter data for agents and team leaders
      if (['agent', 'team_leader'].includes(normalizedRole)) {
        leads = leads.map(lead => ({
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          operations_id: lead.operations_id,
          operations_name: lead.operations_name,
          operations_role: lead.operations_role,
          reference_source_id: lead.reference_source_id,
          reference_source_name: lead.reference_source_name,
          contact_source: lead.contact_source,
          price: lead.price,
          status: lead.status,
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
      console.error('❌ Error getting filtered leads:', error);
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
      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(normalizedRole)) {
        // Full access
      } else if (normalizedRole === 'agent' && lead.agent_id !== userId) {
        // Agents can only view leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lead'
        });
      } else if (normalizedRole === 'team_leader') {
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
          updated_at: lead.updated_at
        };
      }
      
      res.json({
        success: true,
        data: lead,
        userRole: userRole
      });
    } catch (error) {
      console.error('❌ Error getting lead by ID:', error);
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
      console.log('➕ Creating new lead:', req.body);
      
      // All validation is now handled by middleware
      // If user is operations role, set them as the default operations_id
      let leadData = { ...req.body };
      if (req.user.role === 'operations' && !leadData.operations_id) {
        leadData.operations_id = req.user.id;
      }

      const newLead = await Lead.createLead(leadData);
      
      console.log('✅ Lead created successfully:', newLead.id);

      // Process manual referrals from the form
      if (req.body.referrals && Array.isArray(req.body.referrals) && req.body.referrals.length > 0) {
        try {
          console.log(`📊 Processing ${req.body.referrals.length} manual referrals for lead ${newLead.id}`);
          for (const referral of req.body.referrals) {
            if (referral.type === 'employee' && referral.employee_id && referral.date) {
              // Get agent name for employee referral
              const agentResult = await pool.query('SELECT name FROM users WHERE id = $1', [referral.employee_id]);
              const agentName = agentResult.rows[0]?.name || referral.name || 'Unknown Agent';
              await LeadReferral.createReferral(newLead.id, referral.employee_id, agentName, 'employee', new Date(referral.date));
              console.log(`✅ Added employee referral: lead ${newLead.id} -> agent ${referral.employee_id}`);
            } else if (referral.type === 'custom' && referral.name && referral.date) {
              // Custom referrals don't have agent_id
              await LeadReferral.createReferral(newLead.id, null, referral.name, 'custom', new Date(referral.date));
              console.log(`✅ Added custom referral: lead ${newLead.id} -> custom "${referral.name}"`);
            }
          }
          
          // Apply the 30-day external rule to all referrals for this lead
          console.log(`🔄 Applying 30-day external rule to lead ${newLead.id} referrals...`);
          const ruleResult = await LeadReferral.applyExternalRuleToLeadReferrals(newLead.id);
          console.log(`✅ External rule applied: ${ruleResult.message}`);
          if (ruleResult.markedExternalReferrals.length > 0) {
            console.log(`   Marked ${ruleResult.markedExternalReferrals.length} referral(s) as external`);
          }
        } catch (referralError) {
          console.error('Error creating manual referrals:', referralError);
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
        console.error('Error creating lead notifications:', notificationError);
        // Don't fail the lead creation if notifications fail
      }
      
      // Fetch the complete lead with all relationships including referrals
      const completeLeadData = await Lead.getLeadById(newLead.id);
      console.log('📊 Complete lead data with referrals:', JSON.stringify(completeLeadData, null, 2));
      
      res.status(201).json({
        success: true,
        data: completeLeadData,
        message: 'Lead created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating lead:', error);
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
      console.log('📝 Updating lead:', id, req.body);
      
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
      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(normalizedRole)) {
        // Full access - no restrictions
      } else if (normalizedRole === 'agent' && existingLead.agent_id !== userId) {
        // Agents can only update leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this lead'
        });
      } else if (normalizedRole === 'team_leader') {
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
          console.log(`📊 Lead ${id} - Agent reassignment detected`);
          console.log(`   Previous agent: ${existingLead.agent_id}`);
          console.log(`   New agent: ${req.body.agent_id}`);
          
          // Process the referral reassignment with the 1-month external logic
          const referralResult = await LeadReferral.processLeadReassignment(
            parseInt(id),
            req.body.agent_id,
            existingLead.agent_id
          );
          
          console.log(`✅ Referral processing result:`, referralResult.message);
          if (referralResult.markedExternalReferrals.length > 0) {
            console.log(`   Marked ${referralResult.markedExternalReferrals.length} referral(s) as external`);
          }
        } catch (referralError) {
          console.error('❌ Error processing lead referral reassignment:', referralError);
          // Don't fail the lead update if referral tracking fails
        }
      }

      // Handle manual referrals from the form (if provided)
      if (req.body.referrals && Array.isArray(req.body.referrals)) {
        try {
          console.log(`📊 Processing ${req.body.referrals.length} manual referrals for lead ${id}`);
          console.log(`📊 Referral data:`, JSON.stringify(req.body.referrals, null, 2));
          
          // Get existing referrals
          const existingReferrals = await LeadReferral.getReferralsByLeadId(parseInt(id));
          console.log(`📊 Found ${existingReferrals.length} existing referrals to delete`);
          
          // Delete all existing manual referrals (we'll recreate from the form data)
          for (const existingRef of existingReferrals) {
            console.log(`🗑️ Deleting referral ${existingRef.id}`);
            await LeadReferral.deleteReferral(existingRef.id);
          }
          
          // Create new referrals from form data
          for (const referral of req.body.referrals) {
            console.log(`🔍 Processing referral:`, referral);
            console.log(`  - type: ${referral.type}`);
            console.log(`  - employee_id: ${referral.employee_id}`);
            console.log(`  - name: ${referral.name}`);
            console.log(`  - date: ${referral.date}`);
            
            if (referral.type === 'employee' && referral.employee_id && referral.date) {
              // Get agent name for employee referral
              const agentResult = await pool.query('SELECT name FROM users WHERE id = $1', [referral.employee_id]);
              const agentName = agentResult.rows[0]?.name || referral.name || 'Unknown Agent';
              console.log(`  - Fetched agent name: ${agentName}`);
              const created = await LeadReferral.createReferral(parseInt(id), referral.employee_id, agentName, 'employee', new Date(referral.date));
              console.log(`✅ Added employee referral: lead ${id} -> agent ${referral.employee_id}, referral_id: ${created.id}`);
            } else if (referral.type === 'custom' && referral.name && referral.date) {
              // Custom referrals don't have agent_id
              const created = await LeadReferral.createReferral(parseInt(id), null, referral.name, 'custom', new Date(referral.date));
              console.log(`✅ Added custom referral: lead ${id} -> custom "${referral.name}", referral_id: ${created.id}`);
            } else {
              console.log(`⚠️ Referral skipped - didn't pass validation checks`);
            }
          }
          console.log(`✅ Finished processing referrals for lead ${id}`);
          
          // Apply the 30-day external rule to all referrals for this lead
          console.log(`🔄 Applying 30-day external rule to lead ${id} referrals...`);
          const ruleResult = await LeadReferral.applyExternalRuleToLeadReferrals(parseInt(id));
          console.log(`✅ External rule applied: ${ruleResult.message}`);
          if (ruleResult.markedExternalReferrals.length > 0) {
            console.log(`   Marked ${ruleResult.markedExternalReferrals.length} referral(s) as external`);
          }
        } catch (referralError) {
          console.error('❌ Error updating manual referrals:', referralError);
          console.error('❌ Error stack:', referralError.stack);
          // Don't fail the lead update if referral tracking fails
        }
      } else {
        console.log(`📊 No referrals to process (referrals: ${req.body.referrals})`);
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
        console.error('Error creating lead update notifications:', notificationError);
        // Don't fail the lead update if notifications fail
      }
      
      console.log('✅ Lead updated successfully:', updatedLead.id);
      
      // Fetch the complete lead with all relationships including referrals
      const completeLeadData = await Lead.getLeadById(id);
      console.log('📊 Complete lead data with referrals:', JSON.stringify(completeLeadData, null, 2));
      
      res.json({
        success: true,
        data: completeLeadData,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating lead:', error);
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
      console.log('🗑️ Deleting lead:', id);
      
      // Check if lead exists and user has permission
      const existingLead = await Lead.getLeadById(id);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions - only admins, operations, operations managers, and agent managers can delete leads
      const userRole = req.user.role;
      const normalizedRole = normalizeRole(userRole);
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(normalizedRole)) {
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
        console.error('Error creating lead deletion notifications:', notificationError);
        // Don't fail the lead deletion if notifications fail
      }

      const deletedLead = await Lead.deleteLead(id);
      
      if (!deletedLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }
      
      console.log('✅ Lead deleted successfully:', deletedLead.id);
      
      res.json({
        success: true,
        data: deletedLead,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting lead:', error);
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
      console.log('👤 Getting leads for agent:', agentId);
      
      const leads = await Lead.getLeadsByAgent(agentId);
      
      res.json({
        success: true,
        data: leads,
        message: `Retrieved ${leads.length} leads for agent`
      });
    } catch (error) {
      console.error('❌ Error getting leads by agent:', error);
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
      console.log('📊 Getting lead statistics');
      
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
      console.error('❌ Error getting lead statistics:', error);
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
      console.log('📋 Getting reference sources');
      
      const sources = await Lead.getReferenceSources();
      
      res.json({
        success: true,
        data: sources,
        message: 'Reference sources retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting reference sources:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reference sources',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get operations users
  static async getOperationsUsers(req, res) {
    try {
      console.log('👥 Getting operations users');
      
      const users = await Lead.getOperationsUsers();
      
      res.json({
        success: true,
        data: users,
        message: 'Operations users retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting operations users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve operations users',
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

      const referrals = await LeadReferral.getReferralsByLeadId(parseInt(id));

      res.json({
        success: true,
        data: referrals,
        message: 'Lead referrals retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error getting lead referrals:', error);
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
      console.error('❌ Error getting agent referral stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve agent referral statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Lead Notes: visibility rules helper
  static filterNotesForUser(notes, lead, user) {
    const role = normalizeRole(user.role);

    // Admin and Operations Manager see all notes
    if (role === 'admin' || role === 'operations_manager') {
      return notes;
    }

    // Everyone else sees only their own notes
    return notes.filter(n => n.created_by === user.id);
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
      const filtered = LeadsController.filterNotesForUser(notes, lead, req.user);

      res.json({
        success: true,
        data: filtered,
        message: `Retrieved ${filtered.length} notes for lead`,
      });
    } catch (error) {
      console.error('❌ Error getting lead notes:', error);
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

      // Anyone who can view the lead can add notes to it
      // Check if user can view this lead
      const role = normalizeRole(req.user.role);
      const userId = req.user.id;
      let canViewLead = false;

      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(role)) {
        canViewLead = true;
      } else if (role === 'agent' && lead.agent_id === userId) {
        canViewLead = true;
      } else if (role === 'team_leader') {
        if (lead.agent_id === userId) {
          canViewLead = true;
        } else {
          // Check if the lead belongs to an agent under this team leader
          const teamAgentCheck = await pool.query(
            `SELECT 1 FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, lead.agent_id]
          );
          canViewLead = teamAgentCheck.rows.length > 0;
        }
      }

      if (!canViewLead) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add notes to this lead',
        });
      }

      const note = await LeadNote.createNote(id, req.user, note_text.toString().trim());
      const notes = await LeadNote.getNotesForLead(id);
      const filtered = LeadsController.filterNotesForUser(notes, lead, req.user);
      const createdForUser = filtered.find(n => n.id === note.id) || note;

      res.status(201).json({
        success: true,
        data: createdForUser,
        message: 'Note added successfully',
      });
    } catch (error) {
      console.error('❌ Error adding lead note:', error);
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
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(normalizedRole)) {
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
      console.error('❌ Error adding lead referral:', error);
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
      console.error('❌ Error deleting lead referral:', error);
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
      const filtered = LeadsController.filterNotesForUser(notes, lead, req.user);
      const updatedForUser = filtered.find(n => n.id === updatedNote.id) || updatedNote;

      res.json({
        success: true,
        data: updatedForUser,
        message: 'Note updated successfully',
      });
    } catch (error) {
      console.error('❌ Error updating lead note:', error);
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
      console.error('❌ Error deleting lead note:', error);
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

      // For agents and team leaders, they can only refer leads assigned to them
      if (roleFilters.role === 'agent' || roleFilters.role === 'team_leader') {
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
        console.error('Error creating notification:', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        data: referral,
        message: 'Lead referred successfully'
      });
    } catch (error) {
      console.error('Error referring lead:', error);
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
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team_leader') {
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
      console.error('Error getting pending referrals:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get pending referrals count for current user
  static async getPendingReferralsCount(req, res) {
    try {
      const { roleFilters } = req;
      const userId = req.user.id;

      // Only agents and team leaders can have pending referrals
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team_leader') {
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
      console.error('Error getting pending referrals count:', error);
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
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team_leader') {
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
        console.error('Error creating notification:', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        data: result,
        message: 'Referral confirmed and lead assigned successfully'
      });
    } catch (error) {
      console.error('Error confirming referral:', error);
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
      if (roleFilters.role !== 'agent' && roleFilters.role !== 'team_leader') {
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
        console.error('Error creating notification:', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        data: referral,
        message: 'Referral rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting referral:', error);
      res.status(500).json({ 
        message: error.message || 'Server error' 
      });
    }
  }
}

module.exports = LeadsController;
