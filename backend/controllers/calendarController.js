// controllers/calendarController.js
const calendarEventModel = require('../models/calendarEventModel');
const Notification = require('../models/notificationModel');
const pool = require('../config/db');

// Role hierarchy levels (higher number = higher authority)
const ROLE_HIERARCHY = {
  'admin': 6,
  'operations manager': 5,
  'operations': 4,
  'agent manager': 3,
  'team_leader': 2,
  'agent': 1,
  'accountant': 1
};

// Helper function to get user IDs from attendee names
const getAttendeeUserIds = async (attendeeNames) => {
  if (!attendeeNames || attendeeNames.length === 0) {
    return [];
  }
  
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE name = ANY($1)',
      [attendeeNames]
    );
    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error getting attendee user IDs:', error);
    return [];
  }
};

// Helper function to check if a user can edit an event based on hierarchy
const canEditEvent = async (editorId, editorRole, eventId) => {
  try {
    // Get the event details
    const event = await calendarEventModel.getEventById(eventId);
    if (!event) {
      return { canEdit: false, reason: 'Event not found' };
    }

    const editorLevel = ROLE_HIERARCHY[editorRole] || 0;
    const creatorLevel = ROLE_HIERARCHY[event.created_by_role] || 0;

    // Users can always edit their own events (highest priority)
    if (event.created_by === editorId) {
      return { canEdit: true, reason: 'You can edit your own events' };
    }

    // Admin can edit everything
    if (editorRole === 'admin') {
      return { canEdit: true, reason: 'Admin can edit all events' };
    }

    // Operations Manager can edit operations and below
    if (editorRole === 'operations manager') {
      if (event.created_by_role === 'operations' || event.created_by_role === 'agent manager' || 
          event.created_by_role === 'team_leader' || event.created_by_role === 'agent' || 
          event.created_by_role === 'accountant') {
        return { canEdit: true, reason: 'Operations Manager can edit operations and below' };
      }
    }

    // Operations can only edit themselves and other operations
    if (editorRole === 'operations') {
      if (event.created_by_role === 'operations' || event.created_by === editorId) {
        return { canEdit: true, reason: 'Operations can edit operations events' };
      }
    }

    // Agent Manager can edit anything related to agents
    if (editorRole === 'agent manager') {
      if (event.created_by_role === 'agent' || event.created_by_role === 'team_leader' || 
          event.assigned_to_role === 'agent' || event.assigned_to_role === 'team_leader') {
        return { canEdit: true, reason: 'Agent Manager can edit agent-related events' };
      }
    }

    // Team Leader can edit events for agents under them
    if (editorRole === 'team_leader') {
      // Check if the event creator or assignee is an agent under this team leader
      const isAgentUnderTeamLeader = await calendarEventModel.isAgentUnderTeamLeader(editorId, event.created_by);
      const isAssignedToAgentUnderTeamLeader = await calendarEventModel.isAgentUnderTeamLeader(editorId, event.assigned_to);
      
      if (isAgentUnderTeamLeader || isAssignedToAgentUnderTeamLeader) {
        return { canEdit: true, reason: 'Team Leader can edit events for their agents' };
      }
    }

    // Agents cannot edit other users' events (their own events are handled above)
    if (editorRole === 'agent') {
      return { canEdit: false, reason: 'Agents can only edit their own events' };
    }

    return { canEdit: false, reason: 'Insufficient permissions based on role hierarchy' };

  } catch (error) {
    console.error('Error checking edit permissions:', error);
    return { canEdit: false, reason: 'Error checking permissions' };
  }
};

// Get all events (filtered by user role)
const getAllEvents = async (req, res) => {
  try {
    const { roleFilters } = req;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let events;
    
    // Use hierarchy-based filtering for all roles
    events = await calendarEventModel.getEventsForUserWithHierarchy(userId, userRole);
    
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        assignedTo: event.assigned_to,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }))
    });
  } catch (error) {
    console.error('Error fetching all events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Get events by date range (filtered by user role)
const getEventsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    const { roleFilters } = req;
    const userId = req.user.id;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required'
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    let events;
    
    // Use hierarchy-based filtering for all roles
    events = await calendarEventModel.getEventsForUserWithHierarchyByDateRange(userId, userRole, startDate, endDate);
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }))
    });
  } catch (error) {
    console.error('Error fetching events by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Get events by month
const getEventsByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    const { roleFilters } = req;
    const userId = req.user.id;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month'
      });
    }

    let events;
    
    // Use hierarchy-based filtering for all roles
    const allUserEvents = await calendarEventModel.getEventsForUserWithHierarchy(userId, userRole);
    events = allUserEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.getFullYear() === yearNum && eventDate.getMonth() + 1 === monthNum;
    });
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }))
    });
  } catch (error) {
    console.error('Error fetching events by month:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Get events by week
const getEventsByWeek = async (req, res) => {
  try {
    const { startOfWeek } = req.query;
    const { roleFilters } = req;
    const userId = req.user.id;
    
    if (!startOfWeek) {
      return res.status(400).json({
        success: false,
        message: 'Start of week date is required'
      });
    }

    const startDate = new Date(startOfWeek);

    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    let events;
    
    // Use hierarchy-based filtering for all roles
    // Calculate end of week (7 days later)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    events = await calendarEventModel.getEventsForUserWithHierarchyByDateRange(userId, userRole, startDate, endDate);
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }))
    });
  } catch (error) {
    console.error('Error fetching events by week:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Get events by day
const getEventsByDay = async (req, res) => {
  try {
    const { date } = req.query;
    const { roleFilters } = req;
    const userId = req.user.id;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    let events;
    
    // Use hierarchy-based filtering for all roles
    // Get events for the entire day (start to end of day)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    events = await calendarEventModel.getEventsForUserWithHierarchyByDateRange(userId, userRole, startOfDay, endOfDay);
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }))
    });
  } catch (error) {
    console.error('Error fetching events by day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Get event by ID
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    const event = await calendarEventModel.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }
    });
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
};

// Create new event
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      start,
      end,
      allDay,
      color,
      type,
      location,
      attendees,
      notes,
      propertyId,
      leadId
    } = req.body;

    // Basic validation
    if (!title || !start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and end time are required'
      });
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const eventData = {
      title: title.trim(),
      description: description?.trim() || null,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay || false,
      color: color || 'blue',
      type: type || 'other',
      location: location?.trim() || null,
      attendees: attendees || [],
      notes: notes?.trim() || null,
      created_by: req.user?.id || null,
      assigned_to: req.user?.id || null, // Assign event to the user who creates it
      property_id: propertyId || null,
      lead_id: leadId || null
    };

    const newEvent = await calendarEventModel.createEvent(eventData);
    
    // Create notifications for relevant users
    try {
      await Notification.createCalendarEventNotification(
        newEvent.id,
        'created',
        {
          title: newEvent.title,
          description: newEvent.description,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          location: newEvent.location
        },
        req.user.id
      );

      // If event is assigned to someone other than the creator, create specific assignment notification
      if (eventData.assigned_to && eventData.assigned_to !== req.user.id) {
        await Notification.createCalendarEventAssignmentNotification(
          newEvent.id,
          eventData.assigned_to,
          {
            title: newEvent.title,
            start_time: newEvent.start_time,
            end_time: newEvent.end_time,
            location: newEvent.location
          }
        );
      }

      // If there are attendees, create specific attendee notifications
      if (eventData.attendees && eventData.attendees.length > 0) {
        const attendeeUserIds = await getAttendeeUserIds(eventData.attendees);
        if (attendeeUserIds.length > 0) {
          await Notification.createCalendarEventAttendeeNotifications(
            newEvent.id,
            attendeeUserIds,
            {
              title: newEvent.title,
              start_time: newEvent.start_time,
              end_time: newEvent.end_time,
              location: newEvent.location
            }
          );
        }
      }
    } catch (notificationError) {
      console.error('Error creating calendar event notifications:', notificationError);
      // Don't fail the event creation if notifications fail
    }
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        start: newEvent.start_time,
        end: newEvent.end_time,
        allDay: newEvent.all_day,
        color: newEvent.color,
        type: newEvent.type,
        location: newEvent.location,
        attendees: newEvent.attendees || [],
        notes: newEvent.notes,
        createdBy: newEvent.created_by,
        createdAt: newEvent.created_at,
        updatedAt: newEvent.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    // Check if event exists
    const existingEvent = await calendarEventModel.findById(id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user can edit this event based on hierarchy
    const editPermission = await canEditEvent(req.user.id, req.user.role, id);
    if (!editPermission.canEdit) {
      return res.status(403).json({
        success: false,
        message: `Access denied: ${editPermission.reason}`
      });
    }

    // Validate dates if provided
    if (updates.start || updates.end) {
      const startTime = updates.start ? new Date(updates.start) : new Date(existingEvent.start_time);
      const endTime = updates.end ? new Date(updates.end) : new Date(existingEvent.end_time);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.start !== undefined) updateData.start_time = new Date(updates.start);
    if (updates.end !== undefined) updateData.end_time = new Date(updates.end);
    if (updates.allDay !== undefined) updateData.all_day = updates.allDay;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.location !== undefined) updateData.location = updates.location?.trim() || null;
    if (updates.attendees !== undefined) updateData.attendees = updates.attendees;
    if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId || null;
    if (updates.leadId !== undefined) updateData.lead_id = updates.leadId || null;

    const updatedEvent = await calendarEventModel.updateEvent(id, updateData);
    
    // Create notifications for relevant users
    try {
      await Notification.createCalendarEventNotification(
        parseInt(id),
        'updated',
        {
          title: updatedEvent.title,
          description: updatedEvent.description,
          start_time: updatedEvent.start_time,
          end_time: updatedEvent.end_time,
          location: updatedEvent.location
        },
        req.user.id
      );

      // If assignment changed, create specific assignment notification
      if (updates.assignedTo && updates.assignedTo !== existingEvent.assigned_to && updates.assignedTo !== req.user.id) {
        await Notification.createCalendarEventAssignmentNotification(
          parseInt(id),
          updates.assignedTo,
          {
            title: updatedEvent.title,
            start_time: updatedEvent.start_time,
            end_time: updatedEvent.end_time,
            location: updatedEvent.location
          }
        );
      }

      // If attendees changed, create specific attendee notifications for new attendees
      if (updates.attendees && updates.attendees.length > 0) {
        const attendeeUserIds = await getAttendeeUserIds(updates.attendees);
        if (attendeeUserIds.length > 0) {
          await Notification.createCalendarEventAttendeeNotifications(
            parseInt(id),
            attendeeUserIds,
            {
              title: updatedEvent.title,
              start_time: updatedEvent.start_time,
              end_time: updatedEvent.end_time,
              location: updatedEvent.location
            }
          );
        }
      }
    } catch (notificationError) {
      console.error('Error creating calendar event update notifications:', notificationError);
      // Don't fail the event update if notifications fail
    }
    
    res.json({
      success: true,
      message: 'Event updated successfully',
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        start: updatedEvent.start_time,
        end: updatedEvent.end_time,
        allDay: updatedEvent.all_day,
        color: updatedEvent.color,
        type: updatedEvent.type,
        location: updatedEvent.location,
        attendees: updatedEvent.attendees || [],
        notes: updatedEvent.notes,
        createdBy: updatedEvent.created_by,
        createdAt: updatedEvent.created_at,
        updatedAt: updatedEvent.updated_at,
        propertyId: updatedEvent.property_id,
        propertyReference: updatedEvent.property_reference,
        propertyLocation: updatedEvent.property_location,
        leadId: updatedEvent.lead_id,
        leadName: updatedEvent.lead_name,
        leadPhone: updatedEvent.lead_phone
      }
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    // Check if event exists
    const existingEvent = await calendarEventModel.findById(id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user can delete this event based on hierarchy
    const editPermission = await canEditEvent(req.user.id, req.user.role, id);
    if (!editPermission.canEdit) {
      return res.status(403).json({
        success: false,
        message: `Access denied: ${editPermission.reason}`
      });
    }

    // Create notifications for relevant users before deleting
    try {
      await Notification.createCalendarEventNotification(
        parseInt(id),
        'deleted',
        {
          title: existingEvent.title,
          description: existingEvent.description,
          start_time: existingEvent.start_time,
          end_time: existingEvent.end_time,
          location: existingEvent.location
        },
        req.user.id
      );
    } catch (notificationError) {
      console.error('Error creating calendar event deletion notifications:', notificationError);
      // Don't fail the event deletion if notifications fail
    }

    await calendarEventModel.deleteEvent(id);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
};

// Check if user can edit/delete an event
const checkEventPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    // Check if event exists
    const existingEvent = await calendarEventModel.findById(id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user can edit this event based on hierarchy
    const editPermission = await canEditEvent(req.user.id, req.user.role, id);
    
    res.json({
      success: true,
      canEdit: editPermission.canEdit,
      canDelete: editPermission.canEdit, // Same permissions for edit and delete
      reason: editPermission.reason,
      event: {
        id: existingEvent.id,
        title: existingEvent.title,
        created_by: existingEvent.created_by,
        assigned_to: existingEvent.assigned_to
      }
    });
  } catch (error) {
    console.error('Error checking event permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check event permissions'
    });
  }
};

// Search events
const searchEvents = async (req, res) => {
  try {
    const { q } = req.query;
    const { roleFilters } = req;
    const userId = req.user.id;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let events;
    
    // Use hierarchy-based filtering for all roles
    events = await calendarEventModel.searchEventsForUserWithHierarchy(userId, userRole, q);
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        color: event.color,
        type: event.type,
        location: event.location,
        attendees: event.attendees || [],
        notes: event.notes,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        propertyId: event.property_id,
        propertyReference: event.property_reference,
        propertyLocation: event.property_location,
        leadId: event.lead_id,
        leadName: event.lead_name,
        leadPhone: event.lead_phone
      }))
    });
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search events'
    });
  }
};

// Get properties for dropdown
const getPropertiesForDropdown = async (req, res) => {
  try {
    const { roleFilters } = req;
    const userId = req.user.id;
    const Property = require('../models/propertyModel');
    
    let properties;
    
    // All roles can see properties, but with different filtering
    if (roleFilters.canViewAll) {
      properties = await Property.getAllProperties();
    } else if (roleFilters.role === 'agent') {
      // Agents can only see their own properties and referrals
      properties = await Property.getPropertiesAssignedOrReferredByAgent(userId);
    } else if (roleFilters.role === 'team_leader') {
      // Team leaders can see their own properties and their team's properties
      properties = await Property.getPropertiesForTeamLeader(userId);
    } else {
      // For other roles, return empty array (they can still access calendar but won't see properties)
      properties = [];
    }
    
    // Format for dropdown
    const dropdownProperties = properties.map(property => ({
      id: property.id,
      reference_number: property.reference_number,
      location: property.location
    }));
    
    res.json({
      success: true,
      properties: dropdownProperties
    });
  } catch (error) {
    console.error('Error fetching properties for dropdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties'
    });
  }
};

// Get leads for dropdown
const getLeadsForDropdown = async (req, res) => {
  try {
    const { roleFilters } = req;
    const userId = req.user.id;
    const Lead = require('../models/leadsModel');
    
    let leads;
    
    // All roles can see leads, but with different filtering
    if (roleFilters.canViewLeads) {
      leads = await Lead.getAllLeads();
    } else {
      // For roles without lead access, return empty array (they can still access calendar but won't see leads)
      leads = [];
    }
    
    // Format for dropdown
    const dropdownLeads = leads.map(lead => ({
      id: lead.id,
      customer_name: lead.customer_name,
      phone_number: lead.phone_number
    }));
    
    res.json({
      success: true,
      leads: dropdownLeads
    });
  } catch (error) {
    console.error('Error fetching leads for dropdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    });
  }
};

module.exports = {
  getAllEvents,
  getEventsByDateRange,
  getEventsByMonth,
  getEventsByWeek,
  getEventsByDay,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  checkEventPermissions,
  searchEvents,
  getPropertiesForDropdown,
  getLeadsForDropdown
};
