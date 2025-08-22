// controllers/categoryController.js
const Category = require('../models/categoryModel');

class CategoryController {
  // Get all categories
  static async getAllCategories(req, res) {
    try {
      const categories = await Category.getAllCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        error: error.message
      });
    }
  }

  // Get category by ID
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.getCategoryById(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error getting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category',
        error: error.message
      });
    }
  }

  // Get category by code
  static async getCategoryByCode(req, res) {
    try {
      const { code } = req.params;
      const category = await Category.getCategoryByCode(code);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error getting category by code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category',
        error: error.message
      });
    }
  }

  // Create new category
  static async createCategory(req, res) {
    try {
      const { name, code, description } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Name and code are required'
        });
      }

      const category = await Category.createCategory({
        name,
        code,
        description
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Category with this name or code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
  }

  // Update category
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.created_at;
      delete updates.updated_at;

      const category = await Category.updateCategory(id, updates);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Category with this name or code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message
      });
    }
  }

  // Delete category (soft delete)
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.deleteCategory(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        message: 'Category deleted successfully',
        data: category
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message
      });
    }
  }

  // Get categories with property count
  static async getCategoriesWithPropertyCount(req, res) {
    try {
      const categories = await Category.getCategoriesWithPropertyCount();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error getting categories with property count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories with property count',
        error: error.message
      });
    }
  }

  // Search categories
  static async searchCategories(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const categories = await Category.searchCategories(q);
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error searching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search categories',
        error: error.message
      });
    }
  }
}

module.exports = CategoryController;
