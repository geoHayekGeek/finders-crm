// backend/__tests__/models/userModel.test.js
// Unit tests for User Model - specifically for complex business logic methods

const User = require('../../models/userModel');

// Mock dependencies
jest.mock('../../config/db');

describe('User Model - generateUniqueUserCode', () => {
  let pool;

  beforeEach(() => {
    pool = require('../../config/db');
    jest.clearAllMocks();
  });

  describe('generateUniqueUserCode', () => {
    it('should generate code from first and last name initials', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }); // No existing user with code

      const code = await User.generateUniqueUserCode('John Doe');

      expect(code).toBe('JD');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_code'),
        ['JD']
      );
    });

    it('should generate code from single name (first 2 letters)', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }); // No existing user with code

      const code = await User.generateUniqueUserCode('John');

      expect(code).toBe('JO');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_code'),
        ['JO']
      );
    });

    it('should handle names with multiple spaces', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }); // No existing user with code

      const code = await User.generateUniqueUserCode('John  Middle  Doe');

      expect(code).toBe('JD');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_code'),
        ['JD']
      );
    });

    it('should handle names with leading/trailing spaces', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }); // No existing user with code

      const code = await User.generateUniqueUserCode('  John Doe  ');

      expect(code).toBe('JD');
    });

    it('should append number when initials already exist', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // JD exists
        .mockResolvedValueOnce({ rows: [] }); // JD1 doesn't exist

      const code = await User.generateUniqueUserCode('John Doe');

      expect(code).toBe('JD1');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should increment number until finding unique code', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // JD exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // JD1 exists
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // JD2 exists
        .mockResolvedValueOnce({ rows: [] }); // JD3 doesn't exist

      const code = await User.generateUniqueUserCode('John Doe');

      expect(code).toBe('JD3');
      expect(pool.query).toHaveBeenCalledTimes(4);
    });

    it('should use timestamp fallback after max attempts', async () => {
      const maxAttempts = 100;
      const mockResults = Array(maxAttempts).fill({ rows: [{ id: 1 }] }); // All codes exist
      pool.query = jest.fn().mockImplementation(() => Promise.resolve({ rows: [{ id: 1 }] }));

      const code = await User.generateUniqueUserCode('John Doe');

      // Should use timestamp fallback (JD + last 4 digits of timestamp)
      expect(code).toMatch(/^JD\d{4}$/);
      expect(pool.query).toHaveBeenCalledTimes(maxAttempts);
    });

    it('should handle uppercase and lowercase names correctly', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code1 = await User.generateUniqueUserCode('john doe');
      expect(code1).toBe('JD');

      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code2 = await User.generateUniqueUserCode('JOHN DOE');
      expect(code2).toBe('JD');

      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code3 = await User.generateUniqueUserCode('John DOE');
      expect(code3).toBe('JD');
    });

    it('should handle single character names', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code = await User.generateUniqueUserCode('J');

      expect(code).toBe('J');
    });

    it('should handle very short single names', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code = await User.generateUniqueUserCode('Jo');

      expect(code).toBe('JO');
    });

    it('should handle names with special characters', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code = await User.generateUniqueUserCode("John O'Brien");

      expect(code).toBe('JO');
    });

    it('should handle three or more name parts correctly', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code = await User.generateUniqueUserCode('John Michael Doe');

      // Should use first letter of first name and first letter of last name
      expect(code).toBe('JD');
    });

    it('should handle empty string gracefully', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const code = await User.generateUniqueUserCode('');

      // Empty string should result in empty initials, which becomes empty code
      expect(code).toBe('');
    });
  });
});

