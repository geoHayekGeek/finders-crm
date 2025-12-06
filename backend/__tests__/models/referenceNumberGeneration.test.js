// Unit tests for reference number generation function
const pool = require('../../config/db');

describe('Reference Number Generation', () => {
  let testCategoryCode = 'S'; // Shop
  let testYear = new Date().getFullYear().toString().slice(-2);
  
  beforeAll(async () => {
    // Ensure the function exists
    try {
      await pool.query(`
        SELECT generate_reference_number('TEST', 'rent')
      `);
    } catch (error) {
      console.warn('Reference number function may not exist. Run migration first.');
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Format validation', () => {
    it('should generate reference number in correct format: F + Type + Category + Year + ID', async () => {
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        [testCategoryCode, 'rent']
      );
      
      const refNumber = result.rows[0].ref_number;
      
      // Should start with F
      expect(refNumber).toMatch(/^F/);
      
      // Should have R (Rent) or S (Sale) as second character
      expect(refNumber[1]).toMatch(/^[RS]$/);
      
      // Should contain category code
      expect(refNumber).toContain(testCategoryCode);
      
      // Should contain year (last 2 digits)
      expect(refNumber).toContain(testYear);
      
      // Should end with digits (ID, no leading zeros, variable length)
      expect(refNumber).toMatch(/\d+$/);
      
      // Should not have leading zeros in the ID part
      const idPart = refNumber.match(/\d+$/)[0];
      expect(idPart).not.toMatch(/^0/);
      
      // Total length should be: F(1) + Type(1) + Category(variable) + Year(2) + ID(variable, no leading zeros)
      // Minimum length check
      const minLength = 1 + 1 + testCategoryCode.length + 2 + 1; // At least 1 digit for ID
      expect(refNumber.length).toBeGreaterThanOrEqual(minLength);
    });

    it('should use S for sale properties', async () => {
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        [testCategoryCode, 'sale']
      );
      
      const refNumber = result.rows[0].ref_number;
      // Second character should be S for Sale
      expect(refNumber[1]).toBe('S');
    });

    it('should use R for rent properties', async () => {
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        [testCategoryCode, 'rent']
      );
      
      const refNumber = result.rows[0].ref_number;
      // Second character should be R for Rent
      expect(refNumber[1]).toBe('R');
    });
  });

  describe('Sequential ID generation', () => {
    it('should generate globally unique IDs without leading zeros', async () => {
      // This test verifies that IDs are generated without leading zeros
      // Use a real category code (Office 'O') for testing
      const testCategoryCode = 'O';
      
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        [testCategoryCode, 'rent']
      );
      
      const refNumber = result.rows[0].ref_number;
      const idPart = refNumber.match(/\d+$/)[0];
      
      // ID should not have leading zeros
      expect(idPart).not.toMatch(/^0/);
      // ID should be a valid number
      expect(parseInt(idPart)).toBeGreaterThan(0);
    });

    it('should increment IDs sequentially for same type/category/year', async () => {
      // Use a real category code (Warehouse 'W') for testing
      const testCategoryCode = 'W';
      const propertyType = 'rent';
      
      // Get the real category ID
      const categoryResult = await pool.query(
        `SELECT id FROM categories WHERE code = $1 LIMIT 1`,
        [testCategoryCode]
      );
      
      if (categoryResult.rows.length === 0) {
        throw new Error(`Test category ${testCategoryCode} not found. Please ensure categories are set up.`);
      }
      
      const categoryId = categoryResult.rows[0].id;
      
      try {
        // Generate and insert properties to test sequential IDs
        const ref1 = await pool.query(
          `SELECT generate_reference_number($1, $2) as ref_number`,
          [testCategoryCode, propertyType]
        );
        
        // Insert the first property
        await pool.query(
          `INSERT INTO properties (
            reference_number, status_id, property_type, location, category_id,
            owner_name, phone_number, surface, details, interior_details,
            view_type, concierge, price
          ) VALUES ($1, (SELECT id FROM statuses LIMIT 1), $2, 'Test Location', $3,
                    'Test Owner', '1234567890', 100, '{}', '{}',
                    'no view', false, 100000)`,
          [ref1.rows[0].ref_number, propertyType, categoryId]
        );
        
        // Generate second reference number (should be next ID)
        // The function should automatically see the first property and increment
        const ref2 = await pool.query(
          `SELECT generate_reference_number($1, $2) as ref_number`, 
          [testCategoryCode, propertyType]
        );
        
        // Insert the second property
        await pool.query(
          `INSERT INTO properties (
            reference_number, status_id, property_type, location, category_id,
            owner_name, phone_number, surface, details, interior_details,
            view_type, concierge, price
          ) VALUES ($1, (SELECT id FROM statuses LIMIT 1), $2, 'Test Location', $3,
                    'Test Owner', '1234567890', 100, '{}', '{}',
                    'no view', false, 100000)`,
          [ref2.rows[0].ref_number, propertyType, categoryId]
        );
        
        // Generate third reference number (should be next ID)
        const ref3 = await pool.query(
          `SELECT generate_reference_number($1, $2) as ref_number`, 
          [testCategoryCode, propertyType]
        );
        
        const id1 = parseInt(ref1.rows[0].ref_number.match(/\d+$/)[0]);
        const id2 = parseInt(ref2.rows[0].ref_number.match(/\d+$/)[0]);
        const id3 = parseInt(ref3.rows[0].ref_number.match(/\d+$/)[0]);
        
        // IDs should be sequential and globally unique
        expect(id2).toBe(id1 + 1);
        expect(id3).toBe(id2 + 1);
        
        // Clean up test data
        await pool.query(`DELETE FROM properties WHERE reference_number IN ($1, $2)`, 
          [ref1.rows[0].ref_number, ref2.rows[0].ref_number]);
      } catch (error) {
        // Clean up any inserted properties on error
        try {
          await pool.query(`DELETE FROM properties WHERE reference_number LIKE 'FRW25%' AND owner_name = 'Test Owner'`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    });
  });

  describe('Year handling', () => {
    it('should use current year in reference number', async () => {
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        [testCategoryCode, 'rent']
      );
      
      const refNumber = result.rows[0].ref_number;
      const yearPart = testYear;
      
      // Should contain current year
      expect(refNumber).toContain(yearPart);
    });
  });

  describe('Category code handling', () => {
    it('should handle single character category codes', async () => {
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        ['A', 'rent']
      );
      
      const refNumber = result.rows[0].ref_number;
      expect(refNumber).toContain('A');
    });

    it('should handle multi-character category codes', async () => {
      const result = await pool.query(
        `SELECT generate_reference_number($1, $2) as ref_number`,
        ['APT', 'rent']
      );
      
      const refNumber = result.rows[0].ref_number;
      expect(refNumber).toContain('APT');
    });
  });

  describe('Uniqueness', () => {
    it('should generate unique reference numbers when properties are inserted', async () => {
      // Use a real category code (Land 'L') for testing
      const testCategoryCode = 'L';
      const propertyType = 'rent';
      
      // Get the real category ID
      const categoryResult = await pool.query(
        `SELECT id FROM categories WHERE code = $1 LIMIT 1`,
        [testCategoryCode]
      );
      
      if (categoryResult.rows.length === 0) {
        throw new Error(`Test category ${testCategoryCode} not found. Please ensure categories are set up.`);
      }
      
      const categoryId = categoryResult.rows[0].id;
      
      const refs = [];
      const insertedRefs = [];
      
      try {
        // Generate and insert 5 properties
        for (let i = 0; i < 5; i++) {
          const result = await pool.query(
            `SELECT generate_reference_number($1, $2) as ref_number`,
            [testCategoryCode, propertyType]
          );
          const refNumber = result.rows[0].ref_number;
          refs.push(refNumber);
          
          // Insert the property so next call sees it
          await pool.query(
            `INSERT INTO properties (
              reference_number, status_id, property_type, location, category_id,
              owner_name, phone_number, surface, details, interior_details,
              view_type, concierge, price
            ) VALUES ($1, (SELECT id FROM statuses LIMIT 1), $2, 'Test Location', $3,
                      'Test Owner', '1234567890', 100, '{}', '{}',
                      'no view', false, 100000)`,
            [refNumber, propertyType, categoryId]
          );
          insertedRefs.push(refNumber);
        }
        
        // All reference numbers should be unique
        const uniqueRefs = [...new Set(refs)];
        expect(uniqueRefs.length).toBe(refs.length);
        
        // Verify they are sequential and globally unique
        const ids = refs.map(ref => parseInt(ref.match(/\d+$/)[0]));
        for (let i = 1; i < ids.length; i++) {
          expect(ids[i]).toBe(ids[i-1] + 1);
        }
        
        // Verify no leading zeros
        refs.forEach(ref => {
          const idPart = ref.match(/\d+$/)[0];
          expect(idPart).not.toMatch(/^0/);
        });
        
        // Clean up
        await pool.query(`DELETE FROM properties WHERE reference_number = ANY($1)`, 
          [insertedRefs]);
      } catch (error) {
        // Clean up any inserted properties on error
        try {
          await pool.query(`DELETE FROM properties WHERE reference_number LIKE 'FRL25%' AND owner_name = 'Test Owner'`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    });
  });
});

