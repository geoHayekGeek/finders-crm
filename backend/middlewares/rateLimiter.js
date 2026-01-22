const rateLimit = require('express-rate-limit');

// Create a function that can generate rate limiters with custom parameters
const createRateLimiter = (maxRequests, windowMs) => {
  return rateLimit({
    windowMs: windowMs,
    max: maxRequests,
    message: 'Too many attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Default auth limiter
const authLimiter = createRateLimiter(10, 15 * 60 * 1000); // 10 requests per 15 minutes

// Export both the function and the default limiter
// Maintain backward compatibility: default export is the function
const rateLimiter = createRateLimiter;
rateLimiter.createRateLimiter = createRateLimiter;
rateLimiter.authLimiter = authLimiter;

module.exports = rateLimiter;
