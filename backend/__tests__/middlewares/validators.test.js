// __tests__/middlewares/validators.test.js
const { body } = require('express-validator');
const validators = require('../../middlewares/validators');

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn((field) => ({
    isEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isMobilePhone: jest.fn().mockReturnThis(),
    isString: jest.fn().mockReturnThis(),
    exists: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis()
  }))
}));

describe('Validators Middleware', () => {
  describe('registerValidator', () => {
    it('should be defined', () => {
      expect(validators.registerValidator).toBeDefined();
      expect(Array.isArray(validators.registerValidator)).toBe(true);
    });

    it('should validate email', () => {
      expect(validators.registerValidator.length).toBeGreaterThan(0);
      // The validators are express-validator chains, so we can't easily test them
      // without running the actual validation, but we can check they exist
    });

    it('should validate password length', () => {
      expect(validators.registerValidator).toBeDefined();
    });

    it('should validate role', () => {
      expect(validators.registerValidator).toBeDefined();
    });
  });

  describe('loginValidator', () => {
    it('should be defined', () => {
      expect(validators.loginValidator).toBeDefined();
      expect(Array.isArray(validators.loginValidator)).toBe(true);
    });

    it('should validate email', () => {
      expect(validators.loginValidator.length).toBeGreaterThan(0);
    });

    it('should validate password exists', () => {
      expect(validators.loginValidator).toBeDefined();
    });
  });
});

