// backend/__tests__/models/categoryModel.test.js
// Unit tests for Category Model

const Category = require('../../models/categoryModel');
const pool = require('../../config/db');

// Mock database
jest.mock('../../config/db');

describe('Category Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should get all active categories', async () => {
      const mockCategories = {
        rows: [
          { id: 1, name: 'Apartment', code: 'APT', is_active: true },
          { id: 2, name: 'Villa', code: 'VIL', is_active: true }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockCategories);

      const result = await Category.getAllCategories();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('is_active = true');
    });
  });

  describe('getAllCategoriesForAdmin', () => {
    it('should get all categories including inactive', async () => {
      const mockCategories = {
        rows: [
          { id: 1, name: 'Apartment', is_active: true },
          { id: 2, name: 'Villa', is_active: false }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockCategories);

      const result = await Category.getAllCategoriesForAdmin();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('SELECT * FROM categories');
    });
  });

  describe('getCategoryById', () => {
    it('should get category by id', async () => {
      const mockCategory = {
        rows: [{
          id: 1,
          name: 'Apartment',
          code: 'APT',
          is_active: true
        }]
      };

      mockQuery.mockResolvedValueOnce(mockCategory);

      const result = await Category.getCategoryById(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Apartment');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND is_active = true'),
        [1]
      );
    });

    it('should return undefined when category not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Category.getCategoryById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getCategoryByCode', () => {
    it('should get category by code', async () => {
      const mockCategory = {
        rows: [{
          id: 1,
          name: 'Apartment',
          code: 'APT',
          is_active: true
        }]
      };

      mockQuery.mockResolvedValueOnce(mockCategory);

      const result = await Category.getCategoryByCode('APT');

      expect(result.code).toBe('APT');
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('code');
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'New Category',
        code: 'NEW',
        description: 'A new category',
        is_active: true
      };

      const mockCreated = {
        rows: [{ id: 1, ...categoryData }]
      };

      mockQuery.mockResolvedValueOnce(mockCreated);

      const result = await Category.createCategory(categoryData);

      expect(result.name).toBe('New Category');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['New Category', 'NEW', 'A new category', true]
      );
    });

    it('should use default is_active when not provided', async () => {
      const categoryData = {
        name: 'New Category',
        code: 'NEW'
      };

      const mockCreated = {
        rows: [{ id: 1, ...categoryData, is_active: true }]
      };

      mockQuery.mockResolvedValueOnce(mockCreated);

      const result = await Category.createCategory(categoryData);

      expect(result.is_active).toBe(true);
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const updates = {
        name: 'Updated Category',
        description: 'Updated description'
      };

      const mockUpdated = {
        rows: [{
          id: 1,
          ...updates
        }]
      };

      mockQuery.mockResolvedValueOnce(mockUpdated);

      const result = await Category.updateCategory(1, updates);

      expect(result.name).toBe('Updated Category');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories'),
        expect.arrayContaining([1, 'Updated Category', 'Updated description'])
      );
    });
  });

  describe('deleteCategory', () => {
    it('should soft delete category by setting is_active to false', async () => {
      const mockDeleted = {
        rows: [{
          id: 1,
          name: 'Category',
          is_active: false
        }]
      };

      mockQuery.mockResolvedValueOnce(mockDeleted);

      const result = await Category.deleteCategory(1);

      expect(result.is_active).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories SET is_active = false'),
        [1]
      );
    });
  });

  describe('getCategoriesWithPropertyCount', () => {
    it('should get categories with property counts', async () => {
      const mockCategories = {
        rows: [
          { id: 1, name: 'Apartment', property_count: 50 },
          { id: 2, name: 'Villa', property_count: 20 }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockCategories);

      const result = await Category.getCategoriesWithPropertyCount();

      expect(result).toHaveLength(2);
      expect(result[0].property_count).toBe(50);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('properties');
    });
  });

  describe('searchCategories', () => {
    it('should search categories by name, code, or description', async () => {
      const mockCategories = {
        rows: [
          { id: 1, name: 'Apartment', code: 'APT' }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockCategories);

      const result = await Category.searchCategories('apartment');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('ILIKE');
    });
  });
});

