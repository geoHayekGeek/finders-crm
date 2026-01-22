// controllers/viewingsController.js
const Viewing = require('../models/viewingModel');
const CalendarEvent = require('../models/calendarEventModel');
const Notification = require('../models/notificationModel');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const ReminderService = require('../services/reminderService');
const logger = require('../utils/logger');
const { normalizeRole } = require('../utils/roleUtils');

class ViewingsController {
  // Helper function to find calendar event by viewing ID
  static async findCalendarEventByViewingId(viewingId) {
    try {
      // First try to find by the exact pattern in notes
      const result = await pool.query(
        `SELECT * FROM calendar_events 
         WHERE type = 'showing' 
         AND notes LIKE $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [`%Viewing ID: ${viewingId}%`]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding calendar event by viewing ID', error);
      return null;
    }
  }
  
  // Helper function to store calendar event ID with viewing
  static async linkCalendarEventToViewing(viewingId, calendarEventId) {
    try {
      // Store the calendar event ID in the viewing notes for future reference
      await pool.query(
        `UPDATE viewings 
         SET notes = CONCAT(COALESCE(notes, ''), ' | Calendar Event ID: ', $1)
         WHERE id = $2`,
        [calendarEventId, viewingId]
      );
    } catch (error) {
      logger.error('Error linking calendar event to viewing', error);
    }
  }
  // Get all viewings (with role-based filtering)
  static async getAllViewings(req, res) {
    try {
      logger.debug('Getting all viewings', {
        userId: req.user?.id,
        userRole: req.user?.role
      });
      
      const viewings = await Viewing.getViewingsForAgent(req.user.id, normalizeRole(req.user.role));
      
      res.json({
        success: true,
        data: viewings,
        message: `Retrieved ${viewings.length} viewings`,
        userRole: req.user.role
      });
    } catch (error) {
      logger.error('Error getting viewings', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewings'
      });
    }
  }

  // Get viewings with filters
  static async getViewingsWithFilters(req, res) {
    try {
      logger.debug('Getting filtered viewings', {
        userId: req.user?.id,
        userRole: req.user?.role,
        filterCount: Object.keys(req.query).length
      });
      
      // Check if user is authenticated
      if (!req.user || !req.user.id || !req.user.role) {
        logger.warn('Unauthenticated request to getViewingsWithFilters');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Debug logging removed - security risk
      
      let viewings;
      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      if (userRole === 'agent') {
        // Agents see only their viewings, with filters
        // If filtering by property_id, verify the property belongs to the agent first
        if (req.query.property_id) {
          const propertyId = parseInt(req.query.property_id, 10);
          if (!isNaN(propertyId)) {
            // Check if the property belongs to this agent
            const propertyCheck = await pool.query(
              'SELECT agent_id FROM properties WHERE id = $1',
              [propertyId]
            );
            
            if (propertyCheck.rows.length === 0) {
              // Property doesn't exist
              return res.json({
                success: true,
                data: [],
                message: 'Property not found'
              });
            }
            
            const propertyAgentId = propertyCheck.rows[0].agent_id;
            
            // Agents can only see viewings on their own properties
            if (propertyAgentId !== userId) {
              logger.security('Agent attempted to view viewings for unassigned property', {
                agentId: userId,
                propertyId: propertyId,
                propertyAgentId: propertyAgentId
              });
              return res.json({
                success: true,
                data: [],
                message: 'Access denied. You can only view viewings on properties assigned to you.'
              });
            }
          }
        }
        
        // First get all their viewings
        let agentViewings = await Viewing.getViewingsByAgent(userId);
        
        // Apply additional filters if provided (but only on their own viewings)
        if (Object.keys(req.query).length > 0) {
          // Build filter object that includes agent_id to ensure we only get their viewings
          const filtersWithAgent = { ...req.query, agent_id: userId };
          const filteredViewings = await Viewing.getViewingsWithFilters(filtersWithAgent);
          
          // Create a Set of filtered viewing IDs for faster lookup
          const filteredIds = new Set(filteredViewings.map(v => v.id));
          
          // Keep only viewings that match the filters
          viewings = agentViewings.filter(viewing => filteredIds.has(viewing.id));
        } else {
          viewings = agentViewings;
        }
      } else if (userRole === 'team leader') {
        // Team leaders see their own and their team's viewings, with filters
        // Get team agent IDs first (needed for property ownership check)
        const User = require('../models/userModel');
        const teamAgents = await User.getTeamLeaderAgents(userId);
        const teamAgentIds = [userId, ...teamAgents.map(a => a.id)];
        
        // If filtering by property_id, verify the property belongs to the team leader or their team
        if (req.query.property_id) {
          const propertyId = parseInt(req.query.property_id, 10);
          if (!isNaN(propertyId)) {
            // Check if the property belongs to this team leader or their team agents
            const propertyCheck = await pool.query(
              'SELECT agent_id FROM properties WHERE id = $1',
              [propertyId]
            );
            
            if (propertyCheck.rows.length === 0) {
              // Property doesn't exist
              return res.json({
                success: true,
                data: [],
                message: 'Property not found'
              });
            }
            
            const propertyAgentId = propertyCheck.rows[0].agent_id;
            
            // Team leaders can only see viewings on their own properties or their team's properties
            if (propertyAgentId !== userId && !teamAgentIds.includes(propertyAgentId)) {
              logger.security('Team leader attempted to view viewings for property not in team', {
                teamLeaderId: userId,
                propertyId: propertyId,
                propertyAgentId: propertyAgentId
              });
              return res.json({
                success: true,
                data: [],
                message: 'Access denied. You can only view viewings on properties assigned to you or your team agents.'
              });
            }
          }
        }
        
        // First get all their team's viewings
        let teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          // Build filter that includes team agent IDs
          const filtersWithTeam = { ...req.query };
          const filteredViewings = await Viewing.getViewingsWithFilters(filtersWithTeam);
          
          // Create a Set of team agent IDs for faster lookup
          const teamAgentIdsSet = new Set(teamAgentIds);
          
          // Keep only viewings that match the filters AND belong to team
          viewings = filteredViewings.filter(viewing => teamAgentIdsSet.has(viewing.agent_id));
          
          // Also ensure we only include viewings that were in the original team viewings
          const teamViewingIds = new Set(teamViewings.map(v => v.id));
          viewings = viewings.filter(viewing => teamViewingIds.has(viewing.id));
        } else {
          viewings = teamViewings;
        }
      } else {
        // Admins, operations managers, operations, and agent managers see all viewings with filters
        viewings = await Viewing.getViewingsWithFilters(req.query);
      }
      
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/a101b0eb-224a-4f17-9c2b-5d6529445386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'viewingsController.js:100',message:'Sending response',data:{viewingsCount:viewings.length,viewingAgentIds:viewings.map(v=>v.agent_id),userRole,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
      // #endregion
      
      logger.debug('Sending filtered viewings response', {
        count: viewings.length,
        userRole,
        userId
      });
      
      res.json({
        success: true,
        data: viewings,
        message: `Retrieved ${viewings.length} filtered viewings`
      });
    } catch (error) {
      logger.error('Error getting filtered viewings', error);
      
      // Ensure response is sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve filtered viewings',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  }

  // Get single viewing by ID
  static async getViewingById(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Getting viewing by ID', { id });
      
      const viewing = await Viewing.getViewingById(id);
      
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Parent viewing not found'
        });
      }

      // Check if user has permission to view this viewing
      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      if (userRole === 'agent' && viewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this viewing'
        });
      }
      
      if (userRole === 'team leader') {
        // Check if viewing is assigned to team leader or their team agents
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === viewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this viewing'
          });
        }
      }
      
      res.json({
        success: true,
        data: viewing
      });
    } catch (error) {
      logger.error('Error getting viewing by ID', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing'
      });
    }
  }

  // Create new viewing
  static async createViewing(req, res) {
    try {
      logger.debug('Creating new viewing', {
        userId: req.user?.id,
        userRole: req.user?.role
      });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      // Validate required fields first (property_id, lead_id, date, time)
      if (!req.body.property_id || !req.body.lead_id) {
        return res.status(400).json({
          success: false,
          message: 'Property and Lead are required fields'
        });
      }
      
      if (!req.body.viewing_date || !req.body.viewing_time) {
        return res.status(400).json({
          success: false,
          message: 'Viewing date and time are required'
        });
      }
      
      // Security: For agents, check if the property belongs to them
      if (userRole === 'agent') {
        // Check if the property is assigned to this agent
        const propertyCheck = await pool.query(
          'SELECT agent_id FROM properties WHERE id = $1',
          [req.body.property_id]
        );
        
        if (propertyCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Property not found'
          });
        }
        
        const propertyAgentId = propertyCheck.rows[0].agent_id;
        
        // Agents can only create viewings for properties assigned to them
        // If property has no agent_id (NULL), agents cannot create viewings for it
        if (propertyAgentId !== userId) {
          logger.security('Agent attempted to create viewing for unassigned property', {
            agentId: userId,
            propertyId: req.body.property_id,
            propertyAgentId: propertyAgentId || null
          });
          return res.status(403).json({
            success: false,
            message: 'You can only create viewings for properties assigned to you'
          });
        }
        // Agents can ONLY assign viewings to themselves - ALWAYS override any agent_id they send
        // This prevents agents from assigning viewings to other agents, even if they manipulate the request
        if (req.body.agent_id && req.body.agent_id !== userId) {
          logger.security('Agent attempted to assign viewing to different agent', {
            agentId: userId,
            attemptedAgentId: req.body.agent_id
          });
          return res.status(403).json({
            success: false,
            message: 'You can only assign viewings to yourself'
          });
        }
        // ALWAYS set agent_id to the current user, ignoring any value they might have sent
        req.body.agent_id = userId;
      } else if (userRole === 'team leader') {
        // Team leaders can add viewings on:
        // 1. Their own properties (for themselves)
        // 2. Properties of agents under them (only for that specific agent)
        
        // Check if the property exists and get its agent_id
        const propertyCheck = await pool.query(
          'SELECT agent_id FROM properties WHERE id = $1',
          [req.body.property_id]
        );
        
        if (propertyCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Property not found'
          });
        }
        
        const propertyAgentId = propertyCheck.rows[0].agent_id;
        
        // Determine the target agent (who the viewing will be assigned to)
        const targetAgentId = req.body.agent_id || userId;
        
        // If property is assigned to the team leader, they can only assign to themselves
        if (propertyAgentId === userId) {
          if (targetAgentId !== userId) {
            return res.status(403).json({
              success: false,
              message: 'You can only add viewings to yourself on your own properties'
            });
          }
          req.body.agent_id = userId;
        } else if (propertyAgentId) {
          // Property is assigned to an agent - check if it's one of their agents
          const teamAgentsResult = await pool.query(
            `SELECT agent_id FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, propertyAgentId]
          );
          
          if (teamAgentsResult.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You can only add viewings on your own properties or properties of agents under your team'
            });
          }
          
          // Team leader can only assign viewing to the agent who owns the property
          if (targetAgentId !== propertyAgentId) {
            return res.status(403).json({
              success: false,
              message: `You can only add viewings on this property for the assigned agent (agent ID: ${propertyAgentId})`
            });
          }
          
          req.body.agent_id = propertyAgentId;
        } else {
          // Property has no agent assigned
          return res.status(403).json({
            success: false,
            message: 'You can only add viewings on properties assigned to you or your team agents'
          });
        }
      } else if (['admin', 'operations manager', 'operations', 'agent manager'].includes(userRole)) {
        // Admin, operations, operations manager, agent manager must assign an agent
        if (!req.body.agent_id) {
          return res.status(400).json({
            success: false,
            message: 'Agent assignment is required'
          });
        }
      }
      
      // Handle parent_viewing_id (sub-viewing)
      let finalLeadId = req.body.lead_id;
      let finalPropertyId = req.body.property_id;
      let finalAgentId = req.body.agent_id;
      
      if (req.body.parent_viewing_id) {
        // If this is a sub-viewing, get the parent viewing details
        const parentViewing = await Viewing.getViewingById(req.body.parent_viewing_id);
        if (!parentViewing) {
          return res.status(404).json({
            success: false,
            message: 'Parent viewing not found'
          });
        }
        
        // Sub-viewings must use the same lead_id, property_id, and agent_id as the parent
        finalLeadId = parentViewing.lead_id;
        finalPropertyId = parentViewing.property_id;
        finalAgentId = parentViewing.agent_id;
        
        logger.debug('Creating sub-viewing', {
          parentViewingId: req.body.parent_viewing_id,
          leadId: finalLeadId,
          propertyId: finalPropertyId,
          agentId: finalAgentId
        });
      }
      
      // Check for duplicate viewing - prevent multiple viewings for the same lead
      // Allow follow-up viewings (sub-viewings) but prevent duplicate parent viewings for same lead
      // Skip duplicate check for sub-viewings (they are always allowed)
      if (!req.body.parent_viewing_id) {
        const duplicateCheck = await pool.query(
          `SELECT id FROM viewings 
           WHERE lead_id = $1 
           AND property_id = $2 
           AND parent_viewing_id IS NULL
           AND id != COALESCE($3, -1)`,
          [finalLeadId, finalPropertyId, null]
        );
        
        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'A viewing already exists for this lead and property. You can add follow-up viewings to the existing viewing instead.'
          });
        }
      }
      
      // Create the viewing with potentially modified values for sub-viewings
      const viewingData = {
        ...req.body,
        lead_id: finalLeadId,
        property_id: finalPropertyId,
        agent_id: finalAgentId
      };
      const viewing = await Viewing.createViewing(viewingData);
      // Audit log: Viewing created
      const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Viewing created', {
        viewingId: viewing.id,
        propertyId: finalPropertyId,
        leadId: finalLeadId,
        agentId: finalAgentId,
        viewingDate: req.body.viewing_date,
        createdBy: req.user.id,
        createdByName: req.user.name,
        ip: clientIP
      });
      
      // Get the full viewing details with property and lead information
      const fullViewing = await Viewing.getViewingById(viewing.id);
      let responseViewing = fullViewing;

      // Handle optional initial update
      const initialUpdateTitle = (req.body.initial_update_title || '').trim();
      const initialUpdateDescription = (req.body.initial_update_description || '').trim();
      const initialUpdateDateInput = (req.body.initial_update_date || '').toString().trim();

      if (initialUpdateTitle || initialUpdateDescription) {
        try {
          const updateTextSegments = [];
          if (initialUpdateTitle) {
            updateTextSegments.push(initialUpdateTitle);
          }
          if (initialUpdateDescription) {
            updateTextSegments.push(initialUpdateDescription);
          }

          const updateText = updateTextSegments.join('\n\n').trim();
          if (updateText) {
            const updateDate = initialUpdateDateInput || new Date().toISOString().split('T')[0];

            // Create follow-up viewing instead of update
            const followUpViewingData = {
              property_id: viewing.property_id,
              lead_id: viewing.lead_id,
              agent_id: viewing.agent_id,
              parent_viewing_id: viewing.id,
              viewing_date: updateDate,
              viewing_time: new Date().toTimeString().slice(0, 5), // Default to current time
              status: 'Scheduled',
              is_serious: false,
              notes: updateText
            };
            await Viewing.createViewing(followUpViewingData);

            try {
              await ReminderService.clearViewingReminder(viewing.id);
            } catch (reminderError) {
              logger.error('Failed to clear viewing reminder after initial update', reminderError);
            }

            responseViewing = await Viewing.getViewingById(viewing.id);
          }
        } catch (initialUpdateError) {
          logger.error('Failed to create initial viewing update', initialUpdateError);
        }
      }
      
      // Create a calendar event for this viewing
      try {
        logger.debug('Creating calendar event for viewing', { viewingId: viewing.id });
        
        // Combine date and time to create start_time
        const viewingDate = new Date(req.body.viewing_date);
        const [hours, minutes] = req.body.viewing_time.split(':');
        viewingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Set end_time to 1 hour after start_time (default viewing duration)
        const endTime = new Date(viewingDate);
        endTime.setHours(endTime.getHours() + 1);
        
        // Create calendar event data
        const calendarEventData = {
          title: `Property Viewing - ${fullViewing.property_reference || 'N/A'}`,
          description: `Viewing with ${fullViewing.lead_name || 'N/A'} for property at ${fullViewing.property_location || 'N/A'}`,
          start_time: viewingDate,
          end_time: endTime,
          all_day: false,
          color: 'blue',
          type: 'showing',
          location: fullViewing.property_location || '',
          attendees: fullViewing.lead_name ? [fullViewing.lead_name] : [],
          notes: req.body.notes || `Viewing ID: ${viewing.id}`,
          created_by: userId,
          assigned_to: req.body.agent_id || userId,
          property_id: req.body.property_id,
          lead_id: req.body.lead_id
        };
        
        const calendarEvent = await CalendarEvent.createEvent(calendarEventData);
        logger.debug('Calendar event created successfully', {
          viewingId: viewing.id,
          calendarEventId: calendarEvent.id
        });
        
        // Link the calendar event ID to the viewing for future reference
        await ViewingsController.linkCalendarEventToViewing(viewing.id, calendarEvent.id);
      } catch (calendarError) {
        // Log the error but don't fail the viewing creation
        logger.error('Failed to create calendar event, but viewing was created', calendarError);
      }

      // Notify management roles about the new viewing
      try {
        const rolesToNotify = ['agent manager', 'operations', 'operations manager', 'admin'].map(role => role.toLowerCase());
        const recipientsResult = await pool.query(
          `SELECT id FROM users WHERE LOWER(role) = ANY($1::text[]) AND id <> $2`,
          [rolesToNotify, userId]
        );

        const recipientIds = Array.from(
          new Set(
            recipientsResult.rows
              .map((row) => Number(row.id))
              .filter((id) => Number.isInteger(id) && id > 0 && id !== userId)
          )
        );
        logger.debug('Viewing notification recipients', {
          viewingId: viewing.id,
          recipientCount: recipientIds.length
        });

        if (recipientIds.length > 0) {
          const propertyDetails = fullViewing.property_reference || fullViewing.property_location || 'a property';
          const leadDetails = fullViewing.lead_name ? ` with ${fullViewing.lead_name}` : '';

          let viewingDateStr = null;
          if (fullViewing.viewing_date) {
            const parsedDate = new Date(fullViewing.viewing_date);
            if (!Number.isNaN(parsedDate.getTime())) {
              viewingDateStr = parsedDate.toLocaleDateString('en-US');
            }
          }

          const dateDetails = viewingDateStr ? ` on ${viewingDateStr}` : '';
          const timeDetails = fullViewing.viewing_time ? ` at ${fullViewing.viewing_time}` : '';

          const message = `A new viewing has been scheduled for ${propertyDetails}${leadDetails}${dateDetails}${timeDetails}.`;
          logger.debug('Viewing notification message', { viewingId: viewing.id });

          const notificationPayload = {
            title: 'New Viewing Scheduled',
            message,
            type: 'info',
            entity_type: 'viewing',
            entity_id: viewing.id
          };

          const notificationPromises = recipientIds.map(async (recipientId) => {
            try {
              await Notification.createNotification({
                user_id: recipientId,
                ...notificationPayload
              });
              return true;
            } catch (notificationCreationError) {
              logger.error('Failed to create viewing notification', {
                viewingId: viewing.id,
                recipientId,
                error: notificationCreationError
              });
              return false;
            }
          });

          const results = await Promise.all(notificationPromises);
          const createdCount = results.filter(Boolean).length;
          logger.debug('Viewing notifications created', {
            viewingId: viewing.id,
            count: createdCount
          });
        }
      } catch (notificationError) {
        logger.error('Failed to create viewing notifications', notificationError);
      }
      
      res.status(201).json({
        success: true,
        data: responseViewing,
        message: 'Viewing created successfully'
      });
    } catch (error) {
      logger.error('Error creating viewing', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update viewing
  static async updateViewing(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Updating viewing', {
        viewingId: id,
        userId: req.user?.id
      });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Get existing viewing
      const existingViewing = await Viewing.getViewingById(id);
      if (!existingViewing) {
        return res.status(404).json({
          success: false,
          message: 'Parent viewing not found'
        });
      }

      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      // Check permissions
      if (userRole === 'agent' && existingViewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own viewings'
        });
      }
      
      if (userRole === 'team leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === existingViewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only update viewings assigned to you or your team'
          });
        }
      }
      
      // Agents cannot reassign viewings to others - ALWAYS override agent_id for agents
      if (userRole === 'agent') {
        if (req.body.agent_id && req.body.agent_id !== userId) {
          logger.security('Agent attempted to reassign viewing to different agent', {
            agentId: userId,
            viewingId: id,
            attemptedAgentId: req.body.agent_id
          });
          return res.status(403).json({
            success: false,
            message: 'You cannot reassign viewings to other agents'
          });
        }
        // ALWAYS set agent_id to the current user, preventing any reassignment
        req.body.agent_id = userId;
      } else if (userRole === 'team leader') {
        // Team leaders can reassign to themselves or agents under them
        if (req.body.agent_id && req.body.agent_id !== userId) {
          // Check if the agent is under this team leader
          const teamAgentsResult = await pool.query(
            `SELECT agent_id FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, req.body.agent_id]
          );
          
          if (teamAgentsResult.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You can only reassign viewings to yourself or agents under your team'
            });
          }
        }
      }
      
      // Normalize update payload to avoid accidental data resets
      const updatesToApply = { ...req.body };

      if (updatesToApply.viewing_date) {
        try {
          // Ensure date stays in YYYY-MM-DD format
          const parsedDate = new Date(updatesToApply.viewing_date);
          if (!isNaN(parsedDate.getTime())) {
            updatesToApply.viewing_date = parsedDate.toISOString().split('T')[0];
          } else {
            logger.warn('Invalid viewing_date format provided', { viewingId: id });
            delete updatesToApply.viewing_date;
          }
        } catch (dateError) {
          logger.warn('Error normalizing viewing_date', { viewingId: id, error: dateError });
          delete updatesToApply.viewing_date;
        }
      } else if (updatesToApply.viewing_date === '' || updatesToApply.viewing_date === null) {
        // Prevent empty strings/null from clearing the date
        delete updatesToApply.viewing_date;
      }

      if (updatesToApply.viewing_time) {
        updatesToApply.viewing_time = updatesToApply.viewing_time.toString().slice(0, 5);
      } else if (updatesToApply.viewing_time === '' || updatesToApply.viewing_time === null) {
        delete updatesToApply.viewing_time;
      }

      const viewing = await Viewing.updateViewing(id, updatesToApply);
      
      // Audit log: Viewing updated
      const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const changes = {};
      if (req.body.agent_id !== undefined && req.body.agent_id !== existingViewing.agent_id) {
        changes.agent_id = { from: existingViewing.agent_id, to: req.body.agent_id };
      }
      if (req.body.status !== undefined && req.body.status !== existingViewing.status) {
        changes.status = { from: existingViewing.status, to: req.body.status };
      }
      if (req.body.is_serious !== undefined && req.body.is_serious !== existingViewing.is_serious) {
        changes.is_serious = { from: existingViewing.is_serious, to: req.body.is_serious };
      }
      
      logger.security('Viewing updated', {
        viewingId: id,
        propertyId: viewing.property_id,
        leadId: viewing.lead_id,
        updatedBy: req.user.id,
        updatedByName: req.user.name,
        changes: Object.keys(changes).length > 0 ? changes : null,
        ip: clientIP
      });

      // Handle reminder tracking when status changes or agents are reassigned
      try {
        if (['Completed', 'Cancelled'].includes(viewing.status)) {
          await ReminderService.clearViewingReminder(id);
        } else if (
          Object.prototype.hasOwnProperty.call(updatesToApply, 'agent_id') &&
          updatesToApply.agent_id &&
          updatesToApply.agent_id !== existingViewing.agent_id
        ) {
          await ReminderService.clearViewingReminder(id, existingViewing.agent_id);
        }
      } catch (reminderError) {
        logger.error('Failed to update viewing reminder tracking', reminderError);
      }
      
      // Update the corresponding calendar event if date/time changed
      try {
        const calendarEvent = await ViewingsController.findCalendarEventByViewingId(id);
        
        if (calendarEvent) {
          logger.debug('Updating calendar event for viewing', { viewingId: id });
          
          // Get updated viewing details
          const updatedViewing = await Viewing.getViewingById(id);
          
          // Prepare calendar event updates
          const calendarUpdates = {};
          
          // Update date/time if changed
          if (updatesToApply.viewing_date || updatesToApply.viewing_time) {
            // Get the base date - use the updated viewing's date if not provided in request
            let dateStr = updatesToApply.viewing_date || updatedViewing.viewing_date;
            
            // Parse date properly - if it's already a Date object, format it
            if (dateStr instanceof Date) {
              dateStr = dateStr.toISOString().split('T')[0];
            } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
              // If it's an ISO string, extract just the date part
              dateStr = dateStr.split('T')[0];
            }
            
            // Get the time - use the updated viewing's time if not provided in request  
            let timeStr = updatesToApply.viewing_time || updatedViewing.viewing_time;
            
            // Handle time format (could be HH:MM:SS or HH:MM)
            if (timeStr && timeStr.length > 5) {
              timeStr = timeStr.substring(0, 5); // Extract HH:MM part only
            }
            
            // Create a new date with the specified date and time
            const [hours, minutes] = timeStr.split(':');
            const viewingDate = new Date(`${dateStr}T00:00:00`);
            viewingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const endTime = new Date(viewingDate);
            endTime.setHours(endTime.getHours() + 1);
            
            calendarUpdates.start_time = viewingDate;
            calendarUpdates.end_time = endTime;
            
            logger.debug('Date/Time update for calendar event', {
              viewingId: id,
              date: dateStr,
              time: timeStr
            });
          }
          
          // Update title if property changed
          if (updatesToApply.property_id) {
            calendarUpdates.title = `Property Viewing - ${updatedViewing.property_reference || 'N/A'}`;
            calendarUpdates.description = `Viewing with ${updatedViewing.lead_name || 'N/A'} for property at ${updatedViewing.property_location || 'N/A'}`;
            calendarUpdates.location = updatedViewing.property_location || '';
            calendarUpdates.property_id = updatesToApply.property_id;
          }
          
          // Update lead if changed
          if (updatesToApply.lead_id) {
            calendarUpdates.lead_id = updatesToApply.lead_id;
            calendarUpdates.description = `Viewing with ${updatedViewing.lead_name || 'N/A'} for property at ${updatedViewing.property_location || 'N/A'}`;
            calendarUpdates.attendees = updatedViewing.lead_name ? [updatedViewing.lead_name] : [];
          }
          
          // Update agent assignment if changed
          if (updatesToApply.agent_id) {
            calendarUpdates.assigned_to = updatesToApply.agent_id;
          }
          
          // Update notes if changed
          if (updatesToApply.notes) {
            calendarUpdates.notes = updatesToApply.notes + ` | Viewing ID: ${id}`;
          }
          
          // Update status-based color
          if (updatesToApply.status) {
            if (updatesToApply.status === 'Completed') {
              calendarUpdates.color = 'green';
            } else if (updatesToApply.status === 'Cancelled' || updatesToApply.status === 'No Show') {
              calendarUpdates.color = 'red';
            } else if (updatesToApply.status === 'Rescheduled') {
              calendarUpdates.color = 'yellow';
            }
          }
          
          if (Object.keys(calendarUpdates).length > 0) {
            await CalendarEvent.updateEvent(calendarEvent.id, calendarUpdates);
            logger.debug('Calendar event updated successfully', { viewingId: id });
          }
          } else {
          logger.debug('No calendar event found for viewing', { viewingId: id });
        }
      } catch (calendarError) {
        logger.error('Failed to update calendar event', calendarError);
      }
      
      res.json({
        success: true,
        data: viewing,
        message: 'Viewing updated successfully'
      });
    } catch (error) {
      logger.error('Error updating viewing', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update viewing'
      });
    }
  }

  // Delete viewing
  static async deleteViewing(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Deleting viewing', { viewingId: id, userId: req.user?.id });
      
      // Only admins, operations managers, and operations can delete viewings
      const role = normalizeRole(req.user.role);
      if (!['admin', 'operations manager', 'operations'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins, operations managers, and operations can delete viewings'
        });
      }
      
      // Try to delete the corresponding calendar event first
      try {
        const calendarEvent = await ViewingsController.findCalendarEventByViewingId(id);
        
        if (calendarEvent) {
          logger.debug('Deleting calendar event for viewing', { viewingId: id });
          await CalendarEvent.deleteEvent(calendarEvent.id);
          logger.debug('Calendar event deleted successfully', { viewingId: id });
          } else {
          logger.debug('No calendar event found for viewing', { viewingId: id });
        }
      } catch (calendarError) {
        logger.error('Failed to delete calendar event', calendarError);
        // Continue with viewing deletion even if calendar deletion fails
      }
      
      const viewing = await Viewing.deleteViewing(id);
      
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Parent viewing not found'
        });
      }
      
      // Audit log: Viewing deleted
      const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Viewing deleted', {
        viewingId: id,
        propertyId: existingViewing.property_id,
        leadId: existingViewing.lead_id,
        deletedBy: req.user.id,
        deletedByName: req.user.name,
        ip: clientIP
      });
      
      res.json({
        success: true,
        message: 'Viewing deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting viewing', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete viewing'
      });
    }
  }

  // Get viewing statistics
  static async getViewingStats(req, res) {
    try {
      logger.debug('Getting viewing statistics');
      
      const stats = await Viewing.getViewingStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting viewing stats', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get viewings by agent
  static async getViewingsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      logger.debug('Getting viewings for agent', { agentId, requestedBy: userId, userRole });
      
      // Permission checks
      if (userRole === 'agent') {
        // Agents can only view their own viewings
        if (parseInt(agentId) !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own viewings'
          });
        }
      } else if (userRole === 'team leader') {
        // Team leaders can only view their own viewings or their team's agents' viewings
        if (parseInt(agentId) !== userId) {
          // Check if the agent is under this team leader
          const teamAgentsResult = await pool.query(
            `SELECT agent_id FROM team_agents 
             WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = TRUE`,
            [userId, agentId]
          );
          
          if (teamAgentsResult.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You can only view viewings for yourself or agents under your team'
            });
          }
        }
      }
      // Admins, operations managers, operations, and agent managers can view any agent's viewings
      
      const viewings = await Viewing.getViewingsByAgent(agentId);
      
      res.json({
        success: true,
        data: viewings
      });
    } catch (error) {
      logger.error('Error getting viewings by agent', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve agent viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Add follow-up viewing (replaces addViewingUpdate)
  static async addViewingUpdate(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Adding follow-up viewing', { parentViewingId: id, userId: req.user?.id });
      
      // Extract follow-up viewing data from request
      // Support both old format (update_text, update_date) and new format (viewing_date, viewing_time, status, notes)
      const { 
        update_text, 
        update_date, 
        status: updateStatus,
        viewing_date,
        viewing_time,
        status,
        notes
      } = req.body;
      
      // Check if viewing exists and user has access
      const parentViewing = await Viewing.getViewingById(id);
      if (!parentViewing) {
        return res.status(404).json({
          success: false,
          message: 'Parent viewing not found'
        });
      }
      
      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;
      
      // Check permissions
      if (userRole === 'agent' && parentViewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only add follow-up viewings to your own viewings'
        });
      }
      
      if (userRole === 'team leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === parentViewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only add follow-up viewings to viewings assigned to you or your team'
          });
        }
      }
      
      // Determine follow-up viewing data
      // If viewing_date/viewing_time provided, use new format; otherwise, try to parse from update_text/update_date
      let followUpViewingDate = viewing_date;
      let followUpViewingTime = viewing_time;
      let followUpStatus = status || updateStatus || 'Scheduled';
      let followUpNotes = notes;
      
      // If using old format (update_text, update_date), convert to follow-up viewing
      if (!followUpViewingDate && update_date) {
        followUpViewingDate = update_date;
        // Default time to current time if not provided
        followUpViewingTime = viewing_time || new Date().toTimeString().slice(0, 5);
      }
      
      // If no date provided, use current date
      if (!followUpViewingDate) {
        followUpViewingDate = new Date().toISOString().split('T')[0];
      }
      
      // If no time provided, use current time
      if (!followUpViewingTime) {
        followUpViewingTime = new Date().toTimeString().slice(0, 5);
      }
      
      // Use update_text as notes if provided and no notes given
      if (!followUpNotes && update_text) {
        followUpNotes = update_text.trim();
      }
      
      // Create follow-up viewing with same client, property, and agent as parent
      const followUpViewingData = {
        property_id: parentViewing.property_id,
        lead_id: parentViewing.lead_id,
        agent_id: parentViewing.agent_id,
        parent_viewing_id: id,
        viewing_date: followUpViewingDate,
        viewing_time: followUpViewingTime,
        status: followUpStatus,
        is_serious: false,
        notes: followUpNotes || null
      };
      
      const followUpViewing = await Viewing.createViewing(followUpViewingData);
      
      logger.debug('Follow-up viewing created successfully', { parentViewingId: id });

      try {
        await ReminderService.clearViewingReminder(id);
      } catch (reminderError) {
        logger.error('Failed to reset viewing reminder tracking after follow-up viewing', reminderError);
      }
      
      // Get full follow-up viewing details
      const fullFollowUpViewing = await Viewing.getViewingById(followUpViewing.id);
      
      res.status(201).json({
        success: true,
        data: fullFollowUpViewing,
        message: 'Follow-up viewing created successfully'
      });
    } catch (error) {
      logger.error('Error adding follow-up viewing', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create follow-up viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update follow-up viewing (replaces updateViewingUpdate)
  // The updateId is now a follow-up viewing ID
  static async updateViewingUpdate(req, res) {
    try {
      const { id, updateId } = req.params;
      logger.debug('Updating follow-up viewing', { updateId, parentViewingId: id });

      const viewingId = parseInt(id, 10);
      const followUpViewingId = parseInt(updateId, 10);

      if (Number.isNaN(viewingId) || Number.isNaN(followUpViewingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid viewing or follow-up viewing identifier'
        });
      }

      // Check parent viewing exists
      const parentViewing = await Viewing.getViewingById(viewingId);
      if (!parentViewing) {
        return res.status(404).json({
          success: false,
          message: 'Parent viewing not found'
        });
      }

      // Check follow-up viewing exists and is linked to parent
      const followUpViewing = await Viewing.getViewingById(followUpViewingId);
      if (!followUpViewing || followUpViewing.parent_viewing_id !== viewingId) {
        return res.status(404).json({
          success: false,
          message: 'Follow-up viewing not found or not linked to this parent viewing'
        });
      }

      const userRole = normalizeRole(req.user.role);
      const userId = req.user.id;

      // Check permissions (same as updating a regular viewing)
      if (userRole === 'agent' && followUpViewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own follow-up viewings'
        });
      }

      if (userRole === 'team leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === followUpViewing.agent_id || followUpViewing.agent_id === userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only update follow-up viewings for your team'
          });
        }
      }

      // Prepare update payload
      // Support both old format (update_text, update_date) and new format (viewing_date, viewing_time, status, notes)
      const { 
        update_text, 
        update_date, 
        viewing_date,
        viewing_time,
        status,
        notes
      } = req.body;

      const updatePayload = {};

      // Map old format to new format
      if (viewing_date !== undefined) {
        updatePayload.viewing_date = viewing_date;
      } else if (update_date !== undefined) {
        updatePayload.viewing_date = update_date;
      }

      if (viewing_time !== undefined) {
        updatePayload.viewing_time = viewing_time;
      }

      if (status !== undefined) {
        updatePayload.status = status;
      }

      if (notes !== undefined) {
        updatePayload.notes = notes;
      } else if (update_text !== undefined) {
        updatePayload.notes = update_text.trim();
      }

      // Update the follow-up viewing
      const updatedViewing = await Viewing.updateViewing(followUpViewingId, updatePayload);
      const refreshedViewing = await Viewing.getViewingById(followUpViewingId);

      logger.debug('Follow-up viewing updated successfully', { updateId, parentViewingId: id });

      res.json({
        success: true,
        data: refreshedViewing,
        message: 'Follow-up viewing updated successfully'
      });
    } catch (error) {
      logger.error('Error updating follow-up viewing', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update follow-up viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get follow-up viewings for a viewing (replaces getViewingUpdates)
  static async getViewingUpdates(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Getting follow-up viewings', { viewingId: id });

      const viewing = await Viewing.getViewingById(id);
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }

      // Return sub-viewings (follow-up viewings) instead of updates
      const subViewings = viewing.sub_viewings || [];

      res.json({
        success: true,
        data: subViewings,
        message: `Retrieved ${subViewings.length} follow-up viewings`
      });
    } catch (error) {
      logger.error('Error getting follow-up viewings', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve follow-up viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete follow-up viewing (replaces deleteViewingUpdate)
  static async deleteViewingUpdate(req, res) {
    try {
      const { id, updateId } = req.params;
      logger.debug('Deleting follow-up viewing', { updateId, parentViewingId: id });

      const viewingId = parseInt(id, 10);
      const followUpViewingId = parseInt(updateId, 10);

      if (Number.isNaN(viewingId) || Number.isNaN(followUpViewingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid viewing or follow-up viewing identifier'
        });
      }

      // Check parent viewing exists
      const parentViewing = await Viewing.getViewingById(viewingId);
      if (!parentViewing) {
        return res.status(404).json({
          success: false,
          message: 'Parent viewing not found'
        });
      }

      // Check follow-up viewing exists and is linked to parent
      const followUpViewing = await Viewing.getViewingById(followUpViewingId);
      if (!followUpViewing || followUpViewing.parent_viewing_id !== viewingId) {
        return res.status(404).json({
          success: false,
          message: 'Follow-up viewing not found or not linked to this parent viewing'
        });
      }

      // Only admins, operations managers, and operations can delete
      const role = normalizeRole(req.user.role);
      if (!['admin', 'operations manager', 'operations'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins, operations managers, and operations can delete follow-up viewings'
        });
      }
      
      // Delete the follow-up viewing
      await Viewing.deleteViewing(followUpViewingId);
      
      logger.debug('Follow-up viewing deleted successfully', { updateId, parentViewingId: id });
      
      res.json({
        success: true,
        message: 'Follow-up viewing deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting follow-up viewing', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete follow-up viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get count of properties with serious viewings for a list of property IDs
  static async getSeriousViewingsCount(req, res) {
    try {
      const { property_ids } = req.query;
      
      if (!property_ids) {
        return res.status(400).json({
          success: false,
          message: 'property_ids query parameter is required'
        });
      }
      
      // Parse property IDs from comma-separated string
      const propertyIds = property_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (propertyIds.length === 0) {
        return res.json({
          success: true,
          count: 0
        });
      }
      
      // Query to count distinct properties with serious viewings
      const result = await pool.query(
        `SELECT COUNT(DISTINCT property_id) as count
         FROM viewings 
         WHERE property_id = ANY($1::int[]) 
         AND is_serious = true`,
        [propertyIds]
      );
      
      const count = parseInt(result.rows[0]?.count || 0);
      
      res.json({
        success: true,
        count
      });
    } catch (error) {
      logger.error('Error getting serious viewings count', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get serious viewings count',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ViewingsController;

