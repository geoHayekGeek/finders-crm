// controllers/settingsController.js
const Settings = require('../models/settingsModel');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    console.error('Error getting settings:', error);
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
    const settings = await Settings.getByCategory(category);
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error getting settings by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
};

// Update a single setting
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const setting = await Settings.update(key, value);
    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
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

    const updated = await Settings.updateMultiple(settings);
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updated
    });
  } catch (error) {
    console.error('Error updating settings:', error);
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

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        logo: filePath
      });
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
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

      res.json({
        success: true,
        message: 'Favicon uploaded successfully',
        favicon: filePath
      });
    });
  } catch (error) {
    console.error('Error uploading favicon:', error);
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
    
    if (setting && setting.setting_value) {
      const filePath = path.join(__dirname, '..', 'public', setting.setting_value);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Settings.update('company_logo', null);
    
    res.json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
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
    
    if (setting && setting.setting_value) {
      const filePath = path.join(__dirname, '..', 'public', setting.setting_value);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Settings.update('company_favicon', null);
    
    res.json({
      success: true,
      message: 'Favicon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting favicon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete favicon'
    });
  }
};

// Test email configuration
const testEmailConfiguration = async (req, res) => {
  try {
    const { host, port, user, pass, secure, from, fromName } = req.body;

    // Validate required fields
    if (!host || !port || !user || !pass) {
      return res.status(400).json({
        success: false,
        message: 'Missing required email configuration fields'
      });
    }

    // Create test configuration
    const testConfig = {
      host,
      port: parseInt(port),
      user,
      pass,
      secure: secure || false,
      from: from || user,
      fromName: fromName || 'Finders CRM'
    };

    // Test the configuration first
    const isValid = await emailService.testEmailConfiguration(testConfig);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Email configuration test failed. Please check your settings.'
      });
    }

    // Send a test email to the user
    await emailService.sendTestEmail(user, testConfig);

    res.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.'
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
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
  testEmailConfiguration
};
