// __tests__/middlewares/propertyValidationSimple.test.js
const { validationResult } = require('express-validator');
const propertyValidationSimple = require('../../middlewares/propertyValidationSimple');

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn((field) => ({
    notEmpty: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isFloat: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

describe('Property Validation Simple', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validatePropertyUpdateSimple', () => {
    it('should be defined', () => {
      expect(propertyValidationSimple.validatePropertyUpdateSimple).toBeDefined();
      expect(Array.isArray(propertyValidationSimple.validatePropertyUpdateSimple)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input by removing HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const result = propertyValidationSimple.sanitizeInput(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("XSS")';
      const result = propertyValidationSimple.sanitizeInput(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click</div>';
      const result = propertyValidationSimple.sanitizeInput(input);

      expect(result).not.toContain('onclick=');
    });

    it('should remove SQL injection characters', () => {
      const input = "test'; DROP TABLE users;--";
      const result = propertyValidationSimple.sanitizeInput(input);

      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
      expect(result).not.toContain(';');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = propertyValidationSimple.sanitizeInput(input);

      expect(result).toBe('test');
    });

    it('should return non-string input as-is', () => {
      const input = 123;
      const result = propertyValidationSimple.sanitizeInput(input);

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

      propertyValidationSimple.sanitizeRequestBody(req, res, next);

      expect(req.body.title).not.toContain('<');
      expect(req.body.description).not.toContain('javascript:');
      expect(req.body.price).toBe(1000); // Non-string unchanged
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      req.body = {};

      propertyValidationSimple.sanitizeRequestBody(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle body with no string fields', () => {
      req.body = {
        price: 1000,
        surface: 50.5,
        status_id: 1
      };

      propertyValidationSimple.sanitizeRequestBody(req, res, next);

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

      propertyValidationSimple.handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors if validation fails', () => {
      const mockErrors = [
        { path: 'title', msg: 'Title is required', value: '' },
        { path: 'price', msg: 'Price must be a number', value: 'invalid' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      propertyValidationSimple.handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'title', message: 'Title is required', value: '' },
          { field: 'price', message: 'Price must be a number', value: 'invalid' }
        ]
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});













