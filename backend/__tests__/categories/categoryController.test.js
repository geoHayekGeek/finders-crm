// __tests__/categories/categoryController.test.js
const CategoryController = require('../../controllers/categoryController');
const Category = require('../../models/categoryModel');

// Mock dependencies
jest.mock('../../models/categoryModel');

describe('Category Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should get all active categories successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Apartment', code: 'APT', is_active: true },
        { id: 2, name: 'Villa', code: 'VIL', is_active: true }
      ];

      Category.getAllCategories.mockResolvedValue(mockCategories);

      await CategoryController.getAllCategories(req, res);

      expect(Category.getAllCategories).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategories
      });
    });

    it('should handle errors', async () => {
      Category.getAllCategories.mockRejectedValue(new Error('Database error'));

      await CategoryController.getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve categories',
        error: 'Database error'
      });
    });
  });

  describe('getAllCategoriesForAdmin', () => {
    it('should get all categories for admin successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Apartment', code: 'APT', is_active: true },
        { id: 2, name: 'Villa', code: 'VIL', is_active: false }
      ];

      Category.getAllCategoriesForAdmin.mockResolvedValue(mockCategories);

      await CategoryController.getAllCategoriesForAdmin(req, res);

      expect(Category.getAllCategoriesForAdmin).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategories
      });
    });

    it('should handle errors', async () => {
      Category.getAllCategoriesForAdmin.mockRejectedValue(new Error('Database error'));

      await CategoryController.getAllCategoriesForAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve categories for admin',
        error: 'Database error'
      });
    });
  });

  describe('getCategoryById', () => {
    it('should get category by ID successfully', async () => {
      req.params = { id: '1' };
      const mockCategory = { id: 1, name: 'Apartment', code: 'APT', is_active: true };

      Category.getCategoryById.mockResolvedValue(mockCategory);

      await CategoryController.getCategoryById(req, res);

      expect(Category.getCategoryById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategory
      });
    });

    it('should return 404 if category not found', async () => {
      req.params = { id: '999' };
      Category.getCategoryById.mockResolvedValue(null);

      await CategoryController.getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category not found'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Category.getCategoryById.mockRejectedValue(new Error('Database error'));

      await CategoryController.getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve category',
        error: 'Database error'
      });
    });
  });

  describe('getCategoryByCode', () => {
    it('should get category by code successfully', async () => {
      req.params = { code: 'APT' };
      const mockCategory = { id: 1, name: 'Apartment', code: 'APT', is_active: true };

      Category.getCategoryByCode.mockResolvedValue(mockCategory);

      await CategoryController.getCategoryByCode(req, res);

      expect(Category.getCategoryByCode).toHaveBeenCalledWith('APT');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategory
      });
    });

    it('should return 404 if category not found', async () => {
      req.params = { code: 'INVALID' };
      Category.getCategoryByCode.mockResolvedValue(null);

      await CategoryController.getCategoryByCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category not found'
      });
    });
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      req.body = {
        name: 'Apartment',
        code: 'APT',
        description: 'Apartment category',
        is_active: true
      };

      const mockCategory = { id: 1, ...req.body };
      Category.createCategory.mockResolvedValue(mockCategory);

      await CategoryController.createCategory(req, res);

      expect(Category.createCategory).toHaveBeenCalledWith({
        name: 'Apartment',
        code: 'APT',
        description: 'Apartment category',
        is_active: true
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Category created successfully',
        data: mockCategory
      });
    });

    it('should use default is_active if not provided', async () => {
      req.body = {
        name: 'Apartment',
        code: 'APT'
      };

      const mockCategory = { id: 1, ...req.body, is_active: true };
      Category.createCategory.mockResolvedValue(mockCategory);

      await CategoryController.createCategory(req, res);

      expect(Category.createCategory).toHaveBeenCalledWith({
        name: 'Apartment',
        code: 'APT',
        description: undefined,
        is_active: true
      });
    });

    it('should return 400 if name is missing', async () => {
      req.body = { code: 'APT' };

      await CategoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and code are required'
      });
      expect(Category.createCategory).not.toHaveBeenCalled();
    });

    it('should return 400 if code is missing', async () => {
      req.body = { name: 'Apartment' };

      await CategoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and code are required'
      });
    });

    it('should handle duplicate category error', async () => {
      req.body = {
        name: 'Apartment',
        code: 'APT'
      };

      const error = new Error('Duplicate key');
      error.code = '23505';
      Category.createCategory.mockRejectedValue(error);

      await CategoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category with this name or code already exists'
      });
    });

    it('should handle errors', async () => {
      req.body = {
        name: 'Apartment',
        code: 'APT'
      };

      Category.createCategory.mockRejectedValue(new Error('Database error'));

      await CategoryController.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create category',
        error: 'Database error'
      });
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        name: 'Updated Apartment',
        description: 'Updated description'
      };

      const mockCategory = { id: 1, name: 'Updated Apartment', description: 'Updated description' };
      Category.updateCategory.mockResolvedValue(mockCategory);

      await CategoryController.updateCategory(req, res);

      expect(Category.updateCategory).toHaveBeenCalledWith('1', {
        name: 'Updated Apartment',
        description: 'Updated description'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Category updated successfully',
        data: mockCategory
      });
    });

    it('should remove protected fields from updates', async () => {
      req.params = { id: '1' };
      req.body = {
        id: 999,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        name: 'Updated Apartment'
      };

      const mockCategory = { id: 1, name: 'Updated Apartment' };
      Category.updateCategory.mockResolvedValue(mockCategory);

      await CategoryController.updateCategory(req, res);

      const updateCall = Category.updateCategory.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('id');
      expect(updateCall[1]).not.toHaveProperty('created_at');
      expect(updateCall[1]).not.toHaveProperty('updated_at');
    });

    it('should return 404 if category not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Updated' };
      Category.updateCategory.mockResolvedValue(null);

      await CategoryController.updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category not found'
      });
    });

    it('should handle duplicate category error', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Apartment', code: 'APT' };

      const error = new Error('Duplicate key');
      error.code = '23505';
      Category.updateCategory.mockRejectedValue(error);

      await CategoryController.updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category with this name or code already exists'
      });
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      req.params = { id: '1' };
      const mockCategory = { id: 1, name: 'Apartment', is_active: false };
      Category.deleteCategory.mockResolvedValue(mockCategory);

      await CategoryController.deleteCategory(req, res);

      expect(Category.deleteCategory).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Category deleted successfully',
        data: mockCategory
      });
    });

    it('should return 404 if category not found', async () => {
      req.params = { id: '999' };
      Category.deleteCategory.mockResolvedValue(null);

      await CategoryController.deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category not found'
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      Category.deleteCategory.mockRejectedValue(new Error('Database error'));

      await CategoryController.deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete category',
        error: 'Database error'
      });
    });
  });

  describe('getCategoriesWithPropertyCount', () => {
    it('should get categories with property count successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Apartment', code: 'APT', property_count: 50 },
        { id: 2, name: 'Villa', code: 'VIL', property_count: 30 }
      ];

      Category.getCategoriesWithPropertyCount.mockResolvedValue(mockCategories);

      await CategoryController.getCategoriesWithPropertyCount(req, res);

      expect(Category.getCategoriesWithPropertyCount).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategories
      });
    });

    it('should handle errors', async () => {
      Category.getCategoriesWithPropertyCount.mockRejectedValue(new Error('Database error'));

      await CategoryController.getCategoriesWithPropertyCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve categories with property count',
        error: 'Database error'
      });
    });
  });

  describe('searchCategories', () => {
    it('should search categories successfully', async () => {
      req.query = { q: 'apartment' };
      const mockCategories = [
        { id: 1, name: 'Apartment', code: 'APT' }
      ];

      Category.searchCategories.mockResolvedValue(mockCategories);

      await CategoryController.searchCategories(req, res);

      expect(Category.searchCategories).toHaveBeenCalledWith('apartment');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategories
      });
    });

    it('should return 400 if search query is missing', async () => {
      req.query = {};

      await CategoryController.searchCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required'
      });
      expect(Category.searchCategories).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { q: 'apartment' };
      Category.searchCategories.mockRejectedValue(new Error('Database error'));

      await CategoryController.searchCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to search categories',
        error: 'Database error'
      });
    });
  });
});





















