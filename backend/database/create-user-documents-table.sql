-- Create user_documents table for storing employee documents
-- This table stores metadata about uploaded documents (contracts, legal docs, etc.)
-- Actual files are stored in the filesystem

CREATE TABLE IF NOT EXISTS user_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_label VARCHAR(255) NOT NULL, -- User-friendly label for the document
  file_path VARCHAR(500) NOT NULL, -- Path to the file in filesystem
  file_type VARCHAR(100), -- MIME type (e.g., 'application/pdf', 'application/msword')
  file_size INTEGER, -- File size in bytes
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Who uploaded this
  notes TEXT, -- Optional notes about the document
  is_active BOOLEAN DEFAULT TRUE, -- Soft delete flag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_active ON user_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_user_documents_upload_date ON user_documents(upload_date);

-- Add comments for documentation
COMMENT ON TABLE user_documents IS 'Stores metadata for user/employee documents (contracts, legal files, etc.)';
COMMENT ON COLUMN user_documents.document_name IS 'Original filename of the uploaded document';
COMMENT ON COLUMN user_documents.document_label IS 'User-friendly label/description for the document';
COMMENT ON COLUMN user_documents.file_path IS 'Relative path to the file in the filesystem';
COMMENT ON COLUMN user_documents.file_type IS 'MIME type of the document';
COMMENT ON COLUMN user_documents.uploaded_by IS 'User ID of who uploaded this document';
