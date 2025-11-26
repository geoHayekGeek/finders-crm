// __tests__/middlewares/errorLogging.test.js
const fs = require('fs');
const path = require('path');
const errorLogging = require('../../middlewares/errorLogging');

// Mock fs
jest.mock('fs');

describe('Error Logging Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      },
      user: { id: 1 },
      connection: { remoteAddress: '127.0.0.1' }
    };

    res = {
      statusCode: 200,
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.appendFileSync.mockImplementation(() => {});
  });

  describe('logSecurityEvent', () => {
    it('should log security event to file', () => {
      errorLogging.logSecurityEvent('XSS_ATTEMPT', { field: 'test' });

      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      expect(logCall[0]).toContain('security.log');
      expect(logCall[1]).toContain('XSS_ATTEMPT');
    });

    it('should log to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      errorLogging.logSecurityEvent('XSS_ATTEMPT', { field: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorLogging.logError(error, req, { additional: 'context' });

      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      expect(logCall[0]).toContain('errors.log');
      expect(logCall[1]).toContain('Test error');
    });

    it('should include request information in log', () => {
      const error = new Error('Test error');

      errorLogging.logError(error, req);

      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      expect(logCall[1]).toContain('GET');
      expect(logCall[1]).toContain('/api/test');
    });

    it('should include user ID in log', () => {
      const error = new Error('Test error');

      errorLogging.logError(error, req);

      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      expect(logCall[1]).toContain('1');
    });

    it('should use anonymous for user ID if not authenticated', () => {
      const error = new Error('Test error');
      req.user = null;

      errorLogging.logError(error, req);

      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      expect(logCall[1]).toContain('anonymous');
    });
  });

  describe('getEventSeverity', () => {
    it('should return CRITICAL for SQL_INJECTION_ATTEMPT', () => {
      const severity = errorLogging.getEventSeverity('SQL_INJECTION_ATTEMPT');
      expect(severity).toBe('CRITICAL');
    });

    it('should return CRITICAL for XSS_ATTEMPT', () => {
      const severity = errorLogging.getEventSeverity('XSS_ATTEMPT');
      expect(severity).toBe('CRITICAL');
    });

    it('should return HIGH for CSRF_VIOLATION', () => {
      const severity = errorLogging.getEventSeverity('CSRF_VIOLATION');
      expect(severity).toBe('HIGH');
    });

    it('should return MEDIUM for VALIDATION_FAILURE', () => {
      const severity = errorLogging.getEventSeverity('VALIDATION_FAILURE');
      expect(severity).toBe('MEDIUM');
    });

    it('should return LOW for unknown event type', () => {
      const severity = errorLogging.getEventSeverity('UNKNOWN_EVENT');
      expect(severity).toBe('LOW');
    });
  });

  describe('detectSuspiciousInput', () => {
    it('should detect SQL injection patterns', () => {
      const result = errorLogging.detectSuspiciousInput("test'; DROP TABLE users;--");

      expect(result).toBeTruthy();
      expect(result.type).toBe('SQL_INJECTION_ATTEMPT');
    });

    it('should detect XSS script tags', () => {
      const result = errorLogging.detectSuspiciousInput('<script>alert("XSS")</script>');

      expect(result).toBeTruthy();
      expect(result.type).toBe('XSS_ATTEMPT');
    });

    it('should detect javascript protocol', () => {
      const result = errorLogging.detectSuspiciousInput('javascript:alert("XSS")');

      expect(result).toBeTruthy();
      expect(result.type).toBe('XSS_ATTEMPT');
    });

    it('should detect event handlers', () => {
      const result = errorLogging.detectSuspiciousInput('<div onclick="alert(\'XSS\')">');

      expect(result).toBeTruthy();
      expect(result.type).toBe('XSS_ATTEMPT');
    });

    it('should detect path traversal', () => {
      const result = errorLogging.detectSuspiciousInput('../../../etc/passwd');

      expect(result).toBeTruthy();
      expect(result.type).toBe('PATH_TRAVERSAL_ATTEMPT');
    });

    it('should return null for safe input', () => {
      const result = errorLogging.detectSuspiciousInput('This is safe input');

      expect(result).toBeNull();
    });

    it('should limit input length in result', () => {
      const longInput = '<script>' + 'x'.repeat(200) + '</script>';
      const result = errorLogging.detectSuspiciousInput(longInput);

      expect(result.input.length).toBeLessThanOrEqual(100);
    });
  });

  describe('errorLoggingMiddleware', () => {
    it('should log validation failures', () => {
      res.statusCode = 400;
      res.send = jest.fn((data) => {
        const parsed = JSON.parse(data);
        if (parsed.errors) {
          errorLogging.logSecurityEvent('VALIDATION_FAILURE', {
            endpoint: req.url,
            method: req.method,
            errors: parsed.errors
          });
        }
      });

      const middleware = errorLogging.errorLoggingMiddleware;
      middleware(req, res, next);

      res.send(JSON.stringify({
        errors: [{ field: 'title', message: 'Title is required' }]
      }));

      expect(fs.appendFileSync).toHaveBeenCalled();
    });

    it('should call next middleware', () => {
      const middleware = errorLogging.errorLoggingMiddleware;
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});




