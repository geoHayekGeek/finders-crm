// routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { 
  authenticateToken, 
  canManageSettings
} = require('../middlewares/permissions');
const { csrfProtection } = require('../middlewares/csrfProtection');
const { createRateLimiter } = require('../middlewares/rateLimiter');

// Rate limiter for settings operations (stricter for admin operations)
const settingsReadLimiter = createRateLimiter(50, 15 * 60 * 1000); // 50 requests per 15 minutes
const settingsWriteLimiter = createRateLimiter(20, 15 * 60 * 1000); // 20 requests per 15 minutes

// Apply authentication and admin-only access to all routes
router.use(authenticateToken);
router.use(canManageSettings);

// GET routes - read operations
router.get('/', settingsReadLimiter, settingsController.getAllSettings);
router.get('/category/:category', settingsReadLimiter, settingsController.getSettingsByCategory);

// PUT routes - write operations (require CSRF protection)
router.put('/:key', settingsWriteLimiter, csrfProtection, settingsController.updateSetting);
router.put('/bulk/update', settingsWriteLimiter, csrfProtection, settingsController.updateMultipleSettings);

// File upload routes (require CSRF protection)
router.post('/logo/upload', settingsWriteLimiter, csrfProtection, settingsController.uploadLogo);
router.post('/favicon/upload', settingsWriteLimiter, csrfProtection, settingsController.uploadFavicon);
router.delete('/logo', settingsWriteLimiter, csrfProtection, settingsController.deleteLogo);
router.delete('/favicon', settingsWriteLimiter, csrfProtection, settingsController.deleteFavicon);

// Email configuration test (require CSRF protection)
router.post('/email/test', settingsWriteLimiter, csrfProtection, settingsController.testEmailConfiguration);

module.exports = router;
