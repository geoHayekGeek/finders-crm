/**
 * Multer config for property import: in-memory upload, field "file", 10MB limit, xlsx/csv only.
 */

const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'text/plain',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) return cb(new Error('No file or mimetype'));
  if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid file type. Use .xlsx or .csv'));
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

const singleFile = upload.single('file');

const propertyImportUpload = (req, res, next) => {
  singleFile(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }
    next();
  });
};

module.exports = propertyImportUpload;
