// controllers/viewingsController.js
const Viewing = require('../models/viewingModel');
const CalendarEvent = require('../models/calendarEventModel');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

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
      console.error('Error finding calendar event by viewing ID:', error);
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
      console.error('Error linking calendar event to viewing:', error);
    }
  }
  // Get all viewings (with role-based filtering)
  static async getAllViewings(req, res) {
    try {
      console.log('📋 Getting all viewings for user:', req.user?.name, 'Role:', req.user?.role);
      
      const viewings = await Viewing.getViewingsForAgent(req.user.id, req.user.role);
      
      res.json({
        success: true,
        data: viewings,
        message: `Retrieved ${viewings.length} viewings`,
        userRole: req.user.role
      });
    } catch (error) {
      console.error('❌ Error getting viewings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get viewings with filters
  static async getViewingsWithFilters(req, res) {
    try {
      console.log('🔍 Getting filtered viewings for user:', req.user?.name, 'Filters:', req.query);
      
      let viewings;
      const userRole = req.user.role;
      const userId = req.user.id;
      
      if (userRole === 'agent') {
        // Agents see only their viewings, with filters
        viewings = await Viewing.getViewingsByAgent(userId);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredViewings = await Viewing.getViewingsWithFilters(req.query);
          viewings = viewings.filter(viewing => 
            filteredViewings.some(filtered => filtered.id === viewing.id)
          );
        }
      } else if (userRole === 'team_leader') {
        // Team leaders see their own and their team's viewings, with filters
        viewings = await Viewing.getViewingsForTeamLeader(userId);
        // Apply additional filters if provided
        if (Object.keys(req.query).length > 0) {
          const filteredViewings = await Viewing.getViewingsWithFilters(req.query);
          viewings = viewings.filter(viewing => 
            filteredViewings.some(filtered => filtered.id === viewing.id)
          );
        }
      } else {
        // Admins, operations managers, operations, and agent managers see all viewings with filters
        viewings = await Viewing.getViewingsWithFilters(req.query);
      }
      
      res.json({
        success: true,
        data: viewings,
        message: `Retrieved ${viewings.length} filtered viewings`
      });
    } catch (error) {
      console.error('❌ Error getting filtered viewings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve filtered viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get single viewing by ID
  static async getViewingById(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Getting viewing by ID:', id);
      
      const viewing = await Viewing.getViewingById(id);
      
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }

      // Check if user has permission to view this viewing
      const userRole = req.user.role;
      const userId = req.user.id;
      
      if (userRole === 'agent' && viewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this viewing'
        });
      }
      
      if (userRole === 'team_leader') {
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
      console.error('❌ Error getting viewing by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Create new viewing
  static async createViewing(req, res) {
    try {
      console.log('➕ Creating new viewing');
      console.log('📋 Request body:', req.body);
      console.log('👤 User:', req.user?.name, 'Role:', req.user?.role);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Check permissions for agent assignment
      // Agents and team leaders can only assign viewings to themselves
      if (['agent', 'team_leader'].includes(userRole)) {
        if (req.body.agent_id && req.body.agent_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only assign viewings to yourself'
          });
        }
        // Auto-assign to the current user if not specified
        req.body.agent_id = userId;
      }
      
      // Validate required fields
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
      
      // Create the viewing
      const viewing = await Viewing.createViewing(req.body);
      console.log('✅ Viewing created successfully:', viewing.id);
      
      // Get the full viewing details with property and lead information
      const fullViewing = await Viewing.getViewingById(viewing.id);
      
      // Create a calendar event for this viewing
      try {
        console.log('📅 Creating calendar event for viewing...');
        
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
        console.log('✅ Calendar event created successfully:', calendarEvent.id);
        
        // Link the calendar event ID to the viewing for future reference
        await ViewingsController.linkCalendarEventToViewing(viewing.id, calendarEvent.id);
      } catch (calendarError) {
        // Log the error but don't fail the viewing creation
        console.error('⚠️ Failed to create calendar event, but viewing was created:', calendarError);
        console.error('Calendar error details:', calendarError.message);
      }
      
      res.status(201).json({
        success: true,
        data: fullViewing,
        message: 'Viewing created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating viewing:', error);
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
      console.log('🔧 Updating viewing:', id);
      console.log('📋 Update data:', req.body);
      
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
          message: 'Viewing not found'
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Check permissions
      if (userRole === 'agent' && existingViewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own viewings'
        });
      }
      
      if (userRole === 'team_leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === existingViewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only update viewings assigned to you or your team'
          });
        }
      }
      
      // Agents and team leaders cannot reassign viewings to others
      if (['agent', 'team_leader'].includes(userRole) && req.body.agent_id && req.body.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You cannot reassign viewings to other agents'
        });
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
            console.warn('⚠️ Invalid viewing_date format provided, keeping original value');
            delete updatesToApply.viewing_date;
          }
        } catch (dateError) {
          console.warn('⚠️ Error normalizing viewing_date, keeping original value:', dateError);
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
      console.log('✅ Viewing updated successfully');
      
      // Update the corresponding calendar event if date/time changed
      try {
        const calendarEvent = await ViewingsController.findCalendarEventByViewingId(id);
        
        if (calendarEvent) {
          console.log('📅 Updating calendar event for viewing...');
          
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
            
            console.log(`📅 Date/Time update: Date=${dateStr}, Time=${timeStr}, Result=${viewingDate.toISOString()}`);
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
            console.log('✅ Calendar event updated successfully');
          }
        } else {
          console.log('⚠️ No calendar event found for this viewing');
        }
      } catch (calendarError) {
        console.error('⚠️ Failed to update calendar event:', calendarError);
      }
      
      res.json({
        success: true,
        data: viewing,
        message: 'Viewing updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating viewing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete viewing
  static async deleteViewing(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Deleting viewing:', id);
      
      // Only admins and operations managers can delete viewings
      if (!['admin', 'operations manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and operations managers can delete viewings'
        });
      }
      
      // Try to delete the corresponding calendar event first
      try {
        const calendarEvent = await ViewingsController.findCalendarEventByViewingId(id);
        
        if (calendarEvent) {
          console.log('📅 Deleting calendar event for viewing...');
          await CalendarEvent.deleteEvent(calendarEvent.id);
          console.log('✅ Calendar event deleted successfully');
        } else {
          console.log('⚠️ No calendar event found for this viewing');
        }
      } catch (calendarError) {
        console.error('⚠️ Failed to delete calendar event:', calendarError);
        // Continue with viewing deletion even if calendar deletion fails
      }
      
      const viewing = await Viewing.deleteViewing(id);
      
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }
      
      console.log('✅ Viewing deleted successfully');
      
      res.json({
        success: true,
        message: 'Viewing deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting viewing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete viewing',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get viewing statistics
  static async getViewingStats(req, res) {
    try {
      console.log('📊 Getting viewing statistics');
      
      const stats = await Viewing.getViewingStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Error getting viewing stats:', error);
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
      console.log('🔍 Getting viewings for agent:', agentId);
      
      const viewings = await Viewing.getViewingsByAgent(agentId);
      
      res.json({
        success: true,
        data: viewings
      });
    } catch (error) {
      console.error('❌ Error getting viewings by agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve agent viewings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Add update to viewing
  static async addViewingUpdate(req, res) {
    try {
      const { id } = req.params;
      console.log('➕ Adding update to viewing:', id);
      
      const { update_text, update_date } = req.body;
      
      if (!update_text || !update_text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Update text is required'
        });
      }
      
      // Check if viewing exists and user has access
      const viewing = await Viewing.getViewingById(id);
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }
      
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Check permissions
      if (userRole === 'agent' && viewing.agent_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only add updates to your own viewings'
        });
      }
      
      if (userRole === 'team_leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const hasAccess = teamViewings.some(v => v.id === viewing.id);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You can only add updates to viewings assigned to you or your team'
          });
        }
      }
      
      const updateData = {
        update_text: update_text.trim(),
        update_date: update_date || new Date().toISOString().split('T')[0],
        created_by: userId
      };
      
      const update = await Viewing.addViewingUpdate(id, updateData);
      
      console.log('✅ Viewing update added successfully');
      
      res.status(201).json({
        success: true,
        data: update,
        message: 'Update added successfully'
      });
    } catch (error) {
      console.error('❌ Error adding viewing update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add viewing update',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update viewing update
  static async updateViewingUpdate(req, res) {
    try {
      const { id, updateId } = req.params;
      console.log('✏️ Updating viewing update:', updateId, 'for viewing:', id);

      const viewingId = parseInt(id, 10);
      const viewingUpdateId = parseInt(updateId, 10);

      if (Number.isNaN(viewingId) || Number.isNaN(viewingUpdateId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid viewing or update identifier'
        });
      }

      const { update_text, update_date } = req.body;

      if (update_text !== undefined && (!update_text || !update_text.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Update text cannot be empty'
        });
      }

      const viewing = await Viewing.getViewingById(viewingId);
      if (!viewing) {
        return res.status(404).json({
          success: false,
          message: 'Viewing not found'
        });
      }

      const existingUpdate = await Viewing.getViewingUpdateById(viewingUpdateId);
      if (!existingUpdate || existingUpdate.viewing_id !== viewingId) {
        return res.status(404).json({
          success: false,
          message: 'Viewing update not found'
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      const privilegedRoles = ['admin', 'operations manager', 'operations', 'agent manager'];

      let hasAccess = false;

      if (privilegedRoles.includes(userRole)) {
        hasAccess = true;
      } else if (userRole === 'agent') {
        hasAccess = viewing.agent_id === userId && existingUpdate.created_by === userId;
      } else if (userRole === 'team_leader') {
        const teamViewings = await Viewing.getViewingsForTeamLeader(userId);
        const canAccessViewing = teamViewings.some(v => v.id === viewing.id);
        hasAccess = canAccessViewing && existingUpdate.created_by === userId;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this update'
        });
      }

      const updatePayload = {};

      if (update_text !== undefined) {
        updatePayload.update_text = update_text.trim();
      }

      if (update_date !== undefined) {
        if (!update_date) {
          return res.status(400).json({
            success: false,
            message: 'Update date cannot be empty'
          });
        }

        const parsedDate = new Date(update_date);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid update date provided'
          });
        }

        updatePayload.update_date = parsedDate.toISOString().split('T')[0];
      }

      await Viewing.updateViewingUpdate(viewingUpdateId, updatePayload);
      const refreshedUpdate = await Viewing.getViewingUpdateById(viewingUpdateId);

      console.log('✅ Viewing update edited successfully');

      res.json({
        success: true,
        data: refreshedUpdate,
        message: 'Update edited successfully'
      });
    } catch (error) {
      console.error('❌ Error updating viewing update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update viewing update',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get updates for a viewing
  static async getViewingUpdates(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Getting updates for viewing:', id);
      
      const updates = await Viewing.getViewingUpdates(id);
      
      res.json({
        success: true,
        data: updates
      });
    } catch (error) {
      console.error('❌ Error getting viewing updates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve viewing updates',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete viewing update
  static async deleteViewingUpdate(req, res) {
    try {
      const { id, updateId } = req.params;
      console.log('🗑️ Deleting update:', updateId, 'from viewing:', id);
      
      // Only admins and operations managers can delete updates
      if (!['admin', 'operations manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and operations managers can delete updates'
        });
      }
      
      const update = await Viewing.deleteViewingUpdate(updateId);
      
      if (!update) {
        return res.status(404).json({
          success: false,
          message: 'Update not found'
        });
      }
      
      console.log('✅ Viewing update deleted successfully');
      
      res.json({
        success: true,
        message: 'Update deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting viewing update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete viewing update',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ViewingsController;

