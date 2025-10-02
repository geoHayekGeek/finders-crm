// models/calendarEventModel.js
const pool = require('../config/db');

class CalendarEvent {
  static async createEvent(eventData) {
    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      color,
      type,
      location,
      attendees,
      notes,
      created_by,
      assigned_to,
      property_id,
      lead_id
    } = eventData;

    const result = await pool.query(
      `INSERT INTO calendar_events (
        title, description, start_time, end_time, all_day, 
        color, type, location, attendees, notes, created_by, assigned_to, property_id, lead_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [title, description, start_time, end_time, all_day, color, type, location, attendees, notes, created_by, assigned_to, property_id, lead_id]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE ce.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async getAllEvents() {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      ORDER BY ce.start_time ASC`
    );
    return result.rows;
  }

  // Get events assigned to a specific user
  static async getEventsByUser(userId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE ce.assigned_to = $1
      ORDER BY ce.start_time ASC`,
      [userId]
    );
    return result.rows;
  }

  // Get events by date range for a specific user
  static async getEventsByDateRangeForUser(startDate, endDate, userId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE ce.assigned_to = $1
        AND ((ce.start_time >= $2 AND ce.start_time <= $3) 
          OR (ce.end_time >= $2 AND ce.end_time <= $3)
          OR (ce.start_time <= $2 AND ce.end_time >= $3))
      ORDER BY ce.start_time ASC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }

  // Get events for a specific user (assigned to, created by, or attendee)
  static async getEventsForUser(userId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      LEFT JOIN users u ON u.id = $1
      WHERE ce.assigned_to = $1 
         OR ce.created_by = $1 
         OR (ce.attendees IS NOT NULL AND u.name = ANY(ce.attendees))
      ORDER BY ce.start_time ASC`,
      [userId]
    );
    return result.rows;
  }

  // Get events by date range for a specific user (assigned to, created by, or attendee)
  static async getEventsByDateRangeForUserAdvanced(startDate, endDate, userId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      LEFT JOIN users u ON u.id = $1
      WHERE (ce.assigned_to = $1 
         OR ce.created_by = $1 
         OR (ce.attendees IS NOT NULL AND u.name = ANY(ce.attendees)))
        AND ((ce.start_time >= $2 AND ce.start_time <= $3) 
          OR (ce.end_time >= $2 AND ce.end_time <= $3)
          OR (ce.start_time <= $2 AND ce.end_time >= $3))
      ORDER BY ce.start_time ASC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }

  static async getEventsByDateRange(startDate, endDate) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE (ce.start_time >= $1 AND ce.start_time <= $2) 
          OR (ce.end_time >= $1 AND ce.end_time <= $2)
          OR (ce.start_time <= $1 AND ce.end_time >= $2)
       ORDER BY ce.start_time ASC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  static async getEventsByMonth(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return this.getEventsByDateRange(startDate, endDate);
  }

  static async getEventsByWeek(startOfWeek) {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return this.getEventsByDateRange(startOfWeek, endOfWeek);
  }

  static async getEventsByDay(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getEventsByDateRange(startOfDay, endOfDay);
  }

  static async updateEvent(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE calendar_events 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    
    // After updating, fetch the complete event with joined data
    return this.findById(id);
  }

  static async deleteEvent(id) {
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getEventsByUser(userId) {
    const result = await pool.query(
      `SELECT * FROM calendar_events 
       WHERE created_by = $1 OR $1 = ANY(attendees)
       ORDER BY start_time ASC`,
      [userId]
    );
    return result.rows;
  }

  static async searchEvents(searchTerm, userId = null) {
    let query = `
      SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE (ce.title ILIKE $1 OR ce.description ILIKE $1 OR ce.location ILIKE $1)
    `;
    let params = [`%${searchTerm}%`];

    if (userId) {
      query += ` AND (ce.created_by = $2 OR $2 = ANY(ce.attendees))`;
      params.push(userId);
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get events by property
  static async getEventsByProperty(propertyId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      WHERE ce.property_id = $1
      ORDER BY ce.start_time ASC`,
      [propertyId]
    );
    return result.rows;
  }

  // Get events by lead
  static async getEventsByLead(leadId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        l.customer_name as lead_name,
        l.phone_number as lead_phone
      FROM calendar_events ce
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE ce.lead_id = $1
      ORDER BY ce.start_time ASC`,
      [leadId]
    );
    return result.rows;
  }

  // Get event by ID with creator and assignee role information
  static async getEventById(eventId) {
    const result = await pool.query(
      `SELECT 
        ce.*,
        creator.role as created_by_role,
        assignee.role as assigned_to_role
      FROM calendar_events ce
      LEFT JOIN users creator ON ce.created_by = creator.id
      LEFT JOIN users assignee ON ce.assigned_to = assignee.id
      WHERE ce.id = $1`,
      [eventId]
    );
    return result.rows[0];
  }

  // Check if an agent is under a specific team leader
  static async isAgentUnderTeamLeader(teamLeaderId, agentId) {
    if (!agentId) return false;
    
    const result = await pool.query(
      `SELECT 1 FROM team_agents 
       WHERE team_leader_id = $1 AND agent_id = $2 AND is_active = true`,
      [teamLeaderId, agentId]
    );
    return result.rows.length > 0;
  }

  // Get events for a user based on hierarchy (own events + events from subordinates)
  static async getEventsForUserWithHierarchy(userId, userRole) {
    let query = `
      SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        creator.name as created_by_name,
        creator.role as created_by_role,
        assignee.name as assigned_to_name,
        assignee.role as assigned_to_role
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      LEFT JOIN users creator ON ce.created_by = creator.id
      LEFT JOIN users assignee ON ce.assigned_to = assignee.id
      WHERE (
        ce.assigned_to = $1 
        OR ce.created_by = $1 
        OR (ce.attendees IS NOT NULL AND creator.name = ANY(ce.attendees))
    `;

    const params = [userId];

    // Add hierarchy-based visibility based on role
    if (userRole === 'admin') {
      // Admin can see all events - add condition to see all events
      query += ` OR 1=1)`;
    } else if (userRole === 'operations manager') {
      // Operations Manager can see operations and below
      query += ` OR creator.role IN ('operations', 'agent manager', 'team_leader', 'agent', 'accountant')
                 OR assignee.role IN ('operations', 'agent manager', 'team_leader', 'agent', 'accountant')`;
      query += `)`;
    } else if (userRole === 'operations') {
      // Operations can see other operations
      query += ` OR (creator.role = 'operations' AND creator.id != $1)
                 OR (assignee.role = 'operations' AND assignee.id != $1)`;
      query += `)`;
    } else if (userRole === 'agent manager') {
      // Agent Manager can see agent-related events
      query += ` OR creator.role IN ('agent', 'team_leader')
                 OR assignee.role IN ('agent', 'team_leader')`;
      query += `)`;
    } else if (userRole === 'team_leader') {
      // Team Leader can see events from their agents
      query += ` OR ce.created_by IN (
                   SELECT ta.agent_id 
                   FROM team_agents ta 
                   WHERE ta.team_leader_id = $1 AND ta.is_active = true
                 )
                 OR ce.assigned_to IN (
                   SELECT ta.agent_id 
                   FROM team_agents ta 
                   WHERE ta.team_leader_id = $1 AND ta.is_active = true
                 )`;
      query += `)`;
    } else {
      // For other roles (agent, accountant), only their own events
      query += `)`;
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get events for a user based on hierarchy within a date range
  static async getEventsForUserWithHierarchyByDateRange(userId, userRole, startDate, endDate) {
    let query = `
      SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        creator.name as created_by_name,
        creator.role as created_by_role,
        assignee.name as assigned_to_name,
        assignee.role as assigned_to_role
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      LEFT JOIN users creator ON ce.created_by = creator.id
      LEFT JOIN users assignee ON ce.assigned_to = assignee.id
      WHERE (
        ce.assigned_to = $1 
        OR ce.created_by = $1 
        OR (ce.attendees IS NOT NULL AND creator.name = ANY(ce.attendees))
    `;

    const params = [userId];

    // Add hierarchy-based visibility based on role
    if (userRole === 'admin') {
      // Admin can see all events - add condition to see all events
      query += ` OR 1=1)`;
    } else if (userRole === 'operations manager') {
      // Operations Manager can see operations and below
      query += ` OR creator.role IN ('operations', 'agent manager', 'team_leader', 'agent', 'accountant')
                 OR assignee.role IN ('operations', 'agent manager', 'team_leader', 'agent', 'accountant')`;
      query += `)`;
    } else if (userRole === 'operations') {
      // Operations can see other operations
      query += ` OR (creator.role = 'operations' AND creator.id != $1)
                 OR (assignee.role = 'operations' AND assignee.id != $1)`;
      query += `)`;
    } else if (userRole === 'agent manager') {
      // Agent Manager can see agent-related events
      query += ` OR creator.role IN ('agent', 'team_leader')
                 OR assignee.role IN ('agent', 'team_leader')`;
      query += `)`;
    } else if (userRole === 'team_leader') {
      // Team Leader can see events from their agents
      query += ` OR ce.created_by IN (
                   SELECT ta.agent_id 
                   FROM team_agents ta 
                   WHERE ta.team_leader_id = $1 AND ta.is_active = true
                 )
                 OR ce.assigned_to IN (
                   SELECT ta.agent_id 
                   FROM team_agents ta 
                   WHERE ta.team_leader_id = $1 AND ta.is_active = true
                 )`;
      query += `)`;
    } else {
      // For other roles (agent, accountant), only their own events
      query += `)`;
    }

    // Add date range filter
    query += ` AND ((ce.start_time >= $2 AND ce.start_time <= $3)
               OR (ce.end_time >= $2 AND ce.end_time <= $3)
               OR (ce.start_time <= $2 AND ce.end_time >= $3))`;

    params.push(startDate, endDate);
    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Search events for a user based on hierarchy
  static async searchEventsForUserWithHierarchy(userId, userRole, searchQuery) {
    let query = `
      SELECT 
        ce.*,
        p.reference_number as property_reference,
        p.location as property_location,
        l.customer_name as lead_name,
        l.phone_number as lead_phone,
        creator.name as created_by_name,
        creator.role as created_by_role,
        assignee.name as assigned_to_name,
        assignee.role as assigned_to_role
      FROM calendar_events ce
      LEFT JOIN properties p ON ce.property_id = p.id
      LEFT JOIN leads l ON ce.lead_id = l.id
      LEFT JOIN users creator ON ce.created_by = creator.id
      LEFT JOIN users assignee ON ce.assigned_to = assignee.id
      WHERE (
        ce.title ILIKE $2 
        OR ce.description ILIKE $2 
        OR ce.location ILIKE $2 
        OR ce.notes ILIKE $2
        OR p.reference_number ILIKE $2
        OR p.location ILIKE $2
        OR l.customer_name ILIKE $2
        OR l.phone_number ILIKE $2
      ) AND (
        ce.assigned_to = $1 
        OR ce.created_by = $1 
        OR (ce.attendees IS NOT NULL AND creator.name = ANY(ce.attendees))
    `;

    const params = [userId, `%${searchQuery}%`];

    // Add hierarchy-based visibility based on role
    if (userRole === 'admin') {
      // Admin can see all events - add condition to see all events
      query += ` OR 1=1)`;
    } else if (userRole === 'operations manager') {
      // Operations Manager can see operations and below
      query += ` OR creator.role IN ('operations', 'agent manager', 'team_leader', 'agent', 'accountant')
                 OR assignee.role IN ('operations', 'agent manager', 'team_leader', 'agent', 'accountant')`;
      query += `)`;
    } else if (userRole === 'operations') {
      // Operations can see other operations
      query += ` OR (creator.role = 'operations' AND creator.id != $1)
                 OR (assignee.role = 'operations' AND assignee.id != $1)`;
      query += `)`;
    } else if (userRole === 'agent manager') {
      // Agent Manager can see agent-related events
      query += ` OR creator.role IN ('agent', 'team_leader')
                 OR assignee.role IN ('agent', 'team_leader')`;
      query += `)`;
    } else if (userRole === 'team_leader') {
      // Team Leader can see events from their agents
      query += ` OR ce.created_by IN (
                   SELECT ta.agent_id 
                   FROM team_agents ta 
                   WHERE ta.team_leader_id = $1 AND ta.is_active = true
                 )
                 OR ce.assigned_to IN (
                   SELECT ta.agent_id 
                   FROM team_agents ta 
                   WHERE ta.team_leader_id = $1 AND ta.is_active = true
                 )`;
      query += `)`;
    } else {
      // For other roles (agent, accountant), only their own events
      query += `)`;
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = CalendarEvent;
