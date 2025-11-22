// __tests__/middlewares/fileUpload.test.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mock fs first
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Mock multer
const mockSingle = jest.fn();
const mockArray = jest.fn();
const mockMulterInstance = {
  single: jest.fn(() => mockSingle),
  array: jest.fn(() => mockArray)
};

jest.mock('multer', () => {
  const mockMulter = jest.fn(() => mockMulterInstance);
  mockMulter.diskStorage = jest.fn();
  mockMulter.MulterError = class MulterError extends Error {
    constructor(code) {
      super();
      this.code = code;
    }
  };
  return mockMulter;
});

describe('File Upload Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      file: null,
      files: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('uploadSingle', () => {
    it('should be defined', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      expect(fileUpload.uploadSingle).toBeDefined();
    });

    it('should be a multer middleware', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      expect(typeof fileUpload.uploadSingle).toBe('function');
    });
  });

  describe('uploadMultiple', () => {
    it('should be defined', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      expect(fileUpload.uploadMultiple).toBeDefined();
    });

    it('should be a multer middleware', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      expect(typeof fileUpload.uploadMultiple).toBe('function');
    });
  });

  describe('handleUploadError', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      const error = new multer.MulterError('LIMIT_FILE_SIZE');
      error.code = 'LIMIT_FILE_SIZE';

      fileUpload.handleUploadError(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'File too large. Maximum size is 5MB.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      const error = new multer.MulterError('LIMIT_FILE_COUNT');
      error.code = 'LIMIT_FILE_COUNT';

      fileUpload.handleUploadError(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Too many files. Maximum is 10 files.'
      });
    });

    it('should handle other MulterError errors', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      const error = new multer.MulterError('UNKNOWN_ERROR');
      error.code = 'UNKNOWN_ERROR';
      error.message = 'Unknown error';

      fileUpload.handleUploadError(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'File upload error: Unknown error'
      });
    });

    it('should handle invalid file type error', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      const error = new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');

      fileUpload.handleUploadError(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      });
    });

    it('should pass through other errors', () => {
      const fileUpload = require('../../middlewares/fileUpload');
      const error = new Error('Other error');

      fileUpload.handleUploadError(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

