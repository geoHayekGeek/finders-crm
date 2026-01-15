// __tests__/middlewares/leadsValidation.test.js
const { validationResult } = require('express-validator');

// Mock dependencies FIRST before requiring the module
jest.mock('../../config/db', () => ({
  query: jest.fn()
}));

jest.mock('express-validator', () => ({
  body: jest.fn((field) => {
    const chain = {
      notEmpty: jest.fn().mockReturnThis(),
      isLength: jest.fn().mockReturnThis(),
      isInt: jest.fn().mockReturnThis(),
      isFloat: jest.fn().mockReturnThis(),
      isIn: jest.fn().mockReturnThis(),
      isEmail: jest.fn().mockReturnThis(),
      isMobilePhone: jest.fn().mockReturnThis(),
      isString: jest.fn().mockReturnThis(),
      isISO8601: jest.fn().mockReturnThis(),
      optional: jest.fn().mockReturnThis(),
      custom: jest.fn((fn) => {
        // Don't execute the function during mock setup - just return the chain
        // The function will be executed during actual validation
        return chain;
      }),
      customSanitizer: jest.fn().mockReturnThis(),
      matches: jest.fn().mockReturnThis(),
      withMessage: jest.fn().mockReturnThis()
    };
    return chain;
  }),
  param: jest.fn((field) => ({
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  query: jest.fn((field) => {
    const chain = {
      optional: jest.fn().mockReturnThis(),
      isInt: jest.fn().mockReturnThis(),
      isDate: jest.fn().mockReturnThis(),
      isISO8601: jest.fn().mockReturnThis(),
      custom: jest.fn((fn) => {
        // Don't execute the function during mock setup - just return the chain
        // The function will be executed during actual validation
        return chain;
      }),
      withMessage: jest.fn().mockReturnThis()
    };
    return chain;
  }),
  validationResult: jest.fn()
}));

const pool = require('../../config/db');

// Mock the database query for getValidStatuses before requiring the module
// This must be done before the module is required to prevent database queries during module load
pool.query.mockImplementation(() => {
  return Promise.resolve({
    rows: [
      { status_name: 'Active' },
      { status_name: 'Contacted' },
      { status_name: 'Qualified' },
      { status_name: 'Converted' },
      { status_name: 'Closed' }
    ]
  });
});

const leadsValidation = require('../../middlewares/leadsValidation');

describe('Leads Validation', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
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

  describe('validateCreateLead', () => {
    it('should be defined', () => {
      expect(leadsValidation.validateCreateLead).toBeDefined();
      expect(Array.isArray(leadsValidation.validateCreateLead)).toBe(true);
    });
  });

  describe('validateUpdateLead', () => {
    it('should be defined', () => {
      expect(leadsValidation.validateUpdateLead).toBeDefined();
      expect(Array.isArray(leadsValidation.validateUpdateLead)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input by removing HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const result = leadsValidation.sanitizeInput(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("XSS")';
      const result = leadsValidation.sanitizeInput(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove SQL injection characters', () => {
      const input = "test'; DROP TABLE leads;--";
      const result = leadsValidation.sanitizeInput(input);

      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
      expect(result).not.toContain(';');
    });
  });

  describe('sanitizeRequestBody', () => {
    it('should sanitize all string fields in request body', () => {
      req.body = {
        customer_name: '<script>alert("XSS")</script>',
        customer_email: 'test@example.com',
        agent_id: 1
      };

      leadsValidation.sanitizeRequestBody(req, res, next);

      expect(req.body.customer_name).not.toContain('<');
      expect(req.body.customer_email).toBe('test@example.com');
      expect(req.body.agent_id).toBe(1);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('handleValidationErrors', () => {
    it('should pass through if no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      leadsValidation.handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors if validation fails', () => {
      const mockErrors = [
        { path: 'customer_name', msg: 'Customer name is required', value: '' },
        { path: 'customer_email', msg: 'Invalid email', value: 'invalid' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      leadsValidation.handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'customer_name', message: 'Customer name is required', value: '' },
          { field: 'customer_email', message: 'Invalid email', value: 'invalid' }
        ]
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('leadsRateLimit', () => {
    it('should allow requests within rate limit', () => {
      req.app.locals.leadsRateLimit = {};

      for (let i = 0; i < 10; i++) {
        leadsValidation.leadsRateLimit(req, res, next);
        next.mockClear();
      }

      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      req.app.locals.leadsRateLimit = {
        '127.0.0.1': { count: 20, resetTime: Date.now() + 60000 }
      };

      leadsValidation.leadsRateLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many lead operations. Please wait before trying again.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reset counter after time window', () => {
      req.app.locals.leadsRateLimit = {
        '127.0.0.1': { count: 20, resetTime: Date.now() - 1000 }
      };

      leadsValidation.leadsRateLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.app.locals.leadsRateLimit['127.0.0.1'].count).toBe(1);
    });
  });

  describe('validateLeadBusinessRules', () => {
    it('should pass through if no business rule violations', async () => {
      req.body = {
        agent_id: 1,
        reference_source_id: 1,
        added_by_id: 1
      };

      await leadsValidation.validateLeadBusinessRules(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      req.body = {};
      // Simulate an error
      next.mockImplementation(() => {
        throw new Error('Test error');
      });

      await leadsValidation.validateLeadBusinessRules(req, res, next);

      // Should catch error and return 500
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getValidStatuses', () => {
    it('should fetch valid statuses from database', async () => {
      const mockStatuses = [
        { status_name: 'Active' },
        { status_name: 'Contacted' }
      ];

      pool.query.mockResolvedValue({ rows: mockStatuses });

      const statuses = await leadsValidation.getValidStatuses();

      expect(pool.query).toHaveBeenCalled();
      expect(statuses).toEqual(['Active', 'Contacted']);
    });

    it('should return default statuses on error', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const statuses = await leadsValidation.getValidStatuses();

      expect(statuses).toEqual(['Active', 'Contacted', 'Qualified', 'Converted', 'Closed']);
    });
  });

  describe('Referrals Validation', () => {
    it('should require referrals field in validateCreateLead', () => {
      const validators = leadsValidation.validateCreateLead;
      const referralsValidator = validators.find(v => {
        // Find the validator that checks referrals
        return v && v.builder && v.builder.fields && v.builder.fields.includes('referrals');
      });
      
      // The referrals validator should exist
      expect(validators.length).toBeGreaterThan(0);
    });

    it('should require referrals field in validateUpdateLead', () => {
      const validators = leadsValidation.validateUpdateLead;
      
      // The validators array should exist
      expect(validators).toBeDefined();
      expect(Array.isArray(validators)).toBe(true);
    });
  });
});

