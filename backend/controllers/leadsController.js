// controllers/leadsController.js
const Lead = require('../models/leadsModel');
const LeadReferral = require('../models/leadReferralModel');
const Notification = require('../models/notificationModel');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

class LeadsController {
  // Get all leads (with role-based filtering applied by middleware)
  static async getAllLeads(req, res) {
    try {
      console.log('📋 Getting all leads for user:', req.user?.name, 'Role:', req.user?.role);
      
      let leads = await Lead.getLeadsForAgent(req.user.id, req.user.role);
      
      // Add agent-specific notes
      leads = await Lead.getLeadsWithNotes(leads, req.user.id, req.user.role);
      console.log('📝 Added notes to', leads.length, 'leads. First lead has', leads[0]?.agent_notes?.length || 0, 'notes');
      
      // Filter data for agents and team leaders
      if (['agent', 'team_leader'].includes(req.user.role)) {
        leads = leads.map(lead => ({
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          status: lead.status,
          agent_notes: lead.agent_notes, // Include agent-specific notes
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
      const userId = req.user.id;
      
      if (userRole === 'agent') {
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
      
      // Add agent-specific notes
      leads = await Lead.getLeadsWithNotes(leads, req.user.id, req.user.role);
      
      // Filter data for agents and team leaders
      if (['agent', 'team_leader'].includes(req.user.role)) {
        leads = leads.map(lead => ({
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          status: lead.status,
          agent_notes: lead.agent_notes,
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
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access
      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
        // Full access - no restrictions
        // Add all notes
        const notes = await Lead.getLeadNotes(lead.id, userId, userRole);
        console.log('📝 Admin getLeadById - fetched', notes?.length || 0, 'notes for lead', lead.id);
        lead.agent_notes = notes;
      } else if (userRole === 'agent' && lead.agent_id !== userId) {
        // Agents can only view leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lead'
        });
      } else if (userRole === 'team_leader' && lead.agent_id !== userId) {
        // Team leaders can only view leads assigned to them
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lead'
        });
      } else if (['agent', 'team_leader'].includes(userRole)) {
        // Add agent-specific notes and filter data
        const notes = await Lead.getLeadNotes(lead.id, userId, userRole);
        lead = {
          id: lead.id,
          date: lead.date,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          agent_id: lead.agent_id,
          assigned_agent_name: lead.assigned_agent_name,
          status: lead.status,
          agent_notes: notes,
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

      // Track referral if an agent is assigned (automatic referral)
      if (newLead.agent_id) {
        try {
          console.log(`📊 Creating automatic referral for lead ${newLead.id} -> agent ${newLead.agent_id}`);
          // Get agent name for the referral
          const agentResult = await pool.query('SELECT name FROM users WHERE id = $1', [newLead.agent_id]);
          const agentName = agentResult.rows[0]?.name || 'Unknown Agent';
          await LeadReferral.createReferral(newLead.id, newLead.agent_id, agentName, 'employee');
        } catch (referralError) {
          console.error('Error creating automatic lead referral:', referralError);
          // Don't fail the lead creation if referral tracking fails
        }
      }

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
      const userId = req.user.id;
      
      // Admin, operations, operations manager, and agent manager have full access
      if (['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
        // Full access - no restrictions
      } else if (userRole === 'agent' && existingLead.agent_id !== userId) {
        // Agents can only update leads they're assigned to
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this lead'
        });
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
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
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

  // Add or update agent note for a lead
  static async upsertLeadNote(req, res) {
    try {
      const { id } = req.params; // lead_id
      const { note_text } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verify user has access to this lead
      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions - agents and team leaders can only update notes for leads assigned to them
      if (['agent', 'team_leader'].includes(userRole) && lead.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only add notes to leads assigned to you'
        });
      }

      // Admin, operations, operations_manager can add notes as any user (for now, we'll use their own ID)
      const note = await Lead.upsertLeadNote(id, userId, note_text);

      res.json({
        success: true,
        data: note,
        message: 'Note saved successfully'
      });
    } catch (error) {
      console.error('❌ Error upserting lead note:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save note',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete agent note
  static async deleteLeadNote(req, res) {
    try {
      const { id } = req.params; // lead_id
      const userId = req.user.id;

      const deletedNote = await Lead.deleteLeadNote(id, userId);

      if (!deletedNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found or you do not have permission to delete it'
        });
      }

      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting lead note:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete note',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get notes for a specific lead
  static async getLeadNotesById(req, res) {
    try {
      const { id } = req.params; // lead_id
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verify lead exists and user has access
      const lead = await Lead.getLeadById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permissions
      if (['agent', 'team_leader'].includes(userRole) && lead.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view notes for this lead'
        });
      }

      const notes = await Lead.getLeadNotes(id, userId, userRole);

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      console.error('❌ Error getting lead notes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notes',
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
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
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
      if (!['admin', 'operations', 'operations_manager', 'agent_manager'].includes(userRole)) {
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
}

module.exports = LeadsController;
