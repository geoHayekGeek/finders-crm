const PasswordReset = require('../../models/passwordResetModel');
const db = require('../../config/db');

jest.mock('../../config/db');

describe('PasswordReset Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    db.query = mockQuery;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createToken', () => {
    it('should create a password reset token', async () => {
      const email = 'test@example.com';
      const token = 'test-token';
      const expiresAt = new Date('2024-12-31');

      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await PasswordReset.createToken(email, token, expiresAt);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO password_resets'),
        [email, token, expiresAt]
      );
      expect(result).toBe(true);
    });

    it('should update existing token if email already exists', async () => {
      const email = 'test@example.com';
      const token = 'new-token';
      const expiresAt = new Date('2024-12-31');

      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await PasswordReset.createToken(email, token, expiresAt);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (email)'),
        [email, token, expiresAt]
      );
      expect(result).toBe(true);
    });
  });

  describe('findValidToken', () => {
    it('should find a valid token', async () => {
      const email = 'test@example.com';
      const token = 'test-token';
      const mockToken = {
        id: 1,
        email,
        token,
        expires_at: new Date('2024-12-31')
      };

      mockQuery.mockResolvedValue({ rows: [mockToken] });

      const result = await PasswordReset.findValidToken(email, token);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1 AND token = $2 AND expires_at > NOW()'),
        [email, token]
      );
      expect(result).toEqual(mockToken);
    });

    it('should return undefined if token not found', async () => {
      const email = 'test@example.com';
      const token = 'invalid-token';

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await PasswordReset.findValidToken(email, token);

      expect(result).toBeUndefined();
    });

    it('should return undefined if token is expired', async () => {
      const email = 'test@example.com';
      const token = 'expired-token';

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await PasswordReset.findValidToken(email, token);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteToken', () => {
    it('should delete a password reset token', async () => {
      const email = 'test@example.com';

      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await PasswordReset.deleteToken(email);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM password_resets'),
        [email]
      );
      expect(result).toBe(true);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      mockQuery.mockResolvedValue({ rowCount: 5 });

      const result = await PasswordReset.cleanupExpiredTokens();

      // The model calls db.query with just the query string (no params)
      expect(mockQuery).toHaveBeenCalled();
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('DELETE FROM password_resets');
      expect(result).toBe(true);
    });
  });
});

