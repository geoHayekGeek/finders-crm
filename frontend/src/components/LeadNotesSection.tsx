'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, User, Calendar, Edit2, Save, X } from 'lucide-react'
import { LeadNote } from '@/types/leads'
import { normalizeRole } from '@/utils/roleUtils'

// Simple date formatting utility
function formatTimeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

interface LeadNotesSectionProps {
  notes: LeadNote[]
  canEdit: boolean
  currentUserId: number
  onSaveNote: (noteText: string) => Promise<void>
}

export function LeadNotesSection({ notes, canEdit, currentUserId, onSaveNote }: LeadNotesSectionProps) {
  // Auto-expand if user can edit and doesn't have a note yet (encourage adding notes)
  const myNote = notes.find(note => note.agent_id === currentUserId)
  const [isExpanded, setIsExpanded] = useState(canEdit && !myNote)
  const [isEditing, setIsEditing] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingNoteText, setPendingNoteText] = useState<string | null>(null)

  // Watch for notes changes
  useEffect(() => {
    console.log('📝 Notes changed:', notes.length, 'notes')
    
    // If we were saving and waiting for the note to appear, check if it's here now
    if (pendingNoteText !== null && saving) {
      const myLatestNote = notes.find(note => note.agent_id === currentUserId)
      // Check if the note text matches what we just saved (trim both for comparison)
      if (myLatestNote && myLatestNote.note_text.trim() === pendingNoteText.trim()) {
        console.log('✅ LeadNotesSection: Detected note update in props, closing edit mode')
        // Note successfully saved and received, close editing mode
        setIsEditing(false)
        setNoteText('')
        setSaving(false)
        setPendingNoteText(null)
        setIsExpanded(true) // Keep expanded to show the saved note
      }
    }
  }, [notes, currentUserId, pendingNoteText, saving])
  
  const visibleNotes = notes

  const handleStartEdit = () => {
    setNoteText(myNote?.note_text || '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!noteText.trim()) return
    
    setSaving(true)
    const trimmedNote = noteText.trim()
    
    try {
      console.log('💾 LeadNotesSection: Saving note...')
      // Store the note text we're saving so we can detect when it appears in props
      setPendingNoteText(trimmedNote)
      
      await onSaveNote(trimmedNote)
      console.log('✅ LeadNotesSection: Note saved to backend, waiting for refresh...')
      
      // Don't close editing mode here - let the useEffect close it when the note appears in props
      // This ensures the UI updates with the new note before closing
    } catch (error) {
      console.error('❌ LeadNotesSection: Failed to save note:', error)
      // Reset on error so user can retry
      setSaving(false)
      setPendingNoteText(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNoteText('')
    setPendingNoteText(null)
    setSaving(false)
  }

  const getRoleColor = (role?: string) => {
    const normalized = normalizeRole(role)
    switch (normalized) {
      case 'admin':
        return 'bg-red-100 text-red-700'
      case 'operations':
        return 'bg-blue-100 text-blue-700'
      case 'operations manager':
        return 'bg-purple-100 text-purple-700'
      case 'agent manager':
        return 'bg-amber-100 text-amber-700'
      case 'agent':
        return 'bg-green-100 text-green-700'
      case 'team leader':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-600" />
          <span className="font-medium text-gray-900">
            Agent Notes {visibleNotes.length > 0 && `(${visibleNotes.length})`}
          </span>
          {canEdit && !myNote && (
            <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full animate-pulse">
              Click to add note
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-3">
          {/* Edit/Add Note Section */}
          {canEdit && (
            <div className="pb-3 border-b border-gray-200">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter your note..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={saving}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !noteText.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit2 className="h-4 w-4" />
                  {myNote ? 'Edit My Note' : 'Add Note'}
                </button>
              )}
            </div>
          )}

          {/* Notes List */}
          {visibleNotes.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No notes yet
            </div>
          ) : (
            <div className="space-y-3">
              {visibleNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border ${
                    note.agent_id === currentUserId
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Note Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {note.agent_name || 'Unknown Agent'}
                      </span>
                      {note.agent_role && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(note.agent_role)}`}>
                          {note.agent_role.replace('_', ' ')}
                        </span>
                      )}
                      {note.agent_id === currentUserId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatTimeAgo(note.updated_at)}
                    </div>
                  </div>

                  {/* Note Content */}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

