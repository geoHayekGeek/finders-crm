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
  console.log('🔐 Authorization header:', req.headers['authorization']);
  console.log('🔐 X-CSRF-Token header:', req.headers['x-csrf-token']);
  
  // Generate a consistent session ID using user ID from JWT token
  let sessionId = 'anonymous';
  
  // Try to get user ID from JWT token first
  if (req.user && req.user.id) {
    sessionId = `user_${req.user.id}`;
    console.log('🔐 Using user-based session ID:', sessionId);
  } else {
    // Fallback to IP-based session ID
    sessionId = req.ip || 
               req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               'anonymous';
    console.log('🔐 Using IP-based session ID:', sessionId);
  }
  
  // Ensure session ID is consistent across all endpoints for the same user
  // This prevents different endpoints from generating different session IDs
  if (req.user && req.user.id) {
    sessionId = `user_${req.user.id}`;
  }
  
  console.log('🔐 req.user:', req.user);
  console.log('🔐 req.user.id:', req.user?.id);
  console.log('🔐 req.user.role:', req.user?.role);
  
  console.log('🔐 Session ID calculated:', sessionId);
  
  // For GET requests, generate and store CSRF token for forms
  if (req.method === 'GET') {
    console.log('🔐 Generating CSRF token for GET request');
    console.log('🔐 Request URL:', req.url);
    console.log('🔐 Session ID:', sessionId);
    console.log('🔐 User ID:', req.user?.id);
    
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
  console.log('🔐 All available tokens:', Array.from(csrfTokens.keys()));
  
  if (!token) {
    console.log('🔐 ❌ CSRF token missing');
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Please refresh the page and try again.'
    });
  }

  const storedTokenData = csrfTokens.get(sessionId);
  console.log('🔐 Stored token data:', storedTokenData ? 'Found' : 'Not found');
  console.log('🔐 Expected token (first 8 chars):', token ? token.substring(0, 8) + '...' : 'None');
  console.log('🔐 Stored token (first 8 chars):', storedTokenData?.token ? storedTokenData.token.substring(0, 8) + '...' : 'None');
  
  if (!storedTokenData) {
    console.log('🔐 ❌ No stored token data for session:', sessionId);
    console.log('🔐 Available sessions:', Array.from(csrfTokens.keys()));
    listAllTokens();
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token - no token data found for session'
    });
  }
  
  if (storedTokenData.token !== token) {
    console.log('🔐 ❌ Token mismatch');
    console.log('🔐 Expected:', token ? token.substring(0, 8) + '...' : 'None');
    console.log('🔐 Stored:', storedTokenData.token ? storedTokenData.token.substring(0, 8) + '...' : 'None');
    listAllTokens();
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token - token mismatch'
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
  // Token is valid, don't mark as used to allow multiple requests with the same token
  // The token will be cleaned up by the cleanup function when it expires
  // storedTokenData.used = true; // Commented out to allow multiple requests
  
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

// Debug function to list all stored tokens
const listAllTokens = () => {
  console.log('🔐 All stored CSRF tokens:');
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    console.log(`  Session: ${sessionId}, Token: ${tokenData.token.substring(0, 8)}..., Expires: ${new Date(tokenData.expires).toISOString()}`);
  }
};

module.exports = {
  csrfProtection,
  generateCSRFToken,
  getCSRFToken,
  listAllTokens
};
