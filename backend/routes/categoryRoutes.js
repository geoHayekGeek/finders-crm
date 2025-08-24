// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { 
  authenticateToken, 
  filterDataByRole, 
  canManageCategoriesAndStatuses,
  canViewCategoriesAndStatuses
} = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/categories - Get all categories (active only, filtered by role)
router.get('/', canViewCategoriesAndStatuses, categoryController.getAllCategories);

// GET /api/categories/admin - Get all categories for admin (active and inactive) - MANAGEMENT ONLY
router.get('/admin', canManageCategoriesAndStatuses, categoryController.getAllCategoriesForAdmin);

// GET /api/categories/:id - Get single category (agents can view for property functionality)
router.get('/:id', canViewCategoriesAndStatuses, categoryController.getCategoryById);

// POST /api/categories - Create new category (MANAGEMENT ONLY)
router.post('/', canManageCategoriesAndStatuses, categoryController.createCategory);

// PUT /api/categories/:id - Update category (MANAGEMENT ONLY)
router.put('/:id', canManageCategoriesAndStatuses, categoryController.updateCategory);

// DELETE /api/categories/:id - Delete category (MANAGEMENT ONLY)
router.delete('/:id', canManageCategoriesAndStatuses, categoryController.deleteCategory);

module.exports = router;
