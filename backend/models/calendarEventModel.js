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
      property_id,
      lead_id
    } = eventData;

    const result = await pool.query(
      `INSERT INTO calendar_events (
        title, description, start_time, end_time, all_day, 
        color, type, location, attendees, notes, created_by, property_id, lead_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [title, description, start_time, end_time, all_day, color, type, location, attendees, notes, created_by, property_id, lead_id]
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
}

module.exports = CalendarEvent;
