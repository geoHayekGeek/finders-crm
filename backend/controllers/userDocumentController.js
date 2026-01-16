// controllers/userDocumentController.js
const UserDocument = require('../models/userDocumentModel');
const path = require('path');
const fs = require('fs').promises;

// Normalize role to handle both 'operations_manager' and 'operations manager' formats
const normalizeRole = (role) => {
  if (!role) return '';
  return role.toLowerCase().replace(/_/g, ' ').trim();
};

/**
 * Upload a document for a user
 */
const uploadDocument = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { userId } = req.params;
    const { document_label, notes } = req.body;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    // Permission check: Only admin, HR, operations manager, or the user themselves can upload documents
    const normalizedRole = normalizeRole(currentUserRole);
    if (parseInt(userId) !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only upload documents for yourself.'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate document label
    if (!document_label || document_label.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Document label is required'
      });
    }

    // Get the uploaded by user ID from auth token
    const uploaded_by = req.user.id;

    // Create document record
    const document = await UserDocument.create({
      user_id: parseInt(userId),
      document_name: req.file.originalname,
      document_label: document_label.trim(),
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by,
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
};

/**
 * Get all documents for a user
 */
const getUserDocuments = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { userId } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    // Permission check: Only admin, HR, operations manager, or the user themselves can view documents
    const normalizedRole = normalizeRole(currentUserRole);
    if (parseInt(userId) !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own documents.'
      });
    }

    const documents = await UserDocument.getUserDocuments(parseInt(userId));

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
};

/**
 * Get a specific document
 */
const getDocument = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { documentId } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    const document = await UserDocument.getById(parseInt(documentId));

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Permission check: Only admin, HR, operations manager, or the document owner can view the document
    const normalizedRole = normalizeRole(currentUserRole);
    if (document.user_id !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own documents.'
      });
    }

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
};

/**
 * Download a document
 */
const downloadDocument = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { documentId } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    const document = await UserDocument.getById(parseInt(documentId));

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Permission check: Only admin, HR, operations manager, or the document owner can download the document
    const normalizedRole = normalizeRole(currentUserRole);
    if (document.user_id !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only download your own documents.'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Send file
    res.download(document.file_path, document.document_name);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
};

/**
 * Update document metadata
 */
const updateDocument = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { documentId } = req.params;
    const { document_label, notes } = req.body;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    // Validate document label
    if (!document_label || document_label.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Document label is required'
      });
    }

    // First get the document to check permissions
    const existingDocument = await UserDocument.getById(parseInt(documentId));
    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Permission check: Only admin, HR, operations manager, or the document owner can update the document
    const normalizedRole = normalizeRole(currentUserRole);
    if (existingDocument.user_id !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own documents.'
      });
    }

    const document = await UserDocument.update(parseInt(documentId), {
      document_label: document_label.trim(),
      notes: notes || null
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
};

/**
 * Delete a document
 */
const deleteDocument = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { documentId } = req.params;
    const { hardDelete } = req.query; // Optional query param for hard delete
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    const document = await UserDocument.getById(parseInt(documentId));

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Permission check: Only admin, HR, operations manager, or the document owner can delete the document
    const normalizedRole = normalizeRole(currentUserRole);
    if (document.user_id !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own documents.'
      });
    }

    if (hardDelete === 'true') {
      // Hard delete: Remove from database and filesystem
      await UserDocument.hardDelete(parseInt(documentId));
      
      // Delete file from filesystem
      try {
        await fs.unlink(document.file_path);
      } catch (error) {
        console.warn('Could not delete file from filesystem:', error);
      }
    } else {
      // Soft delete: Just mark as inactive
      await UserDocument.delete(parseInt(documentId));
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

/**
 * Search documents
 */
const searchDocuments = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { userId } = req.params;
    const { search } = req.query;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    // Permission check: Only admin, HR, operations manager, or the user themselves can search documents
    const normalizedRole = normalizeRole(currentUserRole);
    if (parseInt(userId) !== currentUserId && normalizedRole !== 'admin' && normalizedRole !== 'hr' && normalizedRole !== 'operations manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only search your own documents.'
      });
    }

    if (!search || search.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const documents = await UserDocument.search(parseInt(userId), search.trim());

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search documents'
    });
  }
};

module.exports = {
  uploadDocument,
  getUserDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  searchDocuments
};
