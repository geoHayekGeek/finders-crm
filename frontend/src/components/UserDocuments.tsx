'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Edit2, 
  X, 
  Plus,
  File,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  User
} from 'lucide-react'
import { User as UserType, UserDocument } from '@/types/user'
import { userDocumentsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface UserDocumentsProps {
  user: UserType
  onClose: () => void
}

export function UserDocuments({ user, onClose }: UserDocumentsProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentLabel, setDocumentLabel] = useState('')
  const [documentNotes, setDocumentNotes] = useState('')
  
  // Edit state
  const [editingDocument, setEditingDocument] = useState<UserDocument | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [user.id])

  const loadDocuments = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await userDocumentsApi.getUserDocuments(user.id, token)
      
      if (response.success) {
        setDocuments(response.data)
      } else {
        showError('Failed to load documents')
      }
    } catch (error) {
      console.error('Error loading documents:', error)
      showError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB')
        return
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        showError('Invalid file type. Only PDF, Word, Excel, and images are allowed.')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !documentLabel.trim() || !token) {
      showError('Please select a file and provide a label')
      return
    }
    
    try {
      setUploading(true)
      
      const response = await userDocumentsApi.upload(
        user.id,
        {
          document: selectedFile,
          document_label: documentLabel.trim(),
          notes: documentNotes.trim() || undefined
        },
        token
      )
      
      if (response.success) {
        showSuccess('Document uploaded successfully')
        setShowUploadForm(false)
        setSelectedFile(null)
        setDocumentLabel('')
        setDocumentNotes('')
        loadDocuments()
      } else {
        showError('Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      showError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (document: UserDocument) => {
    setEditingDocument(document)
    setEditLabel(document.document_label)
    setEditNotes(document.notes || '')
  }

  const handleSaveEdit = async () => {
    if (!editingDocument || !editLabel.trim() || !token) {
      showError('Please provide a label')
      return
    }
    
    try {
      const response = await userDocumentsApi.update(
        editingDocument.id,
        {
          document_label: editLabel.trim(),
          notes: editNotes.trim() || undefined
        },
        token
      )
      
      if (response.success) {
        showSuccess('Document updated successfully')
        setEditingDocument(null)
        loadDocuments()
      } else {
        showError('Failed to update document')
      }
    } catch (error) {
      console.error('Error updating document:', error)
      showError('Failed to update document')
    }
  }

  const handleDelete = async (document: UserDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.document_label}"?`)) {
      return
    }
    
    if (!token) return
    
    try {
      const response = await userDocumentsApi.delete(document.id, false, token)
      
      if (response.success) {
        showSuccess('Document deleted successfully')
        loadDocuments()
      } else {
        showError('Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      showError('Failed to delete document')
    }
  }

  const handleDownload = (document: UserDocument) => {
    const url = userDocumentsApi.getDownloadUrl(document.id)
    window.open(url, '_blank')
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (fileType.includes('word')) return <FileText className="h-5 w-5 text-blue-500" />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    if (fileType.includes('image')) return <File className="h-5 w-5 text-purple-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Documents</h2>
              <p className="text-sm text-gray-600">{user.name} - {user.user_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Button */}
          {!showUploadForm && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="w-full mb-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-gray-600 hover:text-blue-600"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Upload New Document</span>
            </button>
          )}

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File *
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="w-full"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Label * 
                  </label>
                  <input
                    type="text"
                    value={documentLabel}
                    onChange={(e) => setDocumentLabel(e.target.value)}
                    placeholder="e.g., Employment Contract, ID Copy, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={documentNotes}
                    onChange={(e) => setDocumentNotes(e.target.value)}
                    placeholder="Additional notes about this document..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !documentLabel.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadForm(false)
                      setSelectedFile(null)
                      setDocumentLabel('')
                      setDocumentNotes('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Documents List */}
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {editingDocument?.id === document.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Document Label *
                        </label>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDocument(null)}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {getFileIcon(document.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 truncate">
                            {document.document_label}
                          </h4>
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {document.document_name}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(document.upload_date)}</span>
                            </span>
                            <span>{formatFileSize(document.file_size)}</span>
                            {document.uploaded_by_name && (
                              <span className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{document.uploaded_by_name}</span>
                              </span>
                            )}
                          </div>
                          {document.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              {document.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleDownload(document)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(document)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(document)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            Total documents: <span className="font-semibold">{documents.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
