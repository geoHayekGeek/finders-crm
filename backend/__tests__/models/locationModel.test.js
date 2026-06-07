const Location = require('../../models/locationModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('Location Model', () => {
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

  it('should get active locations', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Office', is_active: true }] });

    const result = await Location.getAllLocations();

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_active = true'));
    expect(result).toHaveLength(1);
  });

  it('should create a location', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Office', description: 'Main office', is_active: true }]
    });

    const result = await Location.createLocation({
      name: ' Office ',
      description: 'Main office',
      is_active: 'true'
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO locations'),
      ['Office', 'Main office', true]
    );
    expect(result.name).toBe('Office');
  });

  it('should update a location and keep calendar events in sync', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Old Name' }] }) // existing
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Name' }] }) // update
      .mockResolvedValueOnce({ rows: [] }) // calendar event sync
      .mockResolvedValueOnce({}); // COMMIT

    const result = await Location.updateLocation(1, { name: 'New Name' });

    expect(result.name).toBe('New Name');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE calendar_events'),
      ['New Name', 1]
    );
  });
});
