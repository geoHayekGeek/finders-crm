// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { 
  authenticateToken, 
  filterDataByRole,
  canManageProperties,
  canViewAllData
} = require('../middlewares/permissions');

// PUBLIC ENDPOINT FOR DEMO (no authentication required)
router.get('/demo', categoryController.getAllCategories);

// Apply authentication and role filtering to all other routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/categories - Get all categories
router.get('/', categoryController.getAllCategories);

// GET /api/categories/with-count - Get categories with property count
router.get('/with-count', categoryController.getCategoriesWithPropertyCount);

// GET /api/categories/search - Search categories
router.get('/search', categoryController.searchCategories);

// GET /api/categories/:id - Get category by ID
router.get('/:id', categoryController.getCategoryById);

// GET /api/categories/code/:code - Get category by code
router.get('/code/:code', categoryController.getCategoryByCode);

// POST /api/categories - Create new category (admin, operations manager, operations, agent manager)
router.post('/', canManageProperties, categoryController.createCategory);

// PUT /api/categories/:id - Update category (admin, operations manager, operations, agent manager)
router.put('/:id', canManageProperties, categoryController.updateCategory);

// DELETE /api/categories/:id - Delete category (admin, operations manager, operations, agent manager)
router.delete('/:id', canManageProperties, categoryController.deleteCategory);

module.exports = router;
