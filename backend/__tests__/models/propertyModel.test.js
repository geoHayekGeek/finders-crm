// backend/__tests__/models/propertyModel.test.js
// Unit tests for Property Model

const Property = require('../../models/propertyModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Property Model', () => {
  let mockQuery;
  let mockClient;
  let mockConnect;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    
    // Mock transaction client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockConnect = jest.fn().mockResolvedValue(mockClient);
    pool.connect = mockConnect;
    
    jest.clearAllMocks();
  });

  describe('createProperty', () => {
    it('should create a property successfully', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
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
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [{ code: 'APT' }] };
      const mockRefNumber = { rows: [{ generate_reference_number: 'APT-001' }] };
      const mockProperty = {
        rows: [{
          id: 1,
          reference_number: 'APT-001',
          ...propertyData
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockRefNumber);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockProperty) // INSERT
        .mockResolvedValueOnce({}) // INSERT referral
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Property.createProperty(propertyData);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(result.id).toBe(1);
      expect(result.reference_number).toBe('APT-001');
    });

    it('should throw error when closed status without closed_date', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
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
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'sold', name: 'Sold' }] };

      mockQuery.mockResolvedValueOnce(mockStatus);

      await expect(Property.createProperty(propertyData)).rejects.toThrow(
        'Properties with closed status (Sold/Rented/Closed) must have a closed_date set'
      );
    });

    it('should allow creating property without main_image (to be uploaded separately)', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
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
        agent_id: 1,
        price: 200000,
        main_image: null, // Null is allowed - will be uploaded separately
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [{ code: 'CAT' }] };
      const mockRefNumber = { rows: [{ generate_reference_number: 'REF-001' }] };
      const mockProperty = {
        rows: [{
          id: 1,
          reference_number: 'REF-001',
          ...propertyData
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockRefNumber);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockProperty) // INSERT
        .mockResolvedValueOnce({}) // INSERT referral
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Property.createProperty(propertyData);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(result.id).toBe(1);
      expect(result.reference_number).toBe('REF-001');
      expect(result.main_image).toBeNull();
    });

    it('should throw error when referrals are missing', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
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
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        // referrals is missing
      };

      await expect(Property.createProperty(propertyData)).rejects.toThrow(
        'At least one referral is required'
      );
    });

    it('should throw error when referrals is empty array', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
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
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [] // Empty array
      };

      await expect(Property.createProperty(propertyData)).rejects.toThrow(
        'At least one referral is required'
      );
    });

    it('should sync owner_name and phone_number from lead when owner_id provided', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
        owner_id: 1,
        owner_name: 'Old Name',
        phone_number: '1111111111',
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
        payment_facilities: false,
        view_type: 'sea view',
        concierge: false,
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [{ code: 'APT' }] };
      const mockRefNumber = { rows: [{ generate_reference_number: 'APT-001' }] };
      const mockOwner = { rows: [{ customer_name: 'John Doe', phone_number: '1234567890' }] };
      const mockProperty = { rows: [{ id: 1, reference_number: 'APT-001' }] };

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockRefNumber)
        .mockResolvedValueOnce(mockOwner);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockProperty) // INSERT (should use synced owner data)
        .mockResolvedValueOnce({}) // INSERT referral
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}); // COMMIT

      await Property.createProperty(propertyData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT customer_name, phone_number'),
        [1]
      );
    });

    it('should create property with referrals', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
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
        payment_facilities: false,
        view_type: 'sea view',
        concierge: false,
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Referral 1', type: 'employee', employee_id: 2, date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [{ code: 'APT' }] };
      const mockRefNumber = { rows: [{ generate_reference_number: 'APT-001' }] };
      const mockProperty = { rows: [{ id: 1, reference_number: 'APT-001' }] };

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockRefNumber);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockProperty) // INSERT property
        .mockResolvedValueOnce({}) // INSERT referral
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}); // COMMIT

      await Property.createProperty(propertyData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO referrals'),
        expect.arrayContaining([1, 'Referral 1', 'employee', 2, '2024-01-01'])
      );
    });

    it('should throw error for invalid category', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 999,
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
        payment_facilities: false,
        view_type: 'sea view',
        concierge: false,
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [] }; // No category found

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory);

      await expect(Property.createProperty(propertyData)).rejects.toThrow('Invalid category');
    });

    it('should handle structured details and interior_details correctly', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
        owner_name: 'John Doe',
        phone_number: '1234567890',
        surface: 100,
        details: {
          floor_number: '10th',
          balcony: 'Large balcony',
          covered_parking: '3 spaces',
          outdoor_parking: '2 spaces',
          cave: 'Yes, 20 sqm'
        },
        interior_details: {
          living_rooms: '3',
          bedrooms: '4',
          bathrooms: '3',
          maid_room: 'Yes, with bathroom'
        },
        payment_facilities: true,
        payment_facilities_specification: 'Bank financing up to 80%',
        view_type: 'sea view',
        concierge: true,
        agent_id: 1,
        price: 500000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [{ code: 'APT' }] };
      const mockRefNumber = { rows: [{ generate_reference_number: 'APT-001' }] };
      const mockProperty = {
        rows: [{
          id: 1,
          reference_number: 'APT-001',
          ...propertyData
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockRefNumber);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockProperty) // INSERT
        .mockResolvedValueOnce({}) // INSERT referral
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Property.createProperty(propertyData);

      expect(result.id).toBe(1);
      expect(result.details).toEqual(propertyData.details);
      expect(result.interior_details).toEqual(propertyData.interior_details);
      expect(result.payment_facilities).toBe(true);
      expect(result.payment_facilities_specification).toBe('Bank financing up to 80%');
    });

    it('should convert string details to structured object for backward compatibility', async () => {
      const propertyData = {
        status_id: 1,
        property_type: 'sale',
        location: 'Test Location',
        category_id: 1,
        owner_name: 'John Doe',
        phone_number: '1234567890',
        surface: 100,
        details: 'Legacy text details',
        interior_details: 'Legacy text interior',
        view_type: 'sea view',
        concierge: false,
        agent_id: 1,
        price: 200000,
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };

      const mockStatus = { rows: [{ code: 'active', name: 'Active' }] };
      const mockCategory = { rows: [{ code: 'APT' }] };
      const mockRefNumber = { rows: [{ generate_reference_number: 'APT-001' }] };
      const mockProperty = {
        rows: [{
          id: 1,
          reference_number: 'APT-001',
          ...propertyData
        }]
      };

      mockQuery
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockRefNumber);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockProperty) // INSERT
        .mockResolvedValueOnce({}) // INSERT referral
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}); // COMMIT

      const result = await Property.createProperty(propertyData);

      expect(result.id).toBe(1);
      // The model should convert string to structured object
      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('getAllProperties', () => {
    it('should get all properties with referrals', async () => {
      const mockProperties = {
        rows: [
          { id: 1, reference_number: 'APT-001', status_id: 1, status_can_be_referred: true },
          { id: 2, reference_number: 'APT-002', status_id: 1, status_can_be_referred: false }
        ]
      };
      const mockReferrals = {
        rows: [
          { property_id: 1, id: 1, name: 'Ref 1', type: 'employee', employee_id: 2, date: '2024-01-01', external: false }
        ]
      };

      mockQuery
        .mockResolvedValueOnce(mockProperties)
        .mockResolvedValueOnce(mockReferrals);

      const result = await Property.getAllProperties();

      expect(result).toHaveLength(2);
      expect(result[0].referrals).toHaveLength(1);
      expect(result[1].referrals).toHaveLength(0);
      expect(result[0].status_can_be_referred).toBe(true);
      expect(result[1].status_can_be_referred).toBe(false);
    });

    it('should include status_can_be_referred in query', async () => {
      const mockProperties = {
        rows: [
          { id: 1, reference_number: 'APT-001', status_can_be_referred: true }
        ]
      };
      const mockReferrals = { rows: [] };

      mockQuery
        .mockResolvedValueOnce(mockProperties)
        .mockResolvedValueOnce(mockReferrals);

      await Property.getAllProperties();

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('status_can_be_referred');
      expect(queryCall).toContain('COALESCE(s.can_be_referred, TRUE) as status_can_be_referred');
    });

    it('should handle empty properties list', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Property.getAllProperties();

      expect(result).toEqual([]);
    });
  });

  describe('getPropertyById', () => {
    it('should get property by id with referrals', async () => {
      const mockProperty = {
        rows: [{
          id: 1,
          reference_number: 'APT-001',
          status_id: 1,
          status_can_be_referred: true
        }]
      };
      const mockReferrals = {
        rows: [
          { id: 1, name: 'Ref 1', type: 'employee', employee_id: 2, date: '2024-01-01', external: false }
        ]
      };

      mockQuery
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(mockReferrals);

      const result = await Property.getPropertyById(1);

      expect(result.id).toBe(1);
      expect(result.referrals).toHaveLength(1);
      expect(result.status_can_be_referred).toBe(true);
    });

    it('should include status_can_be_referred in query', async () => {
      const mockProperty = {
        rows: [{
          id: 1,
          reference_number: 'APT-001',
          status_can_be_referred: false
        }]
      };
      const mockReferrals = { rows: [] };

      mockQuery
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(mockReferrals);

      await Property.getPropertyById(1);

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('status_can_be_referred');
      expect(queryCall).toContain('COALESCE(s.can_be_referred, TRUE) as status_can_be_referred');
    });

    it('should return property with status_can_be_referred false', async () => {
      const mockProperty = {
        rows: [{
          id: 2,
          reference_number: 'APT-002',
          status_can_be_referred: false
        }]
      };
      const mockReferrals = { rows: [] };

      mockQuery
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(mockReferrals);

      const result = await Property.getPropertyById(2);

      expect(result.status_can_be_referred).toBe(false);
    });

    it('should return null for invalid id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Property.getPropertyById(999);

      expect(result).toBeNull();
    });

    it('should return null for non-numeric id', async () => {
      const result = await Property.getPropertyById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('getPropertiesByAgent', () => {
    it('should get properties for a specific agent', async () => {
      const mockProperties = {
        rows: [
          { id: 1, reference_number: 'APT-001', agent_id: 1, status_can_be_referred: true },
          { id: 2, reference_number: 'APT-002', agent_id: 1, status_can_be_referred: false }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockProperties);

      const result = await Property.getPropertiesByAgent(1);

      expect(result).toHaveLength(2);
      expect(result[0].status_can_be_referred).toBe(true);
      expect(result[1].status_can_be_referred).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.agent_id = $1'),
        [1]
      );
    });

    it('should include status_can_be_referred in query', async () => {
      const mockProperties = {
        rows: [
          { id: 1, reference_number: 'APT-001', status_can_be_referred: true }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockProperties);

      await Property.getPropertiesByAgent(1);

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('status_can_be_referred');
      expect(queryCall).toContain('COALESCE(s.can_be_referred, TRUE) as status_can_be_referred');
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully', async () => {
      const updates = {
        price: 250000,
        location: 'New Location'
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          reference_number: 'APT-001',
          price: 250000,
          location: 'New Location'
        }]
      };
      const mockProperty = { rows: [{ id: 1 }] };
      const mockReferrals = { rows: [] };
      const mockExistingReferrals = { rows: [{ count: '1' }] }; // Property already has 1 referral

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce(mockExistingReferrals) // Check existing referrals count
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce(mockProperty) // SELECT property
        .mockResolvedValueOnce(mockReferrals); // SELECT referrals

      const result = await Property.updateProperty(1, updates);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(result.id).toBe(1);
    });

    it('should throw error when setting closed status without closed_date', async () => {
      const updates = {
        status_id: 2 // Closed status
      };

      const mockStatus = { rows: [{ code: 'sold', name: 'Sold' }] };
      const mockProperty = { rows: [{ closed_date: null }] };
      const mockExistingReferrals = { rows: [{ count: '1' }] }; // Property already has 1 referral

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockStatus) // Status check
        .mockResolvedValueOnce(mockProperty); // Existing property check

      await expect(Property.updateProperty(1, updates)).rejects.toThrow(
        'Properties with closed status (Sold/Rented/Closed) must have a closed_date set'
      );
    });

    it('should sync owner data when owner_id is updated', async () => {
      const updates = {
        owner_id: 2
      };

      const mockOwner = { rows: [{ customer_name: 'Jane Doe', phone_number: '9876543210' }] };
      const mockUpdated = { rows: [{ id: 1 }] };
      const mockProperty = { rows: [{ id: 1 }] };
      const mockReferrals = { rows: [] };
      const mockExistingReferrals = { rows: [{ count: '1' }] }; // Property already has 1 referral

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce(mockOwner) // Get owner data
        .mockResolvedValueOnce(mockUpdated) // UPDATE
        .mockResolvedValueOnce(mockExistingReferrals) // Check existing referrals count
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce(mockProperty)
        .mockResolvedValueOnce(mockReferrals);

      await Property.updateProperty(1, updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT customer_name, phone_number'),
        [2]
      );
    });

    it('should update referrals when provided', async () => {
      const updates = {
        referrals: [
          { name: 'New Referral', type: 'employee', employee_id: 3, date: '2024-01-01' }
        ]
      };

      const mockUpdated = { rows: [{ id: 1 }] };
      const mockProperty = { rows: [{ id: 1 }] };
      const mockReferrals = { rows: [] };

      // The referral insert happens in a loop, so we need to mock it for each referral
      // Note: When only referrals are provided, propertyUpdates is empty, so UPDATE won't be called
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE referrals
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT referral 1 (must return rows with id)
        .mockResolvedValueOnce({}) // UPDATE referrals_count
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce(mockProperty) // SELECT property
        .mockResolvedValueOnce(mockReferrals); // SELECT referrals

      await Property.updateProperty(1, updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM referrals'),
        [1]
      );
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      const mockDeleted = {
        rows: [{
          id: 1,
          reference_number: 'APT-001'
        }]
      };

      mockQuery.mockResolvedValueOnce(mockDeleted);

      const result = await Property.deleteProperty(1);

      expect(result.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM properties'),
        [1]
      );
    });

    it('should return undefined when property not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Property.deleteProperty(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getPropertiesWithFilters', () => {
    it('should filter by status_id', async () => {
      const filters = { status_id: 1 };
      const mockProperties = { rows: [{ id: 1, status_id: 1 }] };
      const mockReferrals = { rows: [] };

      mockQuery
        .mockResolvedValueOnce(mockProperties)
        .mockResolvedValueOnce(mockReferrals);

      const result = await Property.getPropertiesWithFilters(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND p.status_id = $'),
        expect.arrayContaining([1])
      );
    });

    it('should filter by multiple criteria', async () => {
      const filters = {
        status_id: 1,
        category_id: 2,
        agent_id: 3,
        price_min: 100000,
        price_max: 500000,
        search: 'test'
      };
      const mockProperties = { rows: [] };
      const mockReferrals = { rows: [] };

      mockQuery
        .mockResolvedValueOnce(mockProperties)
        .mockResolvedValueOnce(mockReferrals);

      await Property.getPropertiesWithFilters(filters);

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('AND p.status_id =');
      expect(queryCall).toContain('AND p.category_id =');
      expect(queryCall).toContain('AND p.agent_id =');
      expect(queryCall).toContain('AND p.price >=');
      expect(queryCall).toContain('AND p.price <=');
      expect(queryCall).toContain('ILIKE');
    });
  });

  describe('getPropertyStats', () => {
    it('should return property statistics', async () => {
      const mockStats = {
        rows: [{
          total_properties: 100,
          active: 50,
          inactive: 20,
          sold: 20,
          rented: 10
        }]
      };

      const mockSeriousViewings = {
        rows: [{
          properties_with_serious_viewings: 15
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStats);
      mockQuery.mockResolvedValueOnce(mockSeriousViewings);

      const result = await Property.getPropertyStats();

      expect(result.total_properties).toBe(100);
      expect(result.active).toBe(50);
      expect(result.properties_with_serious_viewings).toBe(15);
      expect(result.serious_viewings_percentage).toBe(15.0);
    });
  });

  describe('canUserSeeOwnerDetails', () => {
    it('should return true for admin role', async () => {
      const result = await Property.canUserSeeOwnerDetails('admin', 1, 1);
      expect(result).toBe(true);
    });

    it('should return true for operations manager role', async () => {
      const result = await Property.canUserSeeOwnerDetails('operations manager', 1, 1);
      expect(result).toBe(true);
    });

    it('should return true for agent when property is assigned to them', async () => {
      const mockProperty = { rows: [{ agent_id: 1 }] };
      mockQuery.mockResolvedValueOnce(mockProperty);

      const result = await Property.canUserSeeOwnerDetails('agent', 1, 1);

      expect(result).toBe(true);
    });

    it('should return false for agent when property is not assigned to them', async () => {
      const mockProperty = { rows: [{ agent_id: 2 }] };
      mockQuery.mockResolvedValueOnce(mockProperty);

      const result = await Property.canUserSeeOwnerDetails('agent', 1, 1);

      expect(result).toBe(false);
    });

    it('should return true for team_leader when property is assigned to their agent', async () => {
      const mockProperty = { rows: [{ agent_id: 2, team_agent_id: 2 }] };
      mockQuery.mockResolvedValueOnce(mockProperty);

      const result = await Property.canUserSeeOwnerDetails('team_leader', 1, 1);

      expect(result).toBe(true);
    });
  });

  describe('updatePropertyImages', () => {
    it('should update property images', async () => {
      const mockUpdated = {
        rows: [{
          id: 1,
          main_image: 'image1.jpg',
          image_gallery: ['image2.jpg', 'image3.jpg']
        }]
      };

      mockQuery.mockResolvedValueOnce(mockUpdated);

      const result = await Property.updatePropertyImages(1, 'image1.jpg', ['image2.jpg']);

      expect(result.main_image).toBe('image1.jpg');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE properties'),
        expect.arrayContaining(['image1.jpg', ['image2.jpg'], 1])
      );
    });
  });

  describe('getImageStats', () => {
    it('should return image statistics', async () => {
      const mockStats = {
        rows: [{
          total_properties: 100,
          with_main_image: 80,
          with_gallery: 60,
          with_both: 50,
          without_images: 20,
          avg_gallery_size: 5
        }]
      };

      mockQuery.mockResolvedValueOnce(mockStats);

      const result = await Property.getImageStats();

      expect(result.total_properties).toBe(100);
      expect(result.with_main_image).toBe(80);
    });
  });
});

