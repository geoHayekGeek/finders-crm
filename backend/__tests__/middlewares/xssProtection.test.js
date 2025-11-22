// __tests__/middlewares/xssProtection.test.js
const { xssProtection } = require('../../middlewares/xssProtection');

describe('XSS Protection Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should allow safe content to pass', () => {
    req.body = {
      name: 'John Doe',
      description: 'This is a safe description'
    };

    xssProtection(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block script tags', () => {
    req.body = {
      name: '<script>alert("XSS")</script>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'XSS attempt detected and blocked',
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('Script tag detected'),
          type: 'XSS_ATTEMPT'
        })
      ])
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should block javascript protocol', () => {
    req.body = {
      url: 'javascript:alert("XSS")'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'XSS attempt detected and blocked'
      })
    );
  });

  it('should block event handlers', () => {
    req.body = {
      description: '<div onclick="alert(\'XSS\')">Click me</div>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should block iframe tags', () => {
    req.body = {
      content: '<iframe src="evil.com"></iframe>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should block object tags', () => {
    req.body = {
      content: '<object data="evil.swf"></object>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should block embed tags', () => {
    req.body = {
      content: '<embed src="evil.swf">'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should block form tags', () => {
    req.body = {
      content: '<form action="evil.com"><input type="submit"></form>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should block input tags', () => {
    req.body = {
      content: '<input type="text" value="XSS">'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should block textarea tags', () => {
    req.body = {
      content: '<textarea>XSS</textarea>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should block select tags', () => {
    req.body = {
      content: '<select><option>XSS</option></select>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle multiple malicious patterns', () => {
    req.body = {
      field1: '<script>alert("XSS")</script>',
      field2: 'javascript:void(0)',
      field3: '<div onclick="alert(\'XSS\')">Click</div>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors.length).toBeGreaterThan(1);
  });

  it('should allow request without body', () => {
    req.body = undefined;

    xssProtection(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should handle case-insensitive detection', () => {
    req.body = {
      content: '<SCRIPT>alert("XSS")</SCRIPT>'
    };

    xssProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

    it('should limit error value length to 100 characters', () => {
      const longMaliciousString = '<script>' + 'x'.repeat(200) + '</script>';
      req.body = {
        content: longMaliciousString
      };

      xssProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      // The error value should be truncated
      const errors = res.json.mock.calls[0][0].errors;
      if (errors && errors.length > 0 && errors[0].value) {
        expect(errors[0].value.length).toBeLessThanOrEqual(100);
      }
    });

  it('should allow safe HTML-like text', () => {
    req.body = {
      description: 'This contains the word script but is safe',
      note: 'I need to embed this content'
    };

    xssProtection(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

