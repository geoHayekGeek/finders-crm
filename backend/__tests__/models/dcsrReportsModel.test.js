const dcsrReportsModel = require('../../models/dcsrReportsModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('DCSR Reports Model', () => {
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

  describe('normalizeDateRange', () => {
    // Since normalizeDateRange is not exported, we test it indirectly through createDCSRReport
    // But we can add explicit tests if we export it or test edge cases through createDCSRReport
  });

  describe('calculateDCSRData', () => {
    it('should calculate DCSR data for a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // listings
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // leads
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // sales
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // rent
        .mockResolvedValueOnce({ rows: [{ count: '8' }] }); // viewings

      const result = await dcsrReportsModel.calculateDCSRData(startDate, endDate);

      expect(result).toEqual({
        listings_count: 10,
        leads_count: 5,
        sales_count: 3,
        rent_count: 2,
        viewings_count: 8
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle string dates', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await dcsrReportsModel.calculateDCSRData(startDate, endDate);

      expect(result).toBeDefined();
    });

    it('should throw error for invalid dates', async () => {
      const startDate = new Date('invalid');
      const endDate = new Date('2024-01-31');

      await expect(
        dcsrReportsModel.calculateDCSRData(startDate, endDate)
      ).rejects.toThrow('Invalid date range');
    });
  });

  describe('createDCSRReport', () => {
    it('should create a new DCSR report', async () => {
      const reportData = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      // Mock all queries for calculateDCSRData
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '8' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      // Mock queries for createDCSRReport
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            listings_count: 10,
            leads_count: 5,
            sales_count: 3,
            rent_count: 2,
            viewings_count: 8
          }]
        });

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      const result = await dcsrReportsModel.createDCSRReport(reportData, createdBy);

      expect(result).toBeDefined();
      expect(result.month).toBe(1);
      expect(result.year).toBe(2024);
    });

    it('should throw error if report already exists', async () => {
      const reportData = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      // Mock check for existing report - return existing
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing report

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      await expect(
        dcsrReportsModel.createDCSRReport(reportData, createdBy)
      ).rejects.toThrow('A DCSR report already exists');
    });

    it('should throw error if year is less than 2020', async () => {
      const reportData = {
        start_date: '2018-02-28',
        end_date: '2018-02-28'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }), // viewings
        release: jest.fn()
      };

      // First call returns calculateClient
      pool.connect.mockResolvedValueOnce(calculateClient);

      await expect(
        dcsrReportsModel.createDCSRReport(reportData, createdBy)
      ).rejects.toThrow('Year must be 2020 or later');
    });

    it('should allow year greater than 2100 (future dates)', async () => {
      const reportData = {
        start_date: '2101-01-01',
        end_date: '2101-01-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            month: 1,
            year: 2101,
            start_date: '2101-01-01',
            end_date: '2101-01-31',
            listings_count: 0,
            leads_count: 0,
            sales_count: 0,
            rent_count: 0,
            viewings_count: 0
          }]
        });

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      const result = await dcsrReportsModel.createDCSRReport(reportData, createdBy);

      expect(result).toBeDefined();
      expect(result.year).toBe(2101);
    });

    it('should allow year 2020 (minimum boundary)', async () => {
      const reportData = {
        start_date: '2020-01-01',
        end_date: '2020-01-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            month: 1,
            year: 2020,
            start_date: '2020-01-01',
            end_date: '2020-01-31',
            listings_count: 0,
            leads_count: 0,
            sales_count: 0,
            rent_count: 0,
            viewings_count: 0
          }]
        });

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      const result = await dcsrReportsModel.createDCSRReport(reportData, createdBy);

      expect(result).toBeDefined();
      expect(result.year).toBe(2020);
    });

    it('should allow year 2100', async () => {
      const reportData = {
        start_date: '2100-12-01',
        end_date: '2100-12-31'
      };
      const createdBy = 1;

      // calculateDCSRData uses its own client (first pool.connect call)
      const calculateClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // listings
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // leads
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // sales
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // rent
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }), // viewings
        release: jest.fn()
      };

      // createDCSRReport uses its own client (second pool.connect call)
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            month: 12,
            year: 2100,
            start_date: '2100-12-01',
            end_date: '2100-12-31',
            listings_count: 0,
            leads_count: 0,
            sales_count: 0,
            rent_count: 0,
            viewings_count: 0
          }]
        });

      // First call returns calculateClient, second returns mockClient
      pool.connect
        .mockResolvedValueOnce(calculateClient)
        .mockResolvedValueOnce(mockClient);

      const result = await dcsrReportsModel.createDCSRReport(reportData, createdBy);

      expect(result).toBeDefined();
      expect(result.year).toBe(2100);
    });
  });

  describe('getAllDCSRReports', () => {
    it('should get all reports', async () => {
      const mockReports = [
        { id: 1, month: 1, year: 2024 },
        { id: 2, month: 2, year: 2024 }
      ];

      mockQuery.mockResolvedValue({ rows: mockReports });

      const result = await dcsrReportsModel.getAllDCSRReports();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM dcsr_monthly_reports'),
        []
      );
      expect(result).toEqual(mockReports);
    });

    it('should filter by date range', async () => {
      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      mockQuery.mockResolvedValue({ rows: [] });

      await dcsrReportsModel.getAllDCSRReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND start_date >= $1'),
        expect.arrayContaining([filters.start_date])
      );
    });

    it('should filter by month and year', async () => {
      const filters = { month: 1, year: 2024 };

      mockQuery.mockResolvedValue({ rows: [] });

      await dcsrReportsModel.getAllDCSRReports(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND month = $1'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('getDCSRReportById', () => {
    it('should get a report by ID', async () => {
      const reportId = 1;
      const mockReport = { id: reportId, month: 1, year: 2024 };

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await dcsrReportsModel.getDCSRReportById(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [reportId]
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe('updateDCSRReport', () => {
    it('should update a DCSR report', async () => {
      const reportId = 1;
      const updateData = {
        listings_count: 15,
        leads_count: 8,
        sales_count: 5,
        rent_count: 3,
        viewings_count: 12
      };

      mockClient.query.mockResolvedValue({
        rows: [{ id: reportId, ...updateData }]
      });

      const result = await dcsrReportsModel.updateDCSRReport(reportId, updateData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dcsr_monthly_reports'),
        expect.arrayContaining([
          updateData.listings_count,
          updateData.leads_count,
          updateData.sales_count,
          updateData.rent_count,
          updateData.viewings_count,
          reportId
        ])
      );
      expect(result).toEqual({ id: reportId, ...updateData });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('recalculateDCSRReport', () => {
    it('should recalculate a DCSR report', async () => {
      const reportId = 1;

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            month: 1,
            year: 2024
          }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // listings
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // leads
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // sales
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // rent
        .mockResolvedValueOnce({ rows: [{ count: '8' }] })  // viewings
        .mockResolvedValueOnce({
          rows: [{
            id: reportId,
            listings_count: 10,
            leads_count: 5,
            sales_count: 3,
            rent_count: 2,
            viewings_count: 8
          }]
        });

      const result = await dcsrReportsModel.recalculateDCSRReport(reportId);

      expect(result).toBeDefined();
      expect(result.listings_count).toBe(10);
    });

    it('should throw error if report not found', async () => {
      const reportId = 999;

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        dcsrReportsModel.recalculateDCSRReport(reportId)
      ).rejects.toThrow('Report not found');
    });
  });

  describe('deleteDCSRReport', () => {
    it('should delete a DCSR report', async () => {
      const reportId = 1;

      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await dcsrReportsModel.deleteDCSRReport(reportId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dcsr_monthly_reports'),
        [reportId]
      );
      expect(result).toBe(true);
    });

    it('should return false if report not found', async () => {
      const reportId = 999;

      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await dcsrReportsModel.deleteDCSRReport(reportId);

      expect(result).toBe(false);
    });
  });

  describe('calculateTeamDCSRData', () => {
    it('should calculate DCSR data for a team', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      // Mock team members query
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] }) // team members
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // listings
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // leads
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // sales
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // rent
        .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // viewings
        .mockResolvedValueOnce({ rows: [{ name: 'Team Leader', user_code: 'TL001' }] }) // team leader info
        .mockResolvedValueOnce({ rows: [ // team members info
          { id: 1, name: 'Team Leader', user_code: 'TL001', role: 'team_leader' },
          { id: 2, name: 'Agent 1', user_code: 'A001', role: 'agent' },
          { id: 3, name: 'Agent 2', user_code: 'A002', role: 'agent' }
        ] });

      const result = await dcsrReportsModel.calculateTeamDCSRData(teamLeaderId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.team_leader_id).toBe(teamLeaderId);
      expect(result.team_leader_name).toBe('Team Leader');
      expect(result.listings_count).toBe(5);
      expect(result.leads_count).toBe(3);
      expect(result.sales_count).toBe(2);
      expect(result.rent_count).toBe(1);
      expect(result.viewings_count).toBe(4);
      expect(result.team_members).toHaveLength(3);
    });

    it('should throw error if team has no members', async () => {
      const teamLeaderId = 999;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no team members

      await expect(
        dcsrReportsModel.calculateTeamDCSRData(teamLeaderId, startDate, endDate)
      ).rejects.toThrow('Team not found or has no members');
    });
  });

  describe('getTeamProperties', () => {
    it('should get properties for a team with filters', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const filters = { property_type: 'sale', status_id: 1 };

      // Mock team members query
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // team members
        .mockResolvedValueOnce({ rows: [ // properties
          {
            id: 1,
            reference_number: 'REF001',
            property_type: 'sale',
            location: 'Location 1',
            status_name: 'Active',
            status_color: '#00FF00',
            category_name: 'Category 1',
            category_code: 'CAT1',
            agent_name: 'Agent 1',
            agent_code: 'A001',
            price: 100000,
            created_at: '2024-01-15T00:00:00Z'
          }
        ] });

      const result = await dcsrReportsModel.getTeamProperties(teamLeaderId, startDate, endDate, filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].reference_number).toBe('REF001');
    });

    it('should return empty array if team has no members', async () => {
      const teamLeaderId = 999;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no team members

      const result = await dcsrReportsModel.getTeamProperties(teamLeaderId, startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should apply all property filters correctly', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const filters = { 
        property_type: 'rent', 
        status_id: 2, 
        category_id: 3, 
        agent_id: 5 
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 5 }] }) // team members
        .mockResolvedValueOnce({ rows: [] }); // properties

      const result = await dcsrReportsModel.getTeamProperties(teamLeaderId, startDate, endDate, filters);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should handle invalid date range', async () => {
      const teamLeaderId = 1;
      const startDate = 'invalid-date';
      const endDate = '2024-01-31';

      await expect(
        dcsrReportsModel.getTeamProperties(teamLeaderId, startDate, endDate)
      ).rejects.toThrow('Invalid date range supplied');
    });
  });

  describe('getTeamLeads', () => {
    it('should get leads for a team with filters', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const filters = { status: 'active' };

      // Mock team members query
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // team members
        .mockResolvedValueOnce({ rows: [ // leads
          {
            id: 1,
            date: '2024-01-15',
            customer_name: 'Customer 1',
            phone_number: '1234567890',
            agent_name: 'Agent 1',
            agent_code: 'A001',
            status: 'active',
            created_at: '2024-01-15T00:00:00Z'
          }
        ] });

      const result = await dcsrReportsModel.getTeamLeads(teamLeaderId, startDate, endDate, filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].customer_name).toBe('Customer 1');
    });

    it('should return empty array if team has no members', async () => {
      const teamLeaderId = 999;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no team members

      const result = await dcsrReportsModel.getTeamLeads(teamLeaderId, startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should apply all lead filters correctly', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const filters = { status: 'closed', agent_id: 5 };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 5 }] }) // team members
        .mockResolvedValueOnce({ rows: [] }); // leads

      const result = await dcsrReportsModel.getTeamLeads(teamLeaderId, startDate, endDate, filters);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should handle invalid date range', async () => {
      const teamLeaderId = 1;
      const startDate = 'invalid-date';
      const endDate = '2024-01-31';

      await expect(
        dcsrReportsModel.getTeamLeads(teamLeaderId, startDate, endDate)
      ).rejects.toThrow('Invalid date range supplied');
    });
  });

  describe('getTeamViewings', () => {
    it('should get viewings for a team with filters', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const filters = { status: 'Completed' };

      // Mock team members query
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // team members
        .mockResolvedValueOnce({ rows: [ // viewings
          {
            id: 1,
            viewing_date: '2024-01-15',
            viewing_time: '10:00',
            property_reference: 'REF001',
            property_location: 'Location 1',
            lead_name: 'Lead 1',
            lead_phone: '1234567890',
            agent_name: 'Agent 1',
            agent_code: 'A001',
            status: 'Completed',
            created_at: '2024-01-15T00:00:00Z'
          }
        ] });

      const result = await dcsrReportsModel.getTeamViewings(teamLeaderId, startDate, endDate, filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].property_reference).toBe('REF001');
      expect(result[0].status).toBe('Completed');
    });

    it('should return empty array if team has no members', async () => {
      const teamLeaderId = 999;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no team members

      const result = await dcsrReportsModel.getTeamViewings(teamLeaderId, startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should apply all viewing filters correctly', async () => {
      const teamLeaderId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const filters = { status: 'Scheduled', agent_id: 5 };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 5 }] }) // team members
        .mockResolvedValueOnce({ rows: [] }); // viewings

      const result = await dcsrReportsModel.getTeamViewings(teamLeaderId, startDate, endDate, filters);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should handle invalid date range', async () => {
      const teamLeaderId = 1;
      const startDate = 'invalid-date';
      const endDate = '2024-01-31';

      await expect(
        dcsrReportsModel.getTeamViewings(teamLeaderId, startDate, endDate)
      ).rejects.toThrow('Invalid date range supplied');
    });
  });

  describe('getAllTeams', () => {
    it('should get all teams successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [
          { id: 1, name: 'Leader 1', user_code: 'TL1' }
        ] })
        .mockResolvedValueOnce({ rows: [
          { id: 1, name: 'Leader 1', user_code: 'TL1', role: 'team_leader' },
          { id: 2, name: 'Agent 1', user_code: 'A1', role: 'agent' }
        ] });

      const result = await dcsrReportsModel.getAllTeams();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].team_leader_id).toBe(1);
      expect(result[0].team_leader_name).toBe('Leader 1');
    });

    it('should return empty array if no teams exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await dcsrReportsModel.getAllTeams();

      expect(result).toEqual([]);
    });
  });
});

