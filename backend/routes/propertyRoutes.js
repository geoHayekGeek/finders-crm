// routes/propertyRoutes.js
const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageProperties,
  canViewAllData,
  canViewFinancialData,
  canViewAgentPerformance
} = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/properties - Get all properties (filtered by role)
router.get('/', propertyController.getAllProperties);

// GET /api/properties/filtered - Get properties with filters (filtered by role)
router.get('/filtered', propertyController.getPropertiesWithFilters);

// GET /api/properties/:id - Get single property (filtered by role)
router.get('/:id', propertyController.getPropertyById);

// POST /api/properties - Create new property (admin, operations manager, operations, agent manager)
router.post('/', canManageProperties, propertyController.createProperty);

// PUT /api/properties/:id - Update property (admin, operations manager, operations, agent manager)
router.put('/:id', canManageProperties, propertyController.updateProperty);

// DELETE /api/properties/:id - Delete property (admin, operations manager, operations, agent manager)
router.delete('/:id', canManageProperties, propertyController.deleteProperty);

// GET /api/properties/stats/overview - Get property statistics (admin, operations manager, operations, agent manager)
router.get('/stats/overview', canViewAllData, propertyController.getPropertyStats);

// GET /api/properties/agent/:agentId - Get properties by agent (admin, operations manager, agent manager)
router.get('/agent/:agentId', canViewAgentPerformance, propertyController.getPropertiesByAgent);

module.exports = router;
