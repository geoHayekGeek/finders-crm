// __tests__/hr/userDocumentController.test.js
const userDocumentController = require('../../controllers/userDocumentController');
const UserDocument = require('../../models/userDocumentModel');
const fs = require('fs').promises;

// Mock all dependencies
jest.mock('../../models/userDocumentModel');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('User Document Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Admin User', role: 'admin' },
      params: {},
      query: {},
      body: {},
      file: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      download: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      req.params.userId = '1';
      req.body = { document_label: 'ID Card', notes: 'Front side' };
      req.file = {
        originalname: 'id-card.pdf',
        path: '/uploads/documents/id-card.pdf',
        mimetype: 'application/pdf',
        size: 1024
      };

      const mockDocument = {
        id: 1,
        user_id: 1,
        document_name: 'id-card.pdf',
        document_label: 'ID Card',
        file_path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.create.mockResolvedValue(mockDocument);

      await userDocumentController.uploadDocument(req, res);

      expect(UserDocument.create).toHaveBeenCalledWith({
        user_id: 1,
        document_name: 'id-card.pdf',
        document_label: 'ID Card',
        file_path: '/uploads/documents/id-card.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        uploaded_by: 1,
        notes: 'Front side'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document uploaded successfully',
        data: mockDocument
      });
    });

    it('should return 400 if no file uploaded', async () => {
      req.params.userId = '1';
      req.body = { document_label: 'ID Card' };
      req.file = null;

      await userDocumentController.uploadDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded'
      });
    });

    it('should return 400 if document label is missing', async () => {
      req.params.userId = '1';
      req.body = {};
      req.file = {
        originalname: 'id-card.pdf',
        path: '/uploads/documents/id-card.pdf'
      };

      await userDocumentController.uploadDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Document label is required'
      });
    });

    it('should handle errors', async () => {
      req.params.userId = '1';
      req.body = { document_label: 'ID Card' };
      req.file = {
        originalname: 'id-card.pdf',
        path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.create.mockRejectedValue(new Error('Database error'));

      await userDocumentController.uploadDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to upload document'
      });
    });
  });

  describe('getUserDocuments', () => {
    it('should get user documents successfully', async () => {
      req.params.userId = '1';
      const mockDocuments = [
        { id: 1, user_id: 1, document_name: 'id-card.pdf', document_label: 'ID Card' }
      ];

      UserDocument.getUserDocuments.mockResolvedValue(mockDocuments);

      await userDocumentController.getUserDocuments(req, res);

      expect(UserDocument.getUserDocuments).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocuments
      });
    });

    it('should handle errors', async () => {
      req.params.userId = '1';
      UserDocument.getUserDocuments.mockRejectedValue(new Error('Database error'));

      await userDocumentController.getUserDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch documents'
      });
    });
  });

  describe('getDocument', () => {
    it('should get document successfully', async () => {
      req.params.documentId = '1';
      const mockDocument = {
        id: 1,
        user_id: 1,
        document_name: 'id-card.pdf',
        document_label: 'ID Card'
      };

      UserDocument.getById.mockResolvedValue(mockDocument);

      await userDocumentController.getDocument(req, res);

      expect(UserDocument.getById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocument
      });
    });

    it('should return 404 if document not found', async () => {
      req.params.documentId = '999';

      UserDocument.getById.mockResolvedValue(null);

      await userDocumentController.getDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Document not found'
      });
    });

    it('should handle errors', async () => {
      req.params.documentId = '1';
      UserDocument.getById.mockRejectedValue(new Error('Database error'));

      await userDocumentController.getDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch document'
      });
    });
  });

  describe('downloadDocument', () => {
    it('should download document successfully', async () => {
      req.params.documentId = '1';
      const mockDocument = {
        id: 1,
        document_name: 'id-card.pdf',
        file_path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.getById.mockResolvedValue(mockDocument);
      fs.access.mockResolvedValue();

      await userDocumentController.downloadDocument(req, res);

      expect(UserDocument.getById).toHaveBeenCalledWith(1);
      expect(fs.access).toHaveBeenCalledWith('/uploads/documents/id-card.pdf');
      expect(res.download).toHaveBeenCalledWith('/uploads/documents/id-card.pdf', 'id-card.pdf');
    });

    it('should return 404 if document not found', async () => {
      req.params.documentId = '999';

      UserDocument.getById.mockResolvedValue(null);

      await userDocumentController.downloadDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Document not found'
      });
    });

    it('should return 404 if file not found on server', async () => {
      req.params.documentId = '1';
      const mockDocument = {
        id: 1,
        document_name: 'id-card.pdf',
        file_path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.getById.mockResolvedValue(mockDocument);
      fs.access.mockRejectedValue(new Error('File not found'));

      await userDocumentController.downloadDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'File not found on server'
      });
    });

    it('should handle errors', async () => {
      req.params.documentId = '1';
      UserDocument.getById.mockRejectedValue(new Error('Database error'));

      await userDocumentController.downloadDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to download document'
      });
    });
  });

  describe('updateDocument', () => {
    it('should update document successfully', async () => {
      req.params.documentId = '1';
      req.body = { document_label: 'Updated ID Card', notes: 'Updated notes' };

      const mockDocument = {
        id: 1,
        document_label: 'Updated ID Card',
        notes: 'Updated notes'
      };

      UserDocument.update.mockResolvedValue(mockDocument);

      await userDocumentController.updateDocument(req, res);

      expect(UserDocument.update).toHaveBeenCalledWith(1, {
        document_label: 'Updated ID Card',
        notes: 'Updated notes'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document updated successfully',
        data: mockDocument
      });
    });

    it('should return 400 if document label is missing', async () => {
      req.params.documentId = '1';
      req.body = { notes: 'Some notes' };

      await userDocumentController.updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Document label is required'
      });
    });

    it('should return 404 if document not found', async () => {
      req.params.documentId = '999';
      req.body = { document_label: 'Updated ID Card' };

      UserDocument.update.mockResolvedValue(null);

      await userDocumentController.updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Document not found'
      });
    });

    it('should handle errors', async () => {
      req.params.documentId = '1';
      req.body = { document_label: 'Updated ID Card' };

      UserDocument.update.mockRejectedValue(new Error('Database error'));

      await userDocumentController.updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update document'
      });
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete document successfully', async () => {
      req.params.documentId = '1';
      req.query = {};

      const mockDocument = {
        id: 1,
        document_name: 'id-card.pdf',
        file_path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.getById.mockResolvedValue(mockDocument);
      UserDocument.delete.mockResolvedValue(true);

      await userDocumentController.deleteDocument(req, res);

      expect(UserDocument.getById).toHaveBeenCalledWith(1);
      expect(UserDocument.delete).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document deleted successfully'
      });
    });

    it('should hard delete document successfully', async () => {
      req.params.documentId = '1';
      req.query = { hardDelete: 'true' };

      const mockDocument = {
        id: 1,
        document_name: 'id-card.pdf',
        file_path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.getById.mockResolvedValue(mockDocument);
      UserDocument.hardDelete.mockResolvedValue(true);
      fs.unlink.mockResolvedValue();

      await userDocumentController.deleteDocument(req, res);

      expect(UserDocument.getById).toHaveBeenCalledWith(1);
      expect(UserDocument.hardDelete).toHaveBeenCalledWith(1);
      expect(fs.unlink).toHaveBeenCalledWith('/uploads/documents/id-card.pdf');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document deleted successfully'
      });
    });

    it('should handle file deletion errors gracefully during hard delete', async () => {
      req.params.documentId = '1';
      req.query = { hardDelete: 'true' };

      const mockDocument = {
        id: 1,
        document_name: 'id-card.pdf',
        file_path: '/uploads/documents/id-card.pdf'
      };

      UserDocument.getById.mockResolvedValue(mockDocument);
      UserDocument.hardDelete.mockResolvedValue(true);
      fs.unlink.mockRejectedValue(new Error('File not found'));

      await userDocumentController.deleteDocument(req, res);

      expect(UserDocument.hardDelete).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document deleted successfully'
      });
    });

    it('should return 404 if document not found', async () => {
      req.params.documentId = '999';

      UserDocument.getById.mockResolvedValue(null);

      await userDocumentController.deleteDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Document not found'
      });
    });

    it('should handle errors', async () => {
      req.params.documentId = '1';
      UserDocument.getById.mockRejectedValue(new Error('Database error'));

      await userDocumentController.deleteDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete document'
      });
    });
  });

  describe('searchDocuments', () => {
    it('should search documents successfully', async () => {
      req.params.userId = '1';
      req.query = { search: 'ID Card' };

      const mockDocuments = [
        { id: 1, document_label: 'ID Card', document_name: 'id-card.pdf' }
      ];

      UserDocument.search.mockResolvedValue(mockDocuments);

      await userDocumentController.searchDocuments(req, res);

      expect(UserDocument.search).toHaveBeenCalledWith(1, 'ID Card');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocuments
      });
    });

    it('should return 400 if search term is missing', async () => {
      req.params.userId = '1';
      req.query = {};

      await userDocumentController.searchDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search term is required'
      });
    });

    it('should return 400 if search term is empty', async () => {
      req.params.userId = '1';
      req.query = { search: '   ' };

      await userDocumentController.searchDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search term is required'
      });
    });

    it('should handle errors', async () => {
      req.params.userId = '1';
      req.query = { search: 'ID Card' };

      UserDocument.search.mockRejectedValue(new Error('Database error'));

      await userDocumentController.searchDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to search documents'
      });
    });
  });
});

