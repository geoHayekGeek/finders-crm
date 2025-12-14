// Tests for viewings controller with follow-up viewings
const ViewingsController = require('../../controllers/viewingsController');
const Viewing = require('../../models/viewingModel');
const pool = require('../../config/db');
const { validationResult } = require('express-validator');

jest.mock('../../models/viewingModel');
jest.mock('../../config/db');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] }))
}));

describe('Viewings Controller - Follow-up Viewings', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1, role: 'admin', name: 'Test User' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  describe('createViewing', () => {
    it('should create a follow-up viewing with same lead, property, and agent as parent', async () => {
      const parentViewing = {
        id: 1,
        property_id: 10,
        lead_id: 20,
        agent_id: 30,
        viewing_date: '2024-01-10',
        viewing_time: '10:00:00'
      };

      req.body = {
        property_id: 10,
        lead_id: 20,
        agent_id: 30,
        viewing_date: '2024-01-15',
        viewing_time: '14:00:00',
        status: 'Scheduled',
        parent_viewing_id: 1
      };

      // Mock validation
      validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
      
      // Mock pool.query for duplicate check
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock calendar event creation (optional)
      const CalendarEvent = require('../../models/calendarEventModel');
      jest.mock('../../models/calendarEventModel');
      
      Viewing.getViewingById
        .mockResolvedValueOnce(parentViewing) // First call to check parent viewing
        .mockResolvedValueOnce({ id: 2, ...req.body, parent_viewing_id: 1 }); // Second call to get full viewing details
      Viewing.createViewing.mockResolvedValueOnce({
        id: 2,
        ...req.body,
        parent_viewing_id: 1
      });

      await ViewingsController.createViewing(req, res);

      expect(Viewing.getViewingById).toHaveBeenCalledWith(1);
      expect(Viewing.createViewing).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: parentViewing.lead_id,
          property_id: parentViewing.property_id,
          agent_id: parentViewing.agent_id,
          parent_viewing_id: 1,
          viewing_date: '2024-01-15', // New date
          viewing_time: '14:00:00' // New time
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if parent viewing does not exist', async () => {
      req.body = {
        parent_viewing_id: 999,
        property_id: 10, // Required field
        lead_id: 20, // Required field
        viewing_date: '2024-01-15',
        viewing_time: '14:00:00',
        agent_id: 30 // Required for admin role
      };

      Viewing.getViewingById.mockResolvedValueOnce(null);

      await ViewingsController.createViewing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Parent viewing not found'
        })
      );
    });

    it('should create a parent viewing when parent_viewing_id is not provided', async () => {
      req.body = {
        property_id: 10,
        lead_id: 20,
        agent_id: 30,
        viewing_date: '2024-01-15',
        viewing_time: '10:00:00',
        status: 'Scheduled'
      };

      const mockViewing = {
        id: 1,
        ...req.body,
        parent_viewing_id: null
      };

      Viewing.createViewing.mockResolvedValueOnce(mockViewing);
      Viewing.getViewingById.mockResolvedValueOnce(mockViewing);
      pool.query.mockResolvedValueOnce({ rows: [] });

      await ViewingsController.createViewing(req, res);

      const createViewingCall = Viewing.createViewing.mock.calls[0][0];
      expect(createViewingCall).not.toHaveProperty('parent_viewing_id');
    });
  });

  describe('getViewingById', () => {
    it('should include sub-viewings when fetching a parent viewing', async () => {
      req.params.id = '1';

      const parentViewing = {
        id: 1,
        parent_viewing_id: null,
        sub_viewings: [
          { id: 2, parent_viewing_id: 1 },
          { id: 3, parent_viewing_id: 1 }
        ]
      };

      Viewing.getViewingById.mockResolvedValueOnce(parentViewing);

      await ViewingsController.getViewingById(req, res);

      expect(Viewing.getViewingById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sub_viewings: expect.arrayContaining([
              expect.objectContaining({ id: 2 }),
              expect.objectContaining({ id: 3 })
            ])
          })
        })
      );
    });

    it('should not include sub-viewings when fetching a sub-viewing', async () => {
      req.params.id = '2';

      const subViewing = {
        id: 2,
        parent_viewing_id: 1,
        sub_viewings: undefined // Sub-viewings don't have sub-viewings
      };

      Viewing.getViewingById.mockResolvedValueOnce(subViewing);

      await ViewingsController.getViewingById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 2,
            parent_viewing_id: 1
          })
        })
      );
    });
  });

  describe('getAllViewings', () => {
    it('should exclude sub-viewings from main list', async () => {
      const mockViewings = [
        {
          id: 1,
          parent_viewing_id: null,
          sub_viewings: []
        },
        {
          id: 2,
          parent_viewing_id: null,
          sub_viewings: []
        }
      ];

      Viewing.getViewingsForAgent.mockResolvedValueOnce(mockViewings);

      await ViewingsController.getAllViewings(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 1, parent_viewing_id: null }),
            expect.objectContaining({ id: 2, parent_viewing_id: null })
          ])
        })
      );

      // Verify no sub-viewings in main list
      const returnedViewings = res.json.mock.calls[0][0].data;
      expect(returnedViewings.every(v => !v.parent_viewing_id)).toBe(true);
    });
  });
});

