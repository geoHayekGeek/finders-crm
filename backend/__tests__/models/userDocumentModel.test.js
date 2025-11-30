const UserDocument = require('../../models/userDocumentModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('UserDocument Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user document', async () => {
      const documentData = {
        user_id: 1,
        document_name: 'test.pdf',
        document_label: 'Test Document',
        file_path: '/uploads/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        uploaded_by: 1,
        notes: 'Test notes'
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...documentData }]
      });

      const result = await UserDocument.create(documentData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_documents'),
        [
          documentData.user_id,
          documentData.document_name,
          documentData.document_label,
          documentData.file_path,
          documentData.file_type,
          documentData.file_size,
          documentData.uploaded_by,
          documentData.notes
        ]
      );
      expect(result).toEqual({ id: 1, ...documentData });
    });
  });

  describe('getUserDocuments', () => {
    it('should get all documents for a user', async () => {
      const userId = 1;
      const mockDocuments = [
        { id: 1, user_id: userId, document_name: 'doc1.pdf' },
        { id: 2, user_id: userId, document_name: 'doc2.pdf' }
      ];

      mockQuery.mockResolvedValue({ rows: mockDocuments });

      const result = await UserDocument.getUserDocuments(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ud.user_id = $1 AND ud.is_active = TRUE'),
        [userId]
      );
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('getById', () => {
    it('should get a document by ID', async () => {
      const documentId = 1;
      const mockDocument = { id: documentId, document_name: 'test.pdf' };

      mockQuery.mockResolvedValue({ rows: [mockDocument] });

      const result = await UserDocument.getById(documentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ud.id = $1'),
        [documentId]
      );
      expect(result).toEqual(mockDocument);
    });
  });

  describe('update', () => {
    it('should update document metadata', async () => {
      const documentId = 1;
      const updateData = {
        document_label: 'Updated Label',
        notes: 'Updated notes'
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: documentId, ...updateData }]
      });

      const result = await UserDocument.update(documentId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_documents'),
        [updateData.document_label, updateData.notes, documentId]
      );
      expect(result).toEqual({ id: documentId, ...updateData });
    });
  });

  describe('delete', () => {
    it('should soft delete a document', async () => {
      const documentId = 1;
      const mockDocument = { id: documentId, is_active: false };

      mockQuery.mockResolvedValue({ rows: [mockDocument] });

      const result = await UserDocument.delete(documentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_documents'),
        expect.arrayContaining([documentId])
      );
      expect(result).toEqual(mockDocument);
    });
  });

  describe('hardDelete', () => {
    it('should hard delete a document', async () => {
      const documentId = 1;
      const mockDocument = { id: documentId };

      mockQuery.mockResolvedValue({ rows: [mockDocument] });

      const result = await UserDocument.hardDelete(documentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_documents'),
        [documentId]
      );
      expect(result).toEqual(mockDocument);
    });
  });

  describe('getUserDocumentCount', () => {
    it('should get document count for a user', async () => {
      const userId = 1;

      mockQuery.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      const result = await UserDocument.getUserDocumentCount(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [userId]
      );
      expect(result).toBe(5);
    });
  });

  describe('search', () => {
    it('should search documents by label or filename', async () => {
      const userId = 1;
      const searchTerm = 'test';
      const mockDocuments = [
        { id: 1, document_label: 'Test Document', document_name: 'test.pdf' }
      ];

      mockQuery.mockResolvedValue({ rows: mockDocuments });

      const result = await UserDocument.search(userId, searchTerm);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        [userId, `%${searchTerm}%`]
      );
      expect(result).toEqual(mockDocuments);
    });
  });
});





