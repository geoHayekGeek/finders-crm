// csrfProtection.js - CSRF protection middleware

const crypto = require('crypto');

// Store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map();

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  console.log('🔐 CSRF middleware called for:', req.method, req.url);
  console.log('🔐 req.ip:', req.ip);
  console.log('🔐 req.session:', req.session);
  console.log('🔐 req.session?.id:', req.session?.id);
  console.log('🔐 req.headers:', req.headers);
  
  // Generate a more robust session ID
  const sessionId = req.session?.id || 
                   req.ip || 
                   req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   'anonymous';
  
  console.log('🔐 Session ID calculated:', sessionId);
  
  // For GET requests, generate and store CSRF token for forms
  if (req.method === 'GET') {
    console.log('🔐 Generating CSRF token for GET request');
    // Generate and store CSRF token for forms
    const token = generateCSRFToken();
    
    console.log('🔐 Generated token:', token.substring(0, 8) + '...');
    console.log('🔐 Session ID for storage:', sessionId);
    
    // Store token with expiration (1 hour)
    csrfTokens.set(sessionId, {
      token,
      expires: Date.now() + (60 * 60 * 1000)
    });
    
    console.log('🔐 Token stored. Total tokens in memory:', csrfTokens.size);
    console.log('🔐 All stored session IDs:', Array.from(csrfTokens.keys()));
    
    // Add token to response headers
    res.setHeader('X-CSRF-Token', token);
    console.log('🔐 Token added to X-CSRF-Token header');
    
    // Clean up expired tokens
    cleanupExpiredTokens();
    
    return next();
  }

  // For non-GET requests, verify CSRF token
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  console.log('🔐 Verifying CSRF token for non-GET request');
  console.log('🔐 Token from headers:', token ? token.substring(0, 8) + '...' : 'None');
  console.log('🔐 Session ID for verification:', sessionId);
  
  if (!token) {
    console.log('🔐 ❌ CSRF token missing');
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }

  const storedTokenData = csrfTokens.get(sessionId);
  console.log('🔐 Stored token data:', storedTokenData ? 'Found' : 'Not found');
  
  if (!storedTokenData || storedTokenData.token !== token) {
    console.log('🔐 ❌ Invalid CSRF token');
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  // Check if token has expired
  if (Date.now() > storedTokenData.expires) {
    console.log('🔐 ❌ CSRF token expired');
    csrfTokens.delete(sessionId);
    return res.status(403).json({
      success: false,
      message: 'CSRF token expired'
    });
  }

  console.log('🔐 ✅ CSRF token valid, proceeding');
  // Token is valid, remove it to prevent reuse
  csrfTokens.delete(sessionId);
  
  next();
};

// Clean up expired tokens
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    if (now > tokenData.expires) {
      csrfTokens.delete(sessionId);
    }
  }
};

// Get CSRF token for a session
const getCSRFToken = (sessionId) => {
  const tokenData = csrfTokens.get(sessionId);
  return tokenData ? tokenData.token : null;
};

module.exports = {
  csrfProtection,
  generateCSRFToken,
  getCSRFToken
};
