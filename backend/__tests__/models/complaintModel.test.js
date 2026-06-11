const Complaint = require('../../models/complaintModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Complaint Model', () => {
  let mockQuery;
  let mockClient;
  let mockConnect;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockConnect = jest.fn().mockResolvedValue(mockClient);
    pool.connect = mockConnect;

    jest.clearAllMocks();
  });

  it('should create a complaint and return the detailed record', async () => {
    const complaintPayload = {
      lead_id: 12,
      target_user_id: 44,
      title: 'Late response',
      description: 'The agent delayed the follow-up by two days.',
      created_by: 7
    };

    const createdComplaint = { id: 91 };
    const detailedComplaint = {
      id: 91,
      lead_id: 12,
      target_user_id: 44,
      title: complaintPayload.title,
      description: complaintPayload.description,
      created_by: 7,
      lead_name: 'Test Lead',
      target_user_name: 'Agent One',
      target_user_role: 'agent',
      created_by_name: 'Admin User'
    };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [createdComplaint] }) // INSERT
      .mockResolvedValueOnce({ rows: [detailedComplaint] }) // SELECT details
      .mockResolvedValueOnce({}); // COMMIT

    const result = await Complaint.createComplaint(complaintPayload);

    expect(mockConnect).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO complaints'),
      [
        complaintPayload.lead_id,
        complaintPayload.target_user_id,
        complaintPayload.title,
        complaintPayload.description,
        complaintPayload.created_by
      ]
    );
    expect(result).toEqual(detailedComplaint);
  });

  it('should treat agent filters as agent and consultant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await Complaint.getComplaints({
      targetRole: 'agent',
      search: 'late'
    });

    const query = mockQuery.mock.calls[0][0];
    expect(query).toContain("target.role IN ('agent', 'consultant')");
    expect(query).toContain('c.title ILIKE');
  });

  it('should filter by target user ids when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await Complaint.getComplaints({
      targetUserIds: [5, 6]
    });

    const query = mockQuery.mock.calls[0][0];
    expect(query).toContain('c.target_user_id = ANY($1::int[])');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM complaints c'),
      expect.arrayContaining([[5, 6]])
    );
  });
});
