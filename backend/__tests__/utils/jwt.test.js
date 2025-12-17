// __tests__/utils/jwt.test.js
const jwtUtils = require('../../utils/jwt');
const jwt = require('jsonwebtoken');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('JWT Utils', () => {
  const mockUser = {
    id: 1,
    role: 'admin'
  };

  const mockToken = 'mock-jwt-token';
  const mockSecret = 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = mockSecret;
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate JWT token successfully', () => {
      jwt.sign.mockReturnValue(mockToken);

      const result = jwtUtils.generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          role: mockUser.role
        },
        mockSecret,
        { expiresIn: '7d' }
      );
      expect(result).toBe(mockToken);
    });

    it('should include user id and role in token payload', () => {
      jwt.sign.mockReturnValue(mockToken);

      jwtUtils.generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          role: 'admin'
        }),
        mockSecret,
        { expiresIn: '7d' }
      );
    });

    it('should use correct expiration time', () => {
      jwt.sign.mockReturnValue(mockToken);

      jwtUtils.generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        mockSecret,
        { expiresIn: '7d' }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify JWT token successfully', () => {
      const mockDecoded = { id: 1, role: 'admin' };
      jwt.verify.mockReturnValue(mockDecoded);

      const result = jwtUtils.verifyToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecret);
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error for invalid token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => jwtUtils.verifyToken('invalid-token')).toThrow('Invalid token');
      expect(jwt.verify).toHaveBeenCalledWith('invalid-token', mockSecret);
    });

    it('should throw error for expired token', () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => jwtUtils.verifyToken('expired-token')).toThrow('Token expired');
    });

    it('should use correct secret for verification', () => {
      const mockDecoded = { id: 1, role: 'admin' };
      jwt.verify.mockReturnValue(mockDecoded);

      jwtUtils.verifyToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecret);
    });
  });
});

















