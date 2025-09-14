// controllers/calendarController.js
const calendarEventModel = require('../models/calendarEventModel');

// Get all events
const getAllEvents = async (req, res) => {
  try {
    const events = await calendarEventModel.getAllEvents();
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
    console.error('Error fetching all events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Get events by date range
const getEventsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    
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

    const events = await calendarEventModel.getEventsByDateRange(startDate, endDate);
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

    const events = await calendarEventModel.getEventsByMonth(yearNum, monthNum);
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

    const events = await calendarEventModel.getEventsByWeek(startDate);
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

    const events = await calendarEventModel.getEventsByDay(targetDate);
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
      created_by: req.user?.id || null, // Will be set when auth is implemented
      property_id: propertyId || null,
      lead_id: leadId || null
    };

    const newEvent = await calendarEventModel.createEvent(eventData);
    
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

// Search events
const searchEvents = async (req, res) => {
  try {
    const { q, userId } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const events = await calendarEventModel.searchEvents(q, userId);
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
    const pool = require('../config/db');
    const result = await pool.query(
      `SELECT id, reference_number, location 
       FROM properties 
       ORDER BY reference_number ASC`
    );
    
    res.json({
      success: true,
      properties: result.rows
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
    const pool = require('../config/db');
    const result = await pool.query(
      `SELECT id, customer_name, phone_number 
       FROM leads 
       ORDER BY customer_name ASC`
    );
    
    res.json({
      success: true,
      leads: result.rows
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
  searchEvents,
  getPropertiesForDropdown,
  getLeadsForDropdown
};
