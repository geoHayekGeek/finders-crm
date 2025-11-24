const Viewing = require('../../models/viewingModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Viewing Model', () => {
  let mockQuery;
  let mockClient;
  let mockRelease;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: mockRelease
    };
    pool.query = mockQuery;
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createViewing', () => {
    it('should create a viewing with all fields', async () => {
      const viewingData = {
        property_id: 1,
        lead_id: 2,
        agent_id: 3,
        viewing_date: '2024-01-15',
        viewing_time: '10:00',
        status: 'Scheduled',
        is_serious: true,
        description: 'Test viewing',
        notes: 'Test notes'
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...viewingData }]
      });

      const result = await Viewing.createViewing(viewingData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO viewings'),
        expect.arrayContaining([
          viewingData.property_id,
          viewingData.lead_id,
          viewingData.agent_id,
          viewingData.viewing_date,
          viewingData.viewing_time,
          viewingData.status,
          viewingData.is_serious,
          viewingData.description,
          viewingData.notes
        ])
      );
      expect(result).toEqual({ id: 1, ...viewingData });
    });

    it('should use default status and is_serious if not provided', async () => {
      const viewingData = {
        property_id: 1,
        lead_id: 2,
        agent_id: 3,
        viewing_date: '2024-01-15',
        viewing_time: '10:00',
        description: 'Test viewing',
        notes: 'Test notes'
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...viewingData, status: 'Scheduled', is_serious: false }]
      });

      await Viewing.createViewing(viewingData);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[5]).toBe('Scheduled'); // status
      expect(callArgs[6]).toBe(false); // is_serious
    });
  });

  describe('getAllViewings', () => {
    it('should get all viewings with related data', async () => {
      const mockViewings = [
        { id: 1, property_id: 1, agent_id: 1, viewing_date: '2024-01-15' }
      ];

      mockQuery.mockResolvedValue({ rows: mockViewings });

      const result = await Viewing.getAllViewings();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
      expect(result).toEqual(mockViewings);
    });
  });

  describe('getViewingsByAgent', () => {
    it('should get viewings for a specific agent', async () => {
      const agentId = 1;
      const mockViewings = [{ id: 1, agent_id: agentId }];

      mockQuery.mockResolvedValue({ rows: mockViewings });

      const result = await Viewing.getViewingsByAgent(agentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE v.agent_id = $1'),
        [agentId]
      );
      expect(result).toEqual(mockViewings);
    });
  });

  describe('getViewingsForTeamLeader', () => {
    it('should get viewings for team leader and their team', async () => {
      const teamLeaderId = 1;
      const mockViewings = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockViewings });

      const result = await Viewing.getViewingsForTeamLeader(teamLeaderId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('team_agents'),
        [teamLeaderId]
      );
      expect(result).toEqual(mockViewings);
    });
  });

  describe('getViewingById', () => {
    it('should get a viewing by ID', async () => {
      const viewingId = 1;
      const mockViewing = { id: viewingId, property_id: 1 };

      mockQuery.mockResolvedValue({ rows: [mockViewing] });

      const result = await Viewing.getViewingById(viewingId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE v.id = $1'),
        [viewingId]
      );
      expect(result).toEqual(mockViewing);
    });
  });

  describe('updateViewing', () => {
    it('should update a viewing with provided fields', async () => {
      const viewingId = 1;
      const updates = { status: 'Completed', notes: 'Updated notes' };

      mockQuery.mockResolvedValue({
        rows: [{ id: viewingId, ...updates }]
      });

      const result = await Viewing.updateViewing(viewingId, updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE viewings'),
        expect.arrayContaining([viewingId, updates.status, updates.notes])
      );
      expect(result).toEqual({ id: viewingId, ...updates });
    });

    it('should return existing viewing if no updates provided', async () => {
      const viewingId = 1;
      const mockViewing = { id: viewingId, status: 'Scheduled' };

      mockQuery.mockResolvedValue({ rows: [mockViewing] });

      const result = await Viewing.updateViewing(viewingId, {});

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE v.id = $1'),
        [viewingId]
      );
      expect(result).toEqual(mockViewing);
    });
  });

  describe('deleteViewing', () => {
    it('should delete a viewing', async () => {
      const viewingId = 1;
      const mockViewing = { id: viewingId };

      mockQuery.mockResolvedValue({ rows: [mockViewing] });

      const result = await Viewing.deleteViewing(viewingId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM viewings'),
        [viewingId]
      );
      expect(result).toEqual(mockViewing);
    });
  });

  describe('getViewingsWithFilters', () => {
    it('should filter by status', async () => {
      const filters = { status: 'Completed' };
      mockQuery.mockResolvedValue({ rows: [] });

      await Viewing.getViewingsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND v.status = $1"),
        expect.arrayContaining(['Completed'])
      );
    });

    it('should filter by agent_id', async () => {
      const filters = { agent_id: 1 };
      mockQuery.mockResolvedValue({ rows: [] });

      await Viewing.getViewingsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND v.agent_id = $1'),
        expect.arrayContaining([1])
      );
    });

    it('should filter by date range', async () => {
      const filters = { date_from: '2024-01-01', date_to: '2024-01-31' };
      mockQuery.mockResolvedValue({ rows: [] });

      await Viewing.getViewingsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND v.viewing_date >= $1::date'),
        expect.arrayContaining(['2024-01-01'])
      );
    });

    it('should filter by search term', async () => {
      const filters = { search: 'test' };
      mockQuery.mockResolvedValue({ rows: [] });

      await Viewing.getViewingsWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%test%'])
      );
    });
  });

  describe('getViewingStats', () => {
    it('should get viewing statistics', async () => {
      const mockStats = {
        total_viewings: 10,
        scheduled: 5,
        completed: 3,
        cancelled: 1,
        no_show: 1
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await Viewing.getViewingStats();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)')
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('getViewingsForAgent', () => {
    it('should return viewings for agent role', async () => {
      const agentId = 1;
      const mockViewings = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockViewings });

      const result = await Viewing.getViewingsForAgent(agentId, 'agent');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE v.agent_id = $1'),
        [agentId]
      );
      expect(result).toEqual(mockViewings);
    });

    it('should return viewings for team leader role', async () => {
      const teamLeaderId = 1;
      const mockViewings = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockViewings });

      const result = await Viewing.getViewingsForAgent(teamLeaderId, 'team_leader');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('team_agents'),
        [teamLeaderId]
      );
      expect(result).toEqual(mockViewings);
    });

    it('should return all viewings for admin role', async () => {
      const mockViewings = [{ id: 1 }];

      mockQuery.mockResolvedValue({ rows: mockViewings });

      const result = await Viewing.getViewingsForAgent(1, 'admin');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
      expect(result).toEqual(mockViewings);
    });
  });

  describe('addViewingUpdate', () => {
    it('should add an update to a viewing', async () => {
      const viewingId = 1;
      const updateData = {
        update_text: 'Test update',
        update_date: '2024-01-15',
        created_by: 1
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, viewing_id: viewingId, ...updateData }]
      });

      const result = await Viewing.addViewingUpdate(viewingId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO viewing_updates'),
        [viewingId, updateData.update_text, updateData.update_date || expect.any(String), updateData.created_by, updateData.status || 'Initial Contact']
      );
      expect(result.viewing_id).toBe(viewingId);
    });

    it('should use current date if update_date not provided', async () => {
      const viewingId = 1;
      const updateData = {
        update_text: 'Test update',
        created_by: 1
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, viewing_id: viewingId, ...updateData }]
      });

      await Viewing.addViewingUpdate(viewingId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO viewing_updates'),
        expect.arrayContaining([viewingId, updateData.update_text])
      );
    });
  });

  describe('getViewingUpdateById', () => {
    it('should get a viewing update by ID', async () => {
      const updateId = 1;
      const mockUpdate = { id: updateId, viewing_id: 1 };

      mockQuery.mockResolvedValue({ rows: [mockUpdate] });

      const result = await Viewing.getViewingUpdateById(updateId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE vu.id = $1'),
        [updateId]
      );
      expect(result).toEqual(mockUpdate);
    });
  });

  describe('updateViewingUpdate', () => {
    it('should update a viewing update', async () => {
      const updateId = 1;
      const updateData = { update_text: 'Updated text' };

      mockQuery.mockResolvedValue({
        rows: [{ id: updateId, ...updateData }]
      });

      const result = await Viewing.updateViewingUpdate(updateId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE viewing_updates'),
        expect.arrayContaining([updateData.update_text, updateId])
      );
      expect(result).toEqual({ id: updateId, ...updateData });
    });
  });

  describe('getViewingUpdates', () => {
    it('should get all updates for a viewing', async () => {
      const viewingId = 1;
      const mockUpdates = [{ id: 1, viewing_id: viewingId }];

      mockQuery.mockResolvedValue({ rows: mockUpdates });

      const result = await Viewing.getViewingUpdates(viewingId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE vu.viewing_id = $1'),
        [viewingId]
      );
      expect(result).toEqual(mockUpdates);
    });
  });

  describe('deleteViewingUpdate', () => {
    it('should delete a viewing update', async () => {
      const updateId = 1;
      const mockUpdate = { id: updateId };

      mockQuery.mockResolvedValue({ rows: [mockUpdate] });

      const result = await Viewing.deleteViewingUpdate(updateId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM viewing_updates'),
        [updateId]
      );
      expect(result).toEqual(mockUpdate);
    });
  });
});

