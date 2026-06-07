const LocationController = require('../../controllers/locationController');
const Location = require('../../models/locationModel');

jest.mock('../../models/locationModel');

describe('Location Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  it('should return all locations for admin', async () => {
    Location.getAllLocationsForAdmin.mockResolvedValue([{ id: 1, name: 'Office' }]);

    await LocationController.getAllLocationsForAdmin(req, res);

    expect(Location.getAllLocationsForAdmin).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 1, name: 'Office' }]
    });
  });

  it('should search locations', async () => {
    req.query.q = 'off';
    Location.searchLocations.mockResolvedValue([{ id: 1, name: 'Office' }]);

    await LocationController.searchLocations(req, res);

    expect(Location.searchLocations).toHaveBeenCalledWith('off');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 1, name: 'Office' }]
    });
  });

  it('should create a location', async () => {
    req.body = { name: 'Office', description: 'Main' };
    Location.createLocation.mockResolvedValue({ id: 1, name: 'Office', description: 'Main', is_active: true });

    await LocationController.createLocation(req, res);

    expect(Location.createLocation).toHaveBeenCalledWith({
      name: 'Office',
      description: 'Main',
      is_active: true
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
