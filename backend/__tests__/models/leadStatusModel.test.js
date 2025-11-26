const LeadStatus = require('../../models/leadStatusModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('LeadStatus Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllStatuses', () => {
    it('should get all lead statuses', async () => {
      const mockStatuses = [
        { id: 1, status_name: 'New', code: 'new', is_active: true },
        { id: 2, status_name: 'Contacted', code: 'contacted', is_active: true }
      ];

      mockQuery.mockResolvedValue({ rows: mockStatuses });

      const result = await LeadStatus.getAllStatuses();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, status_name, code, color, description, is_active')
      );
      expect(result).toEqual(mockStatuses);
    });
  });

  describe('getStatusById', () => {
    it('should get a status by ID', async () => {
      const statusId = 1;
      const mockStatus = { id: statusId, status_name: 'New', code: 'new' };

      mockQuery.mockResolvedValue({ rows: [mockStatus] });

      const result = await LeadStatus.getStatusById(statusId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [statusId]
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('createStatus', () => {
    it('should create a new lead status', async () => {
      const statusData = {
        status_name: 'New Status',
        code: 'new_status',
        color: '#FF0000',
        description: 'Test description',
        is_active: true
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...statusData }]
      });

      const result = await LeadStatus.createStatus(statusData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_statuses'),
        [
          statusData.status_name,
          statusData.code,
          statusData.color,
          statusData.description,
          statusData.is_active
        ]
      );
      expect(result).toEqual({ id: 1, ...statusData });
    });
  });

  describe('updateStatus', () => {
    it('should update a lead status', async () => {
      const statusId = 1;
      const statusData = {
        status_name: 'Updated Status',
        code: 'updated_status',
        color: '#00FF00',
        description: 'Updated description',
        is_active: false
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: statusId, ...statusData }]
      });

      const result = await LeadStatus.updateStatus(statusId, statusData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lead_statuses'),
        [
          statusData.status_name,
          statusData.code,
          statusData.color,
          statusData.description,
          statusData.is_active,
          statusId
        ]
      );
      expect(result).toEqual({ id: statusId, ...statusData });
    });
  });

  describe('deleteStatus', () => {
    it('should delete a lead status', async () => {
      const statusId = 1;
      const mockStatus = { id: statusId, status_name: 'Deleted Status' };

      mockQuery.mockResolvedValue({ rows: [mockStatus] });

      const result = await LeadStatus.deleteStatus(statusId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM lead_statuses'),
        [statusId]
      );
      expect(result).toEqual(mockStatus);
    });
  });
});



