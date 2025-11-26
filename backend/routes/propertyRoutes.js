// routes/propertyRoutes.js
const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageProperties,
  canViewProperties,
  canViewAllData,
  canViewFinancialData,
  canViewAgentPerformance
} = require('../middlewares/permissions');
const { handleUploadError, uploadSingle, uploadMultiple } = require('../middlewares/fileUpload');
const { 
  validateProperty,
  validatePropertyUpdate, 
  handleValidationErrors, 
  sanitizeRequestBody, 
  propertyUpdateRateLimit 
} = require('../middlewares/propertyValidation');
const { csrfProtection } = require('../middlewares/csrfProtection');
const { xssProtection } = require('../middlewares/xssProtection');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);



// GET /api/properties - Get all properties (filtered by role)
router.get('/', canViewProperties, csrfProtection, propertyController.getAllProperties);

// GET /api/properties/filtered - Get properties with filters (filtered by role)
router.get('/filtered', canViewProperties, csrfProtection, propertyController.getPropertiesWithFilters);

// GET /api/properties/stats/overview - Get property statistics (admin, operations manager, operations, agent manager)
router.get('/stats/overview', canViewAllData, propertyController.getPropertyStats);

// GET /api/properties/agent/:agentId - Get properties by agent (admin, operations manager, agent manager)
router.get('/agent/:agentId', canViewAgentPerformance, propertyController.getPropertiesByAgent);

// Image management routes (file uploads)
// POST /api/properties/:id/upload-main-image - Upload main property image
router.post('/:id/upload-main-image', canManageProperties, csrfProtection, uploadSingle, propertyController.uploadMainImage);

// POST /api/properties/:id/upload-gallery - Upload multiple gallery images
router.post('/:id/upload-gallery', canManageProperties, csrfProtection, uploadMultiple, propertyController.uploadGalleryImages);

// DELETE /api/properties/:id/images/:imageUrl - Remove image from gallery
router.delete('/:id/images/:imageUrl', canManageProperties, propertyController.removeImageFromGallery);

// GET /api/properties/images/all - Get all properties with images
router.get('/images/all', canViewAllData, propertyController.getPropertiesWithImages);

// GET /api/properties/images/stats - Get image statistics
router.get('/images/stats', canViewAllData, propertyController.getImageStats);

// Property referral routes (must be before /:id route to avoid conflicts)
// GET /api/properties/referrals/pending - Get pending referrals for current user
router.get('/referrals/pending', canViewProperties, propertyController.getPendingReferrals);

// GET /api/properties/referrals/pending/count - Get count of pending referrals
router.get('/referrals/pending/count', canViewProperties, propertyController.getPendingReferralsCount);

// PUT /api/properties/referrals/:id/confirm - Confirm a referral
router.put('/referrals/:id/confirm', canViewProperties, propertyController.confirmReferral);

// PUT /api/properties/referrals/:id/reject - Reject a referral
router.put('/referrals/:id/reject', canViewProperties, propertyController.rejectReferral);

// POST /api/properties/:id/refer - Refer a property to an agent (must be before /:id route)
router.post('/:id/refer', canViewProperties, propertyController.referPropertyToAgent);

// GET /api/properties/:id - Get single property (filtered by role) - MUST BE LAST
router.get('/:id', canViewProperties, csrfProtection, propertyController.getPropertyById);

// POST /api/properties - Create new property (admin, operations manager, operations, agent manager)
router.post('/', 
  canManageProperties, 
  xssProtection,
  sanitizeRequestBody,
  validateProperty,
  handleValidationErrors,
  propertyController.createProperty
);

// PUT /api/properties/:id - Update property (admin, operations manager, operations, agent manager)
router.put('/:id', 
  canManageProperties, 
  xssProtection,
  csrfProtection,
  propertyUpdateRateLimit,
  sanitizeRequestBody,
  validatePropertyUpdate,
  handleValidationErrors,
  propertyController.updateProperty
);

// DELETE /api/properties/:id - Delete property (admin, operations manager, operations, agent manager)
router.delete('/:id', canManageProperties, propertyController.deleteProperty);

// Error handling for file uploads
router.use(handleUploadError);

module.exports = router;
