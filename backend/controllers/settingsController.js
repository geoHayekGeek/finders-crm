// controllers/settingsController.js
const Settings = require('../models/settingsModel');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { sanitizeInput, sanitizeObject } = require('../utils/sanitize');
const pool = require('../config/db');

// Configure multer for file uploads (logos, favicons)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'branding');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|ico|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg, ico, webp)'));
    }
  }
});

// Get all settings
const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.getAll();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Error getting settings', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
};

// Get settings by category
const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    // Sanitize category parameter
    const sanitizedCategory = sanitizeInput(category);
    const settings = await Settings.getByCategory(sanitizedCategory);
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Error getting settings by category', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
};

// Validate setting value based on key
const validateSettingValue = (key, value) => {
  if (value === undefined || value === null) {
    return { valid: false, error: 'Value is required' };
  }

  // Commission percentage validation (0-100)
  if (key.includes('commission') && key.includes('percentage')) {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return { valid: false, error: 'Commission percentage must be between 0 and 100' };
    }
  }

  // Email validation
  if (key === 'email_from_address' || key === 'smtp_user') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof value === 'string' && value.trim() && !emailRegex.test(value)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }

  // Port validation
  if (key === 'smtp_port') {
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
  }

  // Color validation (hex format)
  if (key === 'primary_color') {
    if (typeof value === 'string' && !/^#[0-9A-F]{6}$/i.test(value)) {
      return { valid: false, error: 'Color must be in hex format (e.g., #3B82F6)' };
    }
  }

  return { valid: true };
};

// Update a single setting
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    let { value } = req.body;

    // Sanitize key and value
    const sanitizedKey = sanitizeInput(key);
    value = typeof value === 'string' ? sanitizeInput(value) : value;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    // Validate setting value
    const validation = validateSettingValue(sanitizedKey, value);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Get old value for audit log
    const oldSetting = await Settings.getByKey(sanitizedKey);
    const oldValue = oldSetting ? oldSetting.setting_value : null;

    const setting = await Settings.update(sanitizedKey, value);

    // Audit log: Setting updated
    const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    logger.security('Setting updated', {
      settingKey: sanitizedKey,
      oldValue: sanitizedKey.includes('pass') || sanitizedKey.includes('password') ? '[REDACTED]' : oldValue,
      newValue: sanitizedKey.includes('pass') || sanitizedKey.includes('password') ? '[REDACTED]' : value,
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (error) {
    logger.error('Error updating setting', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
};

// Update multiple settings
const updateMultipleSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Settings must be an array'
      });
    }

    // Sanitize and validate all settings, and get old values for audit log
    const sanitizedSettings = [];
    const changes = [];

    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Each setting must have a key and value'
        });
      }

      const sanitizedKey = sanitizeInput(setting.key);
      const sanitizedValue = typeof setting.value === 'string' ? sanitizeInput(setting.value) : setting.value;

      // Validate setting value
      const validation = validateSettingValue(sanitizedKey, sanitizedValue);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: `Validation failed for ${sanitizedKey}: ${validation.error}`
        });
      }

      // Get old value for audit log (before update)
      const oldSetting = await Settings.getByKey(sanitizedKey);
      const oldValue = oldSetting ? oldSetting.setting_value : null;

      sanitizedSettings.push({ key: sanitizedKey, value: sanitizedValue });
      changes.push({
        key: sanitizedKey,
        oldValue: sanitizedKey.includes('pass') || sanitizedKey.includes('password') ? '[REDACTED]' : oldValue,
        newValue: sanitizedKey.includes('pass') || sanitizedKey.includes('password') ? '[REDACTED]' : sanitizedValue
      });
    }

    // Settings.updateMultiple already handles transactions internally
    const updated = await Settings.updateMultiple(sanitizedSettings);

    // Audit log: Multiple settings updated
    const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    logger.security('Multiple settings updated', {
      settingsCount: sanitizedSettings.length,
      changes: changes,
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updated
    });
  } catch (error) {
    logger.error('Error updating settings', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};

// Upload company logo
const uploadLogo = async (req, res) => {
  try {
    const uploadSingle = upload.single('logo');
    
    uploadSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Save the file path to settings
      const filePath = `/uploads/branding/${req.file.filename}`;
      await Settings.update('company_logo', filePath);

      // Audit log: Logo uploaded
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Company logo uploaded', {
        filename: req.file.filename,
        filePath,
        fileSize: req.file.size,
        uploadedBy: req.user.id,
        uploadedByName: req.user.name,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        logo: filePath
      });
    });
  } catch (error) {
    logger.error('Error uploading logo', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo'
    });
  }
};

// Upload favicon
const uploadFavicon = async (req, res) => {
  try {
    const uploadSingle = upload.single('favicon');
    
    uploadSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Save the file path to settings
      const filePath = `/uploads/branding/${req.file.filename}`;
      await Settings.update('company_favicon', filePath);

      // Audit log: Favicon uploaded
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Company favicon uploaded', {
        filename: req.file.filename,
        filePath,
        fileSize: req.file.size,
        uploadedBy: req.user.id,
        uploadedByName: req.user.name,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Favicon uploaded successfully',
        favicon: filePath
      });
    });
  } catch (error) {
    logger.error('Error uploading favicon', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload favicon'
    });
  }
};

// Delete logo
const deleteLogo = async (req, res) => {
  try {
    const setting = await Settings.getByKey('company_logo');
    const oldFilePath = setting ? setting.setting_value : null;
    
    if (setting && setting.setting_value) {
      const filePath = path.join(__dirname, '..', 'public', setting.setting_value);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Settings.update('company_logo', null);

    // Audit log: Logo deleted
    const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    logger.security('Company logo deleted', {
      oldFilePath,
      deletedBy: req.user.id,
      deletedByName: req.user.name,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting logo', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete logo'
    });
  }
};

// Delete favicon
const deleteFavicon = async (req, res) => {
  try {
    const setting = await Settings.getByKey('company_favicon');
    const oldFilePath = setting ? setting.setting_value : null;
    
    if (setting && setting.setting_value) {
      const filePath = path.join(__dirname, '..', 'public', setting.setting_value);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Settings.update('company_favicon', null);

    // Audit log: Favicon deleted
    const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    logger.security('Company favicon deleted', {
      oldFilePath,
      deletedBy: req.user.id,
      deletedByName: req.user.name,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Favicon deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting favicon', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete favicon'
    });
  }
};

// Test email configuration
const testEmailConfiguration = async (req, res) => {
  try {
    let { host, port, user, pass, secure, from, fromName } = req.body;

    // Sanitize inputs
    host = sanitizeInput(host);
    port = sanitizeInput(port);
    user = sanitizeInput(user);
    from = from ? sanitizeInput(from) : user;
    fromName = fromName ? sanitizeInput(fromName) : 'Finders CRM';

    // Validate required fields
    if (!host || !port || !user || !pass) {
      return res.status(400).json({
        success: false,
        message: 'Missing required email configuration fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format for SMTP user'
      });
    }

    if (from && !emailRegex.test(from)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format for from address'
      });
    }

    // Validate port
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        message: 'Port must be between 1 and 65535'
      });
    }

    // Create test configuration
    const testConfig = {
      host,
      port: portNum,
      user,
      pass, // Password is not sanitized (needed for SMTP auth)
      secure: secure || false,
      from: from || user,
      fromName: fromName || 'Finders CRM'
    };

    // Test the configuration first
    const isValid = await emailService.testEmailConfiguration(testConfig);
    
    if (!isValid) {
      // Audit log: Email test failed
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      logger.security('Email configuration test failed', {
        host,
        port: portNum,
        user,
        testedBy: req.user.id,
        testedByName: req.user.name,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        message: 'Email configuration test failed. Please check your settings.'
      });
    }

    // Send a test email to the user
    await emailService.sendTestEmail(user, testConfig);

    // Audit log: Email test successful
    const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    logger.security('Email configuration tested successfully', {
      host,
      port: portNum,
      user,
      testedBy: req.user.id,
      testedByName: req.user.name,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.'
    });
  } catch (error) {
    logger.error('Error testing email configuration', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email. Please check your configuration.'
    });
  }
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  updateSetting,
  updateMultipleSettings,
  uploadLogo,
  uploadFavicon,
  deleteLogo,
  deleteFavicon,
  testEmailConfiguration,
  validateSettingValue
};
