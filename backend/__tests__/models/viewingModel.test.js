// Tests for viewing model with follow-up viewings (sub-viewings)
const Viewing = require('../../models/viewingModel');
const pool = require('../../config/db');

// Mock database pool
jest.mock('../../config/db', () => ({
  query: jest.fn(),
  end: jest.fn()
}));

describe('Viewing Model - Follow-up Viewings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createViewing', () => {
    it('should create a viewing with parent_viewing_id when provided', async () => {
      const viewingData = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00:00',
        status: 'Scheduled',
        parent_viewing_id: 10
      };

      const mockResult = {
        rows: [{
          id: 2,
          ...viewingData,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      pool.query.mockResolvedValueOnce(mockResult);

      const result = await Viewing.createViewing(viewingData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('parent_viewing_id'),
        expect.arrayContaining([10])
      );
      expect(result.parent_viewing_id).toBe(10);
    });

    it('should create a parent viewing when parent_viewing_id is not provided', async () => {
      const viewingData = {
        property_id: 1,
        lead_id: 1,
        agent_id: 1,
        viewing_date: '2024-01-15',
        viewing_time: '10:00:00',
        status: 'Scheduled'
      };

      const mockResult = {
        rows: [{
          id: 1,
          ...viewingData,
          parent_viewing_id: null,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      pool.query.mockResolvedValueOnce(mockResult);

      const result = await Viewing.createViewing(viewingData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('parent_viewing_id'),
        expect.arrayContaining([null])
      );
      expect(result.parent_viewing_id).toBeNull();
    });
  });

  describe('getSubViewings', () => {
    it('should fetch all sub-viewings for a parent viewing', async () => {
      const parentViewingId = 1;
      const mockSubViewings = [
        {
          id: 2,
          parent_viewing_id: 1,
          viewing_date: '2024-01-20',
          viewing_time: '14:00:00',
          status: 'Scheduled',
          updates: []
        },
        {
          id: 3,
          parent_viewing_id: 1,
          viewing_date: '2024-01-25',
          viewing_time: '16:00:00',
          status: 'Completed',
          updates: []
        }
      ];

      const mockResult = { rows: mockSubViewings };
      pool.query.mockResolvedValueOnce(mockResult);

      const result = await Viewing.getSubViewings(parentViewingId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE v.parent_viewing_id = $1'),
        [parentViewingId]
      );
      expect(result).toEqual(mockSubViewings);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no sub-viewings exist', async () => {
      const parentViewingId = 999;
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Viewing.getSubViewings(parentViewingId);

      expect(result).toEqual([]);
    });
  });

  describe('attachSubViewings', () => {
    it('should attach sub-viewings to parent viewings', async () => {
      const parentViewings = [
        { id: 1, parent_viewing_id: null },
        { id: 2, parent_viewing_id: null }
      ];

      const mockSubViewings = [
        { id: 3, parent_viewing_id: 1 },
        { id: 4, parent_viewing_id: 1 },
        { id: 5, parent_viewing_id: 2 }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockSubViewings });

      const result = await Viewing.attachSubViewings(parentViewings);

      expect(result[0].sub_viewings).toHaveLength(2);
      expect(result[0].sub_viewings[0].id).toBe(3);
      expect(result[0].sub_viewings[1].id).toBe(4);
      expect(result[1].sub_viewings).toHaveLength(1);
      expect(result[1].sub_viewings[0].id).toBe(5);
    });

    it('should not attach sub-viewings to sub-viewings', async () => {
      const viewings = [
        { id: 1, parent_viewing_id: null },
        { id: 2, parent_viewing_id: 1 } // This is a sub-viewing
      ];

      const mockSubViewings = [{ id: 3, parent_viewing_id: 1 }];
      pool.query.mockResolvedValueOnce({ rows: mockSubViewings });

      const result = await Viewing.attachSubViewings(viewings);

      expect(result[0].sub_viewings).toHaveLength(1);
      expect(result[1].sub_viewings).toBeUndefined(); // Sub-viewing should not have sub_viewings
    });

    it('should handle empty array', async () => {
      const result = await Viewing.attachSubViewings([]);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined', async () => {
      const result = await Viewing.attachSubViewings(null);
      expect(result).toBeNull();
    });
  });

  describe('getAllViewings', () => {
    it('should exclude sub-viewings from main list', async () => {
      const mockViewings = [
        { id: 1, parent_viewing_id: null },
        { id: 2, parent_viewing_id: null },
        { id: 3, parent_viewing_id: 1 } // This should be excluded
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockViewings.filter(v => !v.parent_viewing_id) })
        .mockResolvedValueOnce({ rows: [] });

      const result = await Viewing.getAllViewings();

      // First call is the main query - check that it was called with the correct WHERE clause
      const firstCall = pool.query.mock.calls[0];
      expect(firstCall[0]).toContain('WHERE v.parent_viewing_id IS NULL');
      expect(firstCall[1]).toBeUndefined();
      
      // Second call is from attachSubViewings
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(result.every(v => !v.parent_viewing_id)).toBe(true);
    });
  });

  describe('getViewingsByAgent', () => {
    it('should only return parent viewings for an agent', async () => {
      const agentId = 1;
      const mockViewings = [
        { id: 1, agent_id: agentId, parent_viewing_id: null },
        { id: 2, agent_id: agentId, parent_viewing_id: null }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockViewings })
        .mockResolvedValueOnce({ rows: [] });

      const result = await Viewing.getViewingsByAgent(agentId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE v.agent_id = $1 AND v.parent_viewing_id IS NULL'),
        [agentId]
      );
      expect(result.every(v => !v.parent_viewing_id)).toBe(true);
    });
  });

  describe('getViewingById', () => {
    it('should attach sub-viewings when viewing a parent viewing', async () => {
      const viewingId = 1;
      const mockViewing = {
        id: viewingId,
        parent_viewing_id: null
      };
      const mockSubViewings = [
        { id: 2, parent_viewing_id: viewingId },
        { id: 3, parent_viewing_id: viewingId }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [mockViewing] })
        .mockResolvedValueOnce({ rows: mockSubViewings });

      const result = await Viewing.getViewingById(viewingId);

      expect(result.sub_viewings).toBeDefined();
      expect(result.sub_viewings).toHaveLength(2);
    });

    it('should not attach sub-viewings when viewing a sub-viewing', async () => {
      const viewingId = 2;
      const mockViewing = {
        id: viewingId,
        parent_viewing_id: 1
      };

      pool.query.mockResolvedValueOnce({ rows: [mockViewing] });

      const result = await Viewing.getViewingById(viewingId);

      expect(result.sub_viewings).toBeUndefined();
    });
  });
});
