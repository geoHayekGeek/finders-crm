// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, filterDataByRole } = require('../middlewares/permissions');

// Apply authentication and role filtering to all routes
router.use(authenticateToken);
router.use(filterDataByRole);

// GET /api/categories - Get all categories (filtered by role)
router.get('/', categoryController.getAllCategories);

// GET /api/categories/:id - Get single category
router.get('/:id', categoryController.getCategoryById);

// POST /api/categories - Create new category (admin only)
router.post('/', categoryController.createCategory);

// PUT /api/categories/:id - Update category (admin only)
router.put('/:id', categoryController.updateCategory);

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
