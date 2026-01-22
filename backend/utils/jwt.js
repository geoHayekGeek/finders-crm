const jwt = require('jsonwebtoken');
const logger = require('./logger');

// Validate JWT_SECRET exists
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET environment variable is not set');
    throw new Error('JWT_SECRET is not configured. Please set JWT_SECRET environment variable.');
  }
  if (secret.length < 32) {
    logger.warn('JWT_SECRET is too short (less than 32 characters). This is a security risk.');
  }
  return secret;
};

// Validate token format before verification
const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

const generateToken = (user) => {
  if (!user || !user.id || !user.role) {
    logger.error('Invalid user object for token generation', { hasId: !!user?.id, hasRole: !!user?.role });
    throw new Error('Invalid user object: id and role are required');
  }

  try {
    const secret = getJWTSecret();
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    );
  } catch (error) {
    logger.error('Error generating JWT token', error);
    throw error;
  }
};

const verifyToken = (token) => {
  if (!isValidTokenFormat(token)) {
    logger.error('Invalid token format', { tokenLength: token?.length });
    throw new Error('Invalid token format');
  }

  try {
    const secret = getJWTSecret();
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.error('Invalid JWT token', { error: error.message });
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      logger.error('JWT token expired', { expiredAt: error.expiredAt });
      throw new Error('Token expired');
    } else {
      logger.error('Error verifying JWT token', error);
      throw error;
    }
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
