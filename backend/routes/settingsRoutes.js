// routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// All routes - authentication is handled at page level via ProtectedRoute
router.get('/', settingsController.getAllSettings);
router.get('/category/:category', settingsController.getSettingsByCategory);
router.put('/:key', settingsController.updateSetting);
router.put('/bulk/update', settingsController.updateMultipleSettings);

// File upload routes
router.post('/logo/upload', settingsController.uploadLogo);
router.post('/favicon/upload', settingsController.uploadFavicon);
router.delete('/logo', settingsController.deleteLogo);
router.delete('/favicon', settingsController.deleteFavicon);

// Email configuration test
router.post('/email/test', settingsController.testEmailConfiguration);

module.exports = router;
