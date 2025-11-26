// __tests__/middlewares/securityHeaders.test.js
const securityHeaders = require('../../middlewares/securityHeaders');

describe('Security Headers Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/api/test',
      secure: false
    };

    res = {
      setHeader: jest.fn()
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should set Content-Security-Policy header', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining("default-src 'self'")
    );
  });

  it('should set X-Content-Type-Options header', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('should set X-Frame-Options header', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  });

  it('should set X-XSS-Protection header', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
  });

  it('should set Referrer-Policy header', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  it('should set Permissions-Policy header', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      expect.stringContaining('geolocation=()')
    );
  });

  it('should set Strict-Transport-Security for HTTPS requests', () => {
    req.secure = true;

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  it('should set Strict-Transport-Security for x-forwarded-proto HTTPS', () => {
    req.headers['x-forwarded-proto'] = 'https';

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  it('should not set Strict-Transport-Security for HTTP requests', () => {
    req.secure = false;
    delete req.headers['x-forwarded-proto'];

    securityHeaders(req, res, next);

    const hstsCall = res.setHeader.mock.calls.find(call => call[0] === 'Strict-Transport-Security');
    expect(hstsCall).toBeUndefined();
  });

  it('should set cache control headers for API paths', () => {
    req.path = '/api/test';

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
  });

  it('should not set cache control headers for non-API paths', () => {
    req.path = '/public/test';

    securityHeaders(req, res, next);

    const cacheControlCall = res.setHeader.mock.calls.find(call => call[0] === 'Cache-Control');
    expect(cacheControlCall).toBeUndefined();
  });

  it('should call next middleware', () => {
    securityHeaders(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should set all required security headers', () => {
    securityHeaders(req, res, next);

    const headerNames = res.setHeader.mock.calls.map(call => call[0]);
    
    expect(headerNames).toContain('Content-Security-Policy');
    expect(headerNames).toContain('X-Content-Type-Options');
    expect(headerNames).toContain('X-Frame-Options');
    expect(headerNames).toContain('X-XSS-Protection');
    expect(headerNames).toContain('Referrer-Policy');
    expect(headerNames).toContain('Permissions-Policy');
  });
});




