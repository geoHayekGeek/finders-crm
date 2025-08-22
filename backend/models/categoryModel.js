// models/categoryModel.js
const pool = require('../config/db');

class Category {
  static async getAllCategories() {
    const result = await pool.query(
      `SELECT * FROM categories WHERE is_active = true ORDER BY name ASC`
    );
    return result.rows;
  }

  static async getCategoryById(id) {
    const result = await pool.query(
      `SELECT * FROM categories WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async getCategoryByCode(code) {
    const result = await pool.query(
      `SELECT * FROM categories WHERE code = $1 AND is_active = true`,
      [code]
    );
    return result.rows[0];
  }

  static async createCategory(categoryData) {
    const { name, code, description } = categoryData;
    
    const result = await pool.query(
      `INSERT INTO categories (name, code, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, code, description]
    );
    return result.rows[0];
  }

  static async updateCategory(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE categories 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteCategory(id) {
    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE categories SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async getCategoriesWithPropertyCount() {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(p.id) as property_count
      FROM categories c
      LEFT JOIN properties p ON c.id = p.category_id
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    return result.rows;
  }

  static async searchCategories(searchTerm) {
    const result = await pool.query(
      `SELECT * FROM categories 
       WHERE is_active = true 
       AND (name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1)
       ORDER BY name ASC`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  }
}

module.exports = Category;
