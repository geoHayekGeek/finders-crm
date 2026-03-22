// models/calendarEventModel.js
const pool = require('../config/db');
const User = require('./userModel');

// Normalize role to handle both 'operations_manager' and 'operations manager' formats
// Converts to space format for consistent comparisons
const normalizeRole = (role) =>
  role ? role.toLowerCase().replace(/_/g, ' ').trim() : '';

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

  /**
   * Team leader calendar scope: myself | full team | single agent (must be in team scope).
   */
  static async resolveTeamLeaderCalendarScopeIds(teamLeaderId, teamScope, teamAgentId) {
    const full = await User.getTeamPropertyAgentScopeIds(teamLeaderId, 'team leader');
    const scope = (teamScope || 'team').toLowerCase();
    if (scope === 'myself') return [teamLeaderId];
    if (scope === 'agent') {
      const aid = parseInt(teamAgentId, 10);
      if (Number.isFinite(aid) && full.includes(aid)) return [aid];
      return [teamLeaderId];
    }
    return full;
  }

  static async getNonAdminScopeUserIds(userId, userRole, calendarOptions = {}) {
    const normalizedRole = normalizeRole(userRole);
    if (normalizedRole === 'team leader') {
      return CalendarEvent.resolveTeamLeaderCalendarScopeIds(
        userId,
        calendarOptions.teamScope,
        calendarOptions.teamAgentId
      );
    }
    return [userId];
  }

  static async isEventVisibleToUser(eventRow, viewerId, viewerRole) {
    const nr = normalizeRole(viewerRole);
    if (nr === 'admin') return true;
    if (eventRow.created_by === viewerId || eventRow.assigned_to === viewerId) return true;

    const viewerRes = await pool.query('SELECT name FROM users WHERE id = $1', [viewerId]);
    const viewerName = viewerRes.rows[0]?.name;
    if (
      viewerName &&
      eventRow.attendees &&
      Array.isArray(eventRow.attendees) &&
      eventRow.attendees.includes(viewerName)
    ) {
      return true;
    }

    if (nr === 'team leader') {
      const scopeIds = await User.getTeamPropertyAgentScopeIds(viewerId, 'team leader');
      if (scopeIds.includes(eventRow.created_by) || scopeIds.includes(eventRow.assigned_to)) {
        return true;
      }
      if (!eventRow.attendees || !Array.isArray(eventRow.attendees) || eventRow.attendees.length === 0) {
        return false;
      }
      const r = await pool.query(
        `SELECT 1 FROM users u WHERE u.id = ANY($1::int[]) AND u.name = ANY($2::text[])`,
        [scopeIds, eventRow.attendees]
      );
      return r.rows.length > 0;
    }

    return false;
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

  // Get events for a user - admin sees all; team leaders can scope to team / self / one agent (calendarOptions)
  static async getEventsForUserWithHierarchy(userId, userRole, calendarOptions = {}) {
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
    `;

    const params = [];

    const normalizedRole = normalizeRole(userRole);

    if (normalizedRole === 'admin') {
      // No restrictions for admin
    } else {
      const scopeUserIds = await CalendarEvent.getNonAdminScopeUserIds(userId, userRole, calendarOptions);
      const idx = params.length + 1;
      params.push(scopeUserIds);
      query += ` WHERE (
        ce.assigned_to = ANY($${idx}::int[])
        OR ce.created_by = ANY($${idx}::int[])
        OR (ce.attendees IS NOT NULL AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = ANY($${idx}::int[]) AND u.name = ANY(ce.attendees)
        ))
      )`;
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get events for a user within a date range - admin sees all; others scoped (team leader options via calendarOptions)
  static async getEventsForUserWithHierarchyByDateRange(userId, userRole, startDate, endDate, calendarOptions = {}) {
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
    `;

    const params = [];
    const normalizedRole = normalizeRole(userRole);

    if (normalizedRole === 'admin') {
      query += ` WHERE ((ce.start_time >= $1 AND ce.start_time <= $2)
               OR (ce.end_time >= $1 AND ce.end_time <= $2)
               OR (ce.start_time <= $1 AND ce.end_time >= $2))`;
      params.push(startDate, endDate);
    } else {
      const scopeUserIds = await CalendarEvent.getNonAdminScopeUserIds(userId, userRole, calendarOptions);
      const idx = params.length + 1;
      params.push(scopeUserIds);
      const d1 = idx + 1;
      const d2 = idx + 2;
      params.push(startDate, endDate);
      query += ` WHERE (
        ce.assigned_to = ANY($${idx}::int[])
        OR ce.created_by = ANY($${idx}::int[])
        OR (ce.attendees IS NOT NULL AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = ANY($${idx}::int[]) AND u.name = ANY(ce.attendees)
        ))
      ) AND ((ce.start_time >= $${d1} AND ce.start_time <= $${d2})
               OR (ce.end_time >= $${d1} AND ce.end_time <= $${d2})
               OR (ce.start_time <= $${d1} AND ce.end_time >= $${d2}))`;
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Search events for a user - admin sees all; others scoped (team leader options via calendarOptions)
  static async searchEventsForUserWithHierarchy(userId, userRole, searchQuery, calendarOptions = {}) {
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
        ce.title ILIKE $1 
        OR ce.description ILIKE $1 
        OR ce.location ILIKE $1 
        OR ce.notes ILIKE $1
        OR p.reference_number ILIKE $1
        OR p.location ILIKE $1
        OR l.customer_name ILIKE $1
        OR l.phone_number ILIKE $1
      )
    `;

    const params = [`%${searchQuery}%`];

    const normalizedRole = normalizeRole(userRole);

    if (normalizedRole !== 'admin') {
      const scopeUserIds = await CalendarEvent.getNonAdminScopeUserIds(userId, userRole, calendarOptions);
      const idx = params.length + 1;
      params.push(scopeUserIds);
      query += ` AND (
        ce.assigned_to = ANY($${idx}::int[])
        OR ce.created_by = ANY($${idx}::int[])
        OR (ce.attendees IS NOT NULL AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = ANY($${idx}::int[]) AND u.name = ANY(ce.attendees)
        ))
      )`;
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get events with advanced filters (admin only)
  static async getEventsWithAdvancedFilters(filters) {
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
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Filter by created by user
    if (filters.createdBy) {
      paramCount++;
      query += ` AND ce.created_by = $${paramCount}`;
      params.push(parseInt(filters.createdBy));
    }

    // Filter by attendee (passed as user ID, match by user name in attendees array)
    if (filters.attendee) {
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = $${paramCount} AND u.name = ANY(ce.attendees)
      )`;
      params.push(parseInt(filters.attendee));
    }

    // Filter by event type
    if (filters.type) {
      paramCount++;
      query += ` AND ce.type = $${paramCount}`;
      params.push(filters.type);
    }

    // Filter by date range
    if (filters.dateFrom) {
      paramCount++;
      query += ` AND ce.start_time >= $${paramCount}`;
      params.push(new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      paramCount++;
      query += ` AND ce.start_time <= $${paramCount}`;
      params.push(new Date(filters.dateTo));
    }

    // Filter by search term
    if (filters.search) {
      paramCount++;
      const searchTerm = `%${filters.search}%`;
      query += ` AND (
        ce.title ILIKE $${paramCount} 
        OR ce.description ILIKE $${paramCount}
        OR ce.location ILIKE $${paramCount}
        OR ce.notes ILIKE $${paramCount}
        OR p.reference_number ILIKE $${paramCount}
        OR p.location ILIKE $${paramCount}
        OR l.customer_name ILIKE $${paramCount}
        OR l.phone_number ILIKE $${paramCount}
        OR creator.name ILIKE $${paramCount}
        OR assignee.name ILIKE $${paramCount}
      )`;
      params.push(searchTerm);
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = CalendarEvent;
