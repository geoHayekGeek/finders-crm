// xssProtection.js - Dedicated XSS protection middleware

const xssProtection = (req, res, next) => {
  console.log('XSS Protection middleware executing...');
  
  if (!req.body) {
    return next();
  }
  
  const maliciousPatterns = [
    { pattern: /<script/i, field: 'script tag', description: 'Script tag detected' },
    { pattern: /javascript:/i, field: 'javascript protocol', description: 'JavaScript protocol detected' },
    { pattern: /on\w+=/i, field: 'event handler', description: 'Event handler detected' },
    { pattern: /<iframe/i, field: 'iframe tag', description: 'Iframe tag detected' },
    { pattern: /<object/i, field: 'object tag', description: 'Object tag detected' },
    { pattern: /<embed/i, field: 'embed tag', description: 'Embed tag detected' },
    { pattern: /<form/i, field: 'form tag', description: 'Form tag detected' },
    { pattern: /<input/i, field: 'input tag', description: 'Input tag detected' },
    { pattern: /<textarea/i, field: 'textarea tag', description: 'Textarea tag detected' },
    { pattern: /<select/i, field: 'select tag', description: 'Select tag detected' }
  ];
  
  const maliciousFields = [];
  
  // Check each field in the request body
  Object.keys(req.body).forEach(field => {
    if (typeof req.body[field] === 'string') {
      const value = req.body[field];
      
      maliciousPatterns.forEach(({ pattern, field: patternName, description }) => {
        if (pattern.test(value)) {
          maliciousFields.push({
            field,
            pattern: patternName,
            description,
            value: value.substring(0, 100) // Limit value length in error
          });
        }
      });
    }
  });
  
  // If malicious content is found, block the request
  if (maliciousFields.length > 0) {
    console.log('🚨 XSS attempt detected and blocked!');
    console.log('Malicious fields:', maliciousFields);
    
    return res.status(400).json({
      success: false,
      message: 'XSS attempt detected and blocked',
      errors: maliciousFields.map(item => ({
        field: item.field,
        message: `XSS attempt detected: ${item.description}`,
        type: 'XSS_ATTEMPT'
      }))
    });
  }
  
  console.log('✅ XSS protection passed');
  next();
};

module.exports = { xssProtection };



