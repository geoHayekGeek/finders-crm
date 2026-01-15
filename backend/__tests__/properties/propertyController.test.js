// __tests__/properties/propertyController.test.js
const propertyController = require('../../controllers/propertyController');
const Property = require('../../models/propertyModel');
const PropertyReferral = require('../../models/propertyReferralModel');
const Status = require('../../models/statusModel');
const User = require('../../models/userModel');
const Notification = require('../../models/notificationModel');
const CalendarEvent = require('../../models/calendarEventModel');

// Mock all dependencies
jest.mock('../../models/propertyModel');
jest.mock('../../models/propertyReferralModel');
jest.mock('../../models/statusModel');
jest.mock('../../models/userModel');
jest.mock('../../models/notificationModel');
jest.mock('../../models/calendarEventModel');

describe('Property Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, role: 'admin' },
      roleFilters: {
        role: 'admin',
        canViewAll: true,
        canManageProperties: true
      },
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getAllProperties', () => {
    it('should get all properties for admin', async () => {
      const mockProperties = [
        { id: 1, building_name: 'Building 1', location: 'Location 1', agent_id: 1 },
        { id: 2, building_name: 'Building 2', location: 'Location 2', agent_id: 2 }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await propertyController.getAllProperties(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProperties,
        total: 2,
        role: 'admin'
      });
    });

    it('should filter owner details for agents', async () => {
      req.user = { id: 1, role: 'agent' };
      req.roleFilters = {
        role: 'agent',
        canViewAll: false,
        canManageProperties: false
      };

      const mockProperties = [
        { id: 1, building_name: 'Building 1', owner_name: 'Owner 1', phone_number: '123', agent_id: 1 },
        { id: 2, building_name: 'Building 2', owner_name: 'Owner 2', phone_number: '456', agent_id: 2 }
      ];

      Property.getAllPropertiesWithFilteredOwnerDetails.mockResolvedValue(mockProperties);

      await propertyController.getAllProperties(req, res);

      expect(Property.getAllPropertiesWithFilteredOwnerDetails).toHaveBeenCalledWith('agent', 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 1, building_name: 'Building 1', owner_name: 'Owner 1', phone_number: '123', agent_id: 1 },
          { id: 2, building_name: 'Building 2', owner_name: 'Hidden', phone_number: 'Hidden', agent_id: 2 }
        ],
        total: 2,
        role: 'agent'
      });
    });

    it('should filter owner details for team leaders', async () => {
      req.user = { id: 1, role: 'team_leader' };
      req.roleFilters = {
        role: 'team_leader',
        canViewAll: false,
        canManageProperties: false
      };

      const mockProperties = [
        { id: 1, building_name: 'Building 1', owner_name: 'Owner 1', phone_number: '123', agent_id: 1 }
      ];
      const mockTeamAgents = [{ id: 1 }, { id: 2 }];

      Property.getAllPropertiesWithFilteredOwnerDetails.mockResolvedValue(mockProperties);
      User.getTeamLeaderAgents.mockResolvedValue(mockTeamAgents);
      Property.canUserSeeOwnerDetails.mockResolvedValue(true);

      await propertyController.getAllProperties(req, res);

      expect(Property.getAllPropertiesWithFilteredOwnerDetails).toHaveBeenCalledWith('team_leader', 1);
      expect(User.getTeamLeaderAgents).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 403 for unauthorized access', async () => {
      req.roleFilters = {
        role: 'unauthorized',
        canViewAll: false,
        canManageProperties: false
      };

      await propertyController.getAllProperties(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    it('should handle errors', async () => {
      Property.getAllProperties.mockRejectedValue(new Error('Database error'));

      await propertyController.getAllProperties(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: 'Database error'
      });
    });
  });

  describe('getPropertyById', () => {
    it('should get property by id', async () => {
      req.params.id = '1';
      const mockProperty = {
        id: 1,
        building_name: 'Building 1',
        location: 'Location 1',
        agent_id: 1
      };

      Property.getPropertyById.mockResolvedValue(mockProperty);

      await propertyController.getPropertyById(req, res);

      expect(Property.getPropertyById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProperty,
        role: 'admin'
      });
    });

    it('should return 404 if property not found', async () => {
      req.params.id = '999';
      Property.getPropertyById.mockResolvedValue(null);

      await propertyController.getPropertyById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Property not found' });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      Property.getPropertyById.mockRejectedValue(new Error('Database error'));

      await propertyController.getPropertyById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('createProperty', () => {
    const mockPropertyData = {
      status_id: 1,
      property_type: 'sale',
      location: 'Beirut',
      category_id: 1,
      building_name: 'Test Building',
      owner_id: 1,
      owner_name: 'John Doe',
      phone_number: '1234567890',
      surface: 100,
      details: {
        floor_number: '5th',
        balcony: 'Yes',
        covered_parking: '2 spaces',
        outdoor_parking: '1 space',
        cave: 'No'
      },
      interior_details: {
        living_rooms: '2',
        bedrooms: '3',
        bathrooms: '2',
        maid_room: 'Yes'
      },
      payment_facilities: true,
      payment_facilities_specification: 'Bank financing available',
      view_type: 'sea view',
      concierge: false,
      price: 100000,
      agent_id: 1,
      main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      referrals: [
        { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
      ]
    };

    it('should create property successfully', async () => {
      req.body = mockPropertyData;
      const mockCreatedProperty = { id: 1, ...mockPropertyData, reference_number: 'REF001' };

      Property.createProperty.mockResolvedValue(mockCreatedProperty);
      PropertyReferral.applyExternalRuleToPropertyReferrals.mockResolvedValue({
        message: 'Rule applied',
        markedExternalReferrals: []
      });
      Notification.createPropertyNotification.mockResolvedValue({});
      Notification.createNotification.mockResolvedValue({});
      CalendarEvent.createEvent.mockResolvedValue({});

      await propertyController.createProperty(req, res);

      expect(Property.createProperty).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Property created successfully',
        data: mockCreatedProperty
      });
    });

    it('should return 403 if user cannot manage properties', async () => {
      req.roleFilters.canManageProperties = false;
      req.body = mockPropertyData;

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to create properties.'
      });
      expect(Property.createProperty).not.toHaveBeenCalled();
    });

    it('should validate agent assignment for agent manager', async () => {
      req.roleFilters.role = 'agent manager';
      req.body = { ...mockPropertyData, agent_id: 999 };

      User.findById.mockResolvedValue(null);

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Agent manager can only assign properties to agents'
      });
    });

    it('should create property with referrals', async () => {
      req.body = {
        ...mockPropertyData,
        referrals: [{ employee_id: 2, commission_percentage: 5 }]
      };
      const mockCreatedProperty = { id: 1, ...mockPropertyData, reference_number: 'REF001' };

      Property.createProperty.mockResolvedValue(mockCreatedProperty);
      PropertyReferral.applyExternalRuleToPropertyReferrals.mockResolvedValue({
        message: 'Rule applied',
        markedExternalReferrals: []
      });
      Notification.createPropertyNotification.mockResolvedValue({});
      Notification.createReferralNotification.mockResolvedValue({});

      await propertyController.createProperty(req, res);

      expect(Property.createProperty).toHaveBeenCalled();
      expect(PropertyReferral.applyExternalRuleToPropertyReferrals).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should create property with structured details and payment facilities', async () => {
      req.body = {
        ...mockPropertyData,
        details: {
          floor_number: '10th',
          balcony: 'Large',
          covered_parking: '3 spaces',
          outdoor_parking: '2 spaces',
          cave: 'Yes'
        },
        interior_details: {
          living_rooms: '3',
          bedrooms: '4',
          bathrooms: '3',
          maid_room: 'Yes'
        },
        payment_facilities: true,
        payment_facilities_specification: 'Bank financing up to 80%'
      };
      const mockCreatedProperty = { 
        id: 1, 
        ...mockPropertyData, 
        reference_number: 'REF001',
        details: req.body.details,
        interior_details: req.body.interior_details,
        payment_facilities: true,
        payment_facilities_specification: 'Bank financing up to 80%'
      };

      Property.createProperty.mockResolvedValue(mockCreatedProperty);
      PropertyReferral.applyExternalRuleToPropertyReferrals.mockResolvedValue({
        message: 'Rule applied',
        markedExternalReferrals: []
      });
      Notification.createPropertyNotification.mockResolvedValue({});

      await propertyController.createProperty(req, res);

      // Check that createProperty was called with the correct data
      const createPropertyCall = Property.createProperty.mock.calls[0][0];
      expect(createPropertyCall.details).toEqual(expect.objectContaining({
        floor_number: '10th',
        balcony: 'Large',
        covered_parking: '3 spaces',
        outdoor_parking: '2 spaces',
        cave: 'Yes'
      }));
      expect(createPropertyCall.interior_details).toEqual(expect.objectContaining({
        living_rooms: '3',
        bedrooms: '4',
        bathrooms: '3',
        maid_room: 'Yes'
      }));
      expect(createPropertyCall.payment_facilities).toBe(true);
      expect(createPropertyCall.payment_facilities_specification).toBe('Bank financing up to 80%');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle validation errors', async () => {
      req.body = mockPropertyData;
      Property.createProperty.mockRejectedValue(new Error('Invalid base64 image'));

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid base64 image'
      });
    });

    it('should handle database errors', async () => {
      req.body = mockPropertyData;
      Property.createProperty.mockRejectedValue(new Error('Database error'));

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('updateProperty', () => {
    const mockProperty = {
      id: 1,
      building_name: 'Building 1',
      location: 'Location 1',
      agent_id: 1,
      status_id: 1,
      reference_number: 'REF001'
    };

    it('should update property successfully', async () => {
      req.params.id = '1';
      req.body = { building_name: 'Updated Building' };
      const mockUpdatedProperty = { ...mockProperty, building_name: 'Updated Building' };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);
      Notification.createPropertyNotification.mockResolvedValue({});

      await propertyController.updateProperty(req, res);

      expect(Property.getPropertyById).toHaveBeenCalledWith('1');
      expect(Property.updateProperty).toHaveBeenCalledWith('1', req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Property updated successfully',
        data: mockUpdatedProperty
      });
    });

    it('should return 403 if user cannot manage properties', async () => {
      req.params.id = '1';
      req.body = { building_name: 'Updated Building' };
      req.roleFilters.canManageProperties = false;

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to update properties.'
      });
    });

    it('should return 404 if property not found', async () => {
      req.params.id = '999';
      req.body = { building_name: 'Updated Building' };
      Property.getPropertyById.mockResolvedValue(null);

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Property not found' });
    });

    it('should prevent agent from updating other agent\'s property', async () => {
      req.params.id = '1';
      req.body = { building_name: 'Updated Building' };
      req.user = { id: 1, role: 'agent' };
      req.roleFilters = {
        role: 'agent',
        canManageProperties: true
      };

      Property.getPropertyById.mockResolvedValue({ ...mockProperty, agent_id: 2 });

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You can only update properties assigned to you.'
      });
    });

    it('should auto-set closed_date when status changes to closed', async () => {
      req.params.id = '1';
      req.body = { status_id: 2 };
      const mockStatus = { id: 2, code: 'closed' };
      const mockUpdatedProperty = { ...mockProperty, status_id: 2, closed_date: '2024-01-01' };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      Status.getStatusById.mockResolvedValue(mockStatus);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);
      Notification.createPropertyNotification.mockResolvedValue({});

      await propertyController.updateProperty(req, res);

      expect(Status.getStatusById).toHaveBeenCalledWith(2);
      expect(Property.updateProperty).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status_id: 2,
          closed_date: expect.any(String)
        })
      );
    });

    it('should clear closed_date when status changes away from closed', async () => {
      req.params.id = '1';
      req.body = { status_id: 3 };
      const mockStatus = { id: 3, code: 'active' };
      const mockUpdatedProperty = { ...mockProperty, status_id: 3, closed_date: null };

      Property.getPropertyById.mockResolvedValue({ ...mockProperty, status_id: 2 });
      Status.getStatusById.mockResolvedValue(mockStatus);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);
      Notification.createPropertyNotification.mockResolvedValue({});

      await propertyController.updateProperty(req, res);

      expect(Property.updateProperty).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status_id: 3,
          closed_date: null
        })
      );
    });

    it('should apply external rule when referrals are updated', async () => {
      req.params.id = '1';
      req.body = { referrals: [{ employee_id: 2 }] };
      const mockUpdatedProperty = { ...mockProperty };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);
      PropertyReferral.applyExternalRuleToPropertyReferrals.mockResolvedValue({
        message: 'Rule applied',
        markedExternalReferrals: []
      });
      Notification.createPropertyNotification.mockResolvedValue({});

      await propertyController.updateProperty(req, res);

      expect(PropertyReferral.applyExternalRuleToPropertyReferrals).toHaveBeenCalledWith(1);
    });

    it('should create notification when agent assignment changes', async () => {
      req.params.id = '1';
      req.body = { agent_id: 2 };
      const mockUpdatedProperty = { ...mockProperty, agent_id: 2 };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);
      Notification.createPropertyNotification.mockResolvedValue({});
      Notification.createNotification.mockResolvedValue({});
      CalendarEvent.createEvent.mockResolvedValue({});

      await propertyController.updateProperty(req, res);

      expect(Notification.createNotification).toHaveBeenCalled();
      expect(CalendarEvent.createEvent).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.params.id = '1';
      req.body = { building_name: 'Updated Building' };
      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.updateProperty.mockRejectedValue(new Error('Invalid base64 image'));

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid base64 image'
      });
    });

    it('should handle database errors', async () => {
      req.params.id = '1';
      req.body = { building_name: 'Updated Building' };
      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.updateProperty.mockRejectedValue(new Error('Database error'));

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('deleteProperty', () => {
    const mockProperty = {
      id: 1,
      building_name: 'Building 1',
      location: 'Location 1',
      agent_id: 1,
      reference_number: 'REF001'
    };

    it('should delete property successfully', async () => {
      req.params.id = '1';
      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.deleteProperty.mockResolvedValue({});
      Notification.createPropertyNotification.mockResolvedValue({});

      await propertyController.deleteProperty(req, res);

      expect(Property.getPropertyById).toHaveBeenCalledWith(1);
      expect(Property.deleteProperty).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Property deleted successfully'
      });
    });

    it('should return 400 for invalid property ID', async () => {
      req.params.id = 'invalid';

      await propertyController.deleteProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid property ID' });
      expect(Property.deleteProperty).not.toHaveBeenCalled();
    });

    it('should return 403 if user cannot manage properties', async () => {
      req.params.id = '1';
      req.roleFilters.canManageProperties = false;

      await propertyController.deleteProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to delete properties.'
      });
    });

    it('should return 404 if property not found', async () => {
      req.params.id = '999';
      Property.getPropertyById.mockResolvedValue(null);

      await propertyController.deleteProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Property not found' });
    });

    it('should prevent agent from deleting other agent\'s property', async () => {
      req.params.id = '1';
      req.user = { id: 1, role: 'agent' };
      req.roleFilters = {
        role: 'agent',
        canManageProperties: true
      };

      Property.getPropertyById.mockResolvedValue({ ...mockProperty, agent_id: 2 });

      await propertyController.deleteProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You can only delete properties assigned to you.'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.deleteProperty.mockRejectedValue(new Error('Database error'));

      await propertyController.deleteProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getPropertyStats', () => {
    it('should get property statistics', async () => {
      const mockStats = {
        total: 100,
        sold: 20,
        rented: 30,
        available: 50
      };
      const mockLocationStats = [];
      const mockCategoryStats = [];
      const mockStatusStats = [];
      const mockViewStats = [];
      const mockPriceRangeStats = [];

      Property.getPropertyStats.mockResolvedValue(mockStats);
      Property.getPropertiesByLocation.mockResolvedValue(mockLocationStats);
      Property.getPropertiesByCategory.mockResolvedValue(mockCategoryStats);
      Property.getPropertiesByStatus.mockResolvedValue(mockStatusStats);
      Property.getPropertiesByView.mockResolvedValue(mockViewStats);
      Property.getPropertiesByPriceRange.mockResolvedValue(mockPriceRangeStats);

      await propertyController.getPropertyStats(req, res);

      expect(Property.getPropertyStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overview: mockStats,
          byLocation: mockLocationStats,
          byCategory: mockCategoryStats,
          byStatus: mockStatusStats,
          byView: mockViewStats,
          byPriceRange: mockPriceRangeStats
        }
      });
    });

    it('should return 403 if user cannot view all data', async () => {
      req.roleFilters.canViewAll = false;

      await propertyController.getPropertyStats(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to view property statistics.'
      });
    });

    it('should handle errors', async () => {
      Property.getPropertyStats.mockRejectedValue(new Error('Database error'));

      await propertyController.getPropertyStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getPropertiesByAgent', () => {
    it('should get properties by agent', async () => {
      req.params.agentId = '1';
      req.roleFilters.canViewAgentPerformance = true;
      const mockProperties = [
        { id: 1, building_name: 'Building 1', agent_id: 1 },
        { id: 2, building_name: 'Building 2', agent_id: 1 }
      ];

      Property.getPropertiesByAgent.mockResolvedValue(mockProperties);

      await propertyController.getPropertiesByAgent(req, res);

      expect(Property.getPropertiesByAgent).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProperties,
        total: 2
      });
    });

    it('should return 403 if user cannot view agent performance', async () => {
      req.params.agentId = '1';
      req.roleFilters.canViewAgentPerformance = false;

      await propertyController.getPropertiesByAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to view agent performance data.'
      });
    });

    it('should handle errors', async () => {
      req.params.agentId = '1';
      req.roleFilters.canViewAgentPerformance = true;
      Property.getPropertiesByAgent.mockRejectedValue(new Error('Database error'));

      await propertyController.getPropertiesByAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getPropertiesWithFilters', () => {
    it('should get properties with filters', async () => {
      req.query = { location: 'Beirut', property_type: 'apartment' };
      const mockProperties = [
        { id: 1, building_name: 'Building 1', location: 'Beirut', property_type: 'apartment', reference_number: 'REF001', price: 100000 }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await propertyController.getPropertiesWithFilters(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProperties,
        total: 1,
        role: 'admin'
      });
    });

    it('should filter properties by agent_id', async () => {
      req.query = { agent_id: '1' };
      const mockProperties = [
        { id: 1, building_name: 'Building 1', agent_id: 1, reference_number: 'REF001', price: 100000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 1', surface: 100, view_type: 'sea view' },
        { id: 2, building_name: 'Building 2', agent_id: 2, reference_number: 'REF002', price: 200000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 2', surface: 200, view_type: 'sea view' },
        { id: 3, building_name: 'Building 3', agent_id: 1, reference_number: 'REF003', price: 300000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 3', surface: 300, view_type: 'sea view' }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await propertyController.getPropertiesWithFilters(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      // Should filter to only properties with agent_id = 1
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      expect(responseCall.data).toHaveLength(2);
      expect(responseCall.data[0].agent_id).toBe(1);
      expect(responseCall.data[1].agent_id).toBe(1);
      expect(responseCall.total).toBe(2);
      expect(responseCall.role).toBe('admin');
    });

    it('should return empty array when no properties match agent_id filter', async () => {
      req.query = { agent_id: '999' };
      const mockProperties = [
        { id: 1, building_name: 'Building 1', agent_id: 1, reference_number: 'REF001', price: 100000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 1', surface: 100, view_type: 'sea view' },
        { id: 2, building_name: 'Building 2', agent_id: 2, reference_number: 'REF002', price: 200000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 2', surface: 200, view_type: 'sea view' }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await propertyController.getPropertiesWithFilters(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      expect(responseCall.data).toHaveLength(0);
      expect(responseCall.total).toBe(0);
    });

    it('should filter properties by agent_id combined with other filters', async () => {
      req.query = { agent_id: '1', status_id: '1', price_min: '150000' };
      const mockProperties = [
        { id: 1, building_name: 'Building 1', agent_id: 1, reference_number: 'REF001', price: 100000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 1', surface: 100, view_type: 'sea view' },
        { id: 2, building_name: 'Building 2', agent_id: 2, reference_number: 'REF002', price: 200000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 2', surface: 200, view_type: 'sea view' },
        { id: 3, building_name: 'Building 3', agent_id: 1, reference_number: 'REF003', price: 300000, status_id: 1, category_id: 1, location: 'Beirut', owner_name: 'Owner 3', surface: 300, view_type: 'sea view' }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await propertyController.getPropertiesWithFilters(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      // Should filter to only properties with agent_id = 1, status_id = 1, and price >= 150000
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      expect(responseCall.data).toHaveLength(1);
      expect(responseCall.data[0].agent_id).toBe(1);
      expect(responseCall.data[0].price).toBeGreaterThanOrEqual(150000);
      expect(responseCall.total).toBe(1);
    });

    it('should handle empty results', async () => {
      req.query = { location: 'NonExistent' };
      Property.getAllProperties.mockResolvedValue([]);

      await propertyController.getPropertiesWithFilters(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0,
        role: 'admin'
      });
    });

    it('should handle errors', async () => {
      req.query = { location: 'Beirut' };
      Property.getAllProperties.mockRejectedValue(new Error('Database error'));

      await propertyController.getPropertiesWithFilters(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getDemoProperties', () => {
    it('should get demo properties', async () => {
      const mockProperties = [
        { id: 1, building_name: 'Building 1' },
        { id: 2, building_name: 'Building 2' }
      ];

      Property.getAllProperties.mockResolvedValue(mockProperties);

      await propertyController.getDemoProperties(req, res);

      expect(Property.getAllProperties).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProperties,
        total: 2,
        message: 'Demo properties loaded successfully'
      });
    });

    it('should handle errors', async () => {
      Property.getAllProperties.mockRejectedValue(new Error('Database error'));

      await propertyController.getDemoProperties(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });


  describe('removeImageFromGallery', () => {
    const mockProperty = {
      id: 1,
      building_name: 'Building 1',
      agent_id: 1
    };

    it('should remove image from gallery successfully', async () => {
      req.params.id = '1';
      req.body = { base64Image: 'base64encodedimage' };
      const mockUpdatedProperty = { ...mockProperty, image_gallery: [] };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.removeImageFromGallery.mockResolvedValue(mockUpdatedProperty);

      await propertyController.removeImageFromGallery(req, res);

      expect(Property.getPropertyById).toHaveBeenCalledWith('1');
      expect(Property.removeImageFromGallery).toHaveBeenCalledWith('1', 'base64encodedimage');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Image removed from gallery successfully',
        data: mockUpdatedProperty
      });
    });

    it('should return 400 if base64Image is missing', async () => {
      req.params.id = '1';
      req.body = {};

      await propertyController.removeImageFromGallery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Base64 image is required' });
    });

    it('should return 403 if user cannot manage properties', async () => {
      req.params.id = '1';
      req.body = { base64Image: 'base64encodedimage' };
      req.roleFilters.canManageProperties = false;

      await propertyController.removeImageFromGallery(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to remove images from properties.'
      });
    });

    it('should return 404 if property not found', async () => {
      req.params.id = '999';
      req.body = { base64Image: 'base64encodedimage' };
      Property.getPropertyById.mockResolvedValue(null);

      await propertyController.removeImageFromGallery(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Property not found' });
    });
  });

  describe('getPropertiesWithImages', () => {
    it('should get properties with images', async () => {
      const mockProperties = [
        { id: 1, building_name: 'Building 1', main_image: 'image1.jpg' },
        { id: 2, building_name: 'Building 2', main_image: 'image2.jpg' }
      ];

      Property.getPropertiesWithImages.mockResolvedValue(mockProperties);

      await propertyController.getPropertiesWithImages(req, res);

      expect(Property.getPropertiesWithImages).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProperties,
        total: 2
      });
    });

    it('should return 403 if user cannot view all data', async () => {
      req.roleFilters.canViewAll = false;

      await propertyController.getPropertiesWithImages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to view properties with images.'
      });
    });

    it('should handle errors', async () => {
      Property.getPropertiesWithImages.mockRejectedValue(new Error('Database error'));

      await propertyController.getPropertiesWithImages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('uploadMainImage', () => {
    const mockProperty = {
      id: 1,
      building_name: 'Building 1',
      agent_id: 1
    };

    it('should upload main image successfully', async () => {
      req.params.id = '1';
      req.file = { filename: 'main-image.jpg', path: '/uploads/main-image.jpg' };
      const mockUpdatedProperty = { ...mockProperty, main_image: '/assets/properties/main-image.jpg' };

      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);

      await propertyController.uploadMainImage(req, res);

      expect(Property.updateProperty).toHaveBeenCalledWith('1', {
        main_image: '/assets/properties/main-image.jpg'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProperty,
        message: 'Main image uploaded successfully'
      });
    });

    it('should return 400 if no file provided', async () => {
      req.params.id = '1';
      req.file = undefined;

      await propertyController.uploadMainImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No image file provided' });
    });

    it('should return 403 if user cannot manage properties', async () => {
      req.params.id = '1';
      req.file = { filename: 'main-image.jpg' };
      req.roleFilters.canManageProperties = false;

      await propertyController.uploadMainImage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to upload images.'
      });
    });

  });

  describe('uploadGalleryImages', () => {
    const mockProperty = {
      id: 1,
      building_name: 'Building 1',
      agent_id: 1,
      image_gallery: []
    };

    it('should upload gallery images successfully', async () => {
      req.params.id = '1';
      req.files = [
        { filename: 'gallery1.jpg' },
        { filename: 'gallery2.jpg' }
      ];
      const mockUpdatedProperty = {
        ...mockProperty,
        image_gallery: ['/assets/properties/gallery1.jpg', '/assets/properties/gallery2.jpg']
      };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);

      await propertyController.uploadGalleryImages(req, res);

      expect(Property.getPropertyById).toHaveBeenCalledWith('1');
      expect(Property.updateProperty).toHaveBeenCalledWith('1', {
        image_gallery: ['/assets/properties/gallery1.jpg', '/assets/properties/gallery2.jpg']
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProperty,
        message: '2 gallery images uploaded successfully'
      });
    });

    it('should append to existing gallery', async () => {
      req.params.id = '1';
      req.files = [{ filename: 'gallery3.jpg' }];
      const existingProperty = {
        ...mockProperty,
        image_gallery: ['/assets/properties/existing1.jpg']
      };
      const mockUpdatedProperty = {
        ...existingProperty,
        image_gallery: ['/assets/properties/existing1.jpg', '/assets/properties/gallery3.jpg']
      };

      Property.getPropertyById.mockResolvedValue(existingProperty);
      Property.updateProperty.mockResolvedValue(mockUpdatedProperty);

      await propertyController.uploadGalleryImages(req, res);

      expect(Property.updateProperty).toHaveBeenCalledWith('1', {
        image_gallery: ['/assets/properties/existing1.jpg', '/assets/properties/gallery3.jpg']
      });
    });

    it('should return 400 if no files provided', async () => {
      req.params.id = '1';
      req.files = [];

      await propertyController.uploadGalleryImages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No image files provided' });
    });

    it('should return 403 if user cannot manage properties', async () => {
      req.params.id = '1';
      req.files = [{ filename: 'gallery1.jpg' }];
      req.roleFilters.canManageProperties = false;

      await propertyController.uploadGalleryImages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to upload images.'
      });
    });
  });

  describe('getImageStats', () => {
    it('should get image statistics', async () => {
      const mockStats = {
        totalProperties: 100,
        propertiesWithMainImage: 80,
        propertiesWithGallery: 60,
        totalImages: 200
      };

      Property.getImageStats.mockResolvedValue(mockStats);

      await propertyController.getImageStats(req, res);

      expect(Property.getImageStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should return 403 if user cannot view all data', async () => {
      req.roleFilters.canViewAll = false;

      await propertyController.getImageStats(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have permission to view image statistics.'
      });
    });

    it('should handle errors', async () => {
      Property.getImageStats.mockRejectedValue(new Error('Database error'));

      await propertyController.getImageStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('referPropertyToAgent', () => {
    it('should refer property to agent successfully', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.user.name = 'Test User';
      req.roleFilters.canViewProperties = true;
      req.roleFilters.role = 'agent';

      const mockProperty = {
        id: 100,
        agent_id: 27,
        reference_number: 'PROP-001'
      };
      const mockReferral = {
        id: 1,
        property_id: 100,
        status: 'pending',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };

      Property.getPropertyById.mockResolvedValue(mockProperty);
      PropertyReferral.referPropertyToAgent.mockResolvedValue(mockReferral);
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await propertyController.referPropertyToAgent(req, res);

      expect(Property.getPropertyById).toHaveBeenCalledWith('100');
      expect(PropertyReferral.referPropertyToAgent).toHaveBeenCalledWith(100, 28, 27);
      expect(Notification.createNotification).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Property referred successfully'),
        data: mockReferral
      });
    });

    it('should return 404 if property not found', async () => {
      req.params.id = '999';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewProperties = true;
      req.roleFilters.role = 'agent';

      Property.getPropertyById.mockResolvedValue(null);

      await propertyController.referPropertyToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Property not found' });
    });

    it('should return 403 if user does not own the property', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewProperties = true;
      req.roleFilters.role = 'agent';

      const mockProperty = {
        id: 100,
        agent_id: 99 // Different agent
      };

      Property.getPropertyById.mockResolvedValue(mockProperty);

      await propertyController.referPropertyToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You can only refer properties that are assigned to you.'
      });
    });

    it('should return 400 if property status does not allow referrals', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewProperties = true;
      req.roleFilters.role = 'agent';

      const mockProperty = {
        id: 100,
        agent_id: 27,
        reference_number: 'PROP-001',
        status_name: 'Sold',
        status_can_be_referred: false
      };

      Property.getPropertyById.mockResolvedValue(mockProperty);

      await propertyController.referPropertyToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Properties with status "Sold" cannot be referred.'
      });
    });

    it('should return 400 if referred_to_agent_id is missing', async () => {
      req.params.id = '100';
      req.body = {};
      req.user.id = 27;
      req.roleFilters.canViewProperties = true;
      req.roleFilters.role = 'agent';

      await propertyController.referPropertyToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'referred_to_agent_id is required'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '100';
      req.body.referred_to_agent_id = 28;
      req.user.id = 27;
      req.roleFilters.canViewProperties = true;
      req.roleFilters.role = 'agent';

      Property.getPropertyById.mockRejectedValue(new Error('Database error'));

      await propertyController.referPropertyToAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  describe('getPendingReferrals', () => {
    it('should get pending referrals for current user', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      const mockReferrals = [
        {
          id: 1,
          property_id: 100,
          status: 'pending',
          reference_number: 'PROP-001',
          location: 'Beirut',
          referred_by_name: 'Omar',
          referred_by_role: 'agent'
        }
      ];

      PropertyReferral.getPendingReferralsForUser.mockResolvedValue(mockReferrals);

      await propertyController.getPendingReferrals(req, res);

      expect(PropertyReferral.getPendingReferralsForUser).toHaveBeenCalledWith(28);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReferrals,
        count: 1
      });
    });

    it('should handle errors', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      PropertyReferral.getPendingReferralsForUser.mockRejectedValue(new Error('Database error'));

      await propertyController.getPendingReferrals(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getPendingReferralsCount', () => {
    it('should get count of pending referrals', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      PropertyReferral.getPendingReferralsCount.mockResolvedValue(3);

      await propertyController.getPendingReferralsCount(req, res);

      expect(PropertyReferral.getPendingReferralsCount).toHaveBeenCalledWith(28);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 3
      });
    });

    it('should return 0 when no pending referrals', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      PropertyReferral.getPendingReferralsCount.mockResolvedValue(0);

      await propertyController.getPendingReferralsCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0
      });
    });

    it('should handle errors', async () => {
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      PropertyReferral.getPendingReferralsCount.mockRejectedValue(new Error('Database error'));

      await propertyController.getPendingReferralsCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('confirmReferral', () => {
    it('should confirm referral and assign property', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      const mockReferral = {
        id: 1,
        property_id: 100,
        status: 'confirmed',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };
      const mockProperty = {
        id: 100,
        agent_id: 28,
        reference_number: 'PROP-001'
      };

      PropertyReferral.confirmReferral.mockResolvedValue({
        referral: mockReferral,
        property: mockProperty
      });
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await propertyController.confirmReferral(req, res);

      expect(PropertyReferral.confirmReferral).toHaveBeenCalledWith(1, 28);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Referral confirmed'),
        data: {
          referral: mockReferral,
          property: mockProperty
        }
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      PropertyReferral.confirmReferral.mockRejectedValue(new Error('Referral not found'));

      await propertyController.confirmReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Referral not found' });
    });
  });

  describe('rejectReferral', () => {
    it('should reject referral successfully', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      const mockReferral = {
        id: 1,
        property_id: 100,
        status: 'rejected',
        referred_to_agent_id: 28,
        referred_by_user_id: 27
      };
      const mockProperty = {
        id: 100,
        reference_number: 'PROP-001'
      };

      PropertyReferral.rejectReferral.mockResolvedValue(mockReferral);
      Property.getPropertyById.mockResolvedValue(mockProperty);
      Notification.createNotification.mockResolvedValue({ id: 1 });

      await propertyController.rejectReferral(req, res);

      expect(PropertyReferral.rejectReferral).toHaveBeenCalledWith(1, 28);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('Referral rejected'),
        data: mockReferral
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.user.id = 28;
      req.roleFilters.role = 'agent';

      PropertyReferral.rejectReferral.mockRejectedValue(new Error('Referral not found'));

      await propertyController.rejectReferral(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Referral not found' });
    });
  });
});

