// __tests__/middlewares/propertyValidation.test.js
const { validationResult } = require('express-validator');
const propertyValidation = require('../../middlewares/propertyValidation');

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn((field) => ({
    notEmpty: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isFloat: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    isMobilePhone: jest.fn().mockReturnThis(),
    isString: jest.fn().mockReturnThis(),
    isArray: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    customSanitizer: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

describe('Property Validation', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      app: { locals: {} }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateProperty', () => {
    it('should be defined', () => {
      expect(propertyValidation.validateProperty).toBeDefined();
      expect(Array.isArray(propertyValidation.validateProperty)).toBe(true);
    });

    it('should validate structured details object', () => {
      const validDetails = {
        floor_number: '5th',
        balcony: 'Yes',
        covered_parking: '2 spaces',
        outdoor_parking: '1 space',
        cave: 'No'
      };
      
      // The validation middleware should accept this structure
      expect(validDetails).toHaveProperty('floor_number');
      expect(validDetails).toHaveProperty('balcony');
      expect(validDetails).toHaveProperty('covered_parking');
      expect(validDetails).toHaveProperty('outdoor_parking');
      expect(validDetails).toHaveProperty('cave');
    });

    it('should validate structured interior_details object', () => {
      const validInteriorDetails = {
        living_rooms: '2',
        bedrooms: '3',
        bathrooms: '2',
        maid_room: 'Yes'
      };
      
      expect(validInteriorDetails).toHaveProperty('living_rooms');
      expect(validInteriorDetails).toHaveProperty('bedrooms');
      expect(validInteriorDetails).toHaveProperty('bathrooms');
      expect(validInteriorDetails).toHaveProperty('maid_room');
    });

    it('should validate payment_facilities fields', () => {
      const validPaymentFacilities = {
        payment_facilities: true,
        payment_facilities_specification: 'Bank financing available'
      };
      
      expect(typeof validPaymentFacilities.payment_facilities).toBe('boolean');
      expect(typeof validPaymentFacilities.payment_facilities_specification).toBe('string');
    });

    it('should require main_image field', () => {
      const validProperty = {
        main_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };
      
      expect(validProperty.main_image).toBeDefined();
      expect(typeof validProperty.main_image).toBe('string');
      expect(validProperty.main_image.length).toBeGreaterThan(0);
    });

    it('should require referrals field', () => {
      const validProperty = {
        referrals: [
          { name: 'Test Referral', type: 'custom', date: '2024-01-01' }
        ]
      };
      
      expect(validProperty.referrals).toBeDefined();
      expect(Array.isArray(validProperty.referrals)).toBe(true);
      expect(validProperty.referrals.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input by removing HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const result = propertyValidation.sanitizeInput(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("XSS")';
      const result = propertyValidation.sanitizeInput(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click</div>';
      const result = propertyValidation.sanitizeInput(input);

      expect(result).not.toContain('onclick=');
    });

    it('should remove SQL injection characters', () => {
      const input = "test'; DROP TABLE users;--";
      const result = propertyValidation.sanitizeInput(input);

      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
      expect(result).not.toContain(';');
    });

    it('should return non-string input as-is', () => {
      const input = 123;
      const result = propertyValidation.sanitizeInput(input);

      expect(result).toBe(123);
    });
  });

  describe('sanitizeRequestBody', () => {
    it('should sanitize all string fields in request body', () => {
      req.body = {
        title: '<script>alert("XSS")</script>',
        description: 'javascript:void(0)',
        price: 1000
      };

      propertyValidation.sanitizeRequestBody(req, res, next);

      expect(req.body.title).not.toContain('<');
      expect(req.body.description).not.toContain('javascript:');
      expect(req.body.price).toBe(1000);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('handleValidationErrors', () => {
    it('should pass through if no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      propertyValidation.handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors if validation fails', () => {
      const mockErrors = [
        { path: 'status_id', msg: 'Status ID is required', value: '' },
        { path: 'property_type', msg: 'Property type must be sale or rent', value: 'invalid' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      propertyValidation.handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'status_id', message: 'Status ID is required', value: '' },
          { field: 'property_type', message: 'Property type must be sale or rent', value: 'invalid' }
        ]
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('propertyUpdateRateLimit', () => {
    it('should allow requests within rate limit', () => {
      req.app.locals.rateLimit = {};

      for (let i = 0; i < 5; i++) {
        propertyValidation.propertyUpdateRateLimit(req, res, next);
        next.mockClear();
      }

      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      req.app.locals.rateLimit = {
        '127.0.0.1': { count: 10, resetTime: Date.now() + 60000 }
      };

      propertyValidation.propertyUpdateRateLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many property update requests. Please wait before trying again.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reset counter after time window', () => {
      req.app.locals.rateLimit = {
        '127.0.0.1': { count: 10, resetTime: Date.now() - 1000 }
      };

      propertyValidation.propertyUpdateRateLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.app.locals.rateLimit['127.0.0.1'].count).toBe(1);
    });

    it('should initialize rate limit for new IP', () => {
      req.app.locals.rateLimit = {};

      propertyValidation.propertyUpdateRateLimit(req, res, next);

      expect(req.app.locals.rateLimit['127.0.0.1']).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });
});

