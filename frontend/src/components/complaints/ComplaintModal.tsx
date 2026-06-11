'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, FileText, Search, Save, Users, X } from 'lucide-react'
import { Lead } from '@/types/leads'
import { User as AppUser } from '@/types/user'
import { CreateComplaintFormData } from '@/types/complaints'
import { leadsApi, complaintsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatRole, getRoleColor } from '@/utils/roleFormatter'
import { normalizeRole } from '@/utils/roleUtils'

interface ComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ComplaintModal({ isOpen, onClose, onSuccess }: ComplaintModalProps) {
  const { token, user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [leadSearch, setLeadSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')
  const [leadLoading, setLeadLoading] = useState(false)
  const [targetLoading, setTargetLoading] = useState(false)
  const [leadResults, setLeadResults] = useState<Lead[]>([])
  const [targetUsers, setTargetUsers] = useState<AppUser[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedTargetUser, setSelectedTargetUser] = useState<AppUser | null>(null)
  const leadRequestRef = useRef(0)
  const targetRequestRef = useRef(0)

  const [formData, setFormData] = useState<CreateComplaintFormData>({
    lead_id: 0,
    target_user_id: 0,
    title: '',
    description: ''
  })

  const normalizedRole = normalizeRole(user?.role)
  const canUseTeamLeaderScope = normalizedRole === 'team leader'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    leadRequestRef.current += 1
    targetRequestRef.current += 1
    setError(null)
    setValidationErrors({})
    setLeadSearch('')
    setTargetSearch('')
    setLeadResults([])
    setTargetUsers([])
    setSelectedLead(null)
    setSelectedTargetUser(null)
    setFormData({
      lead_id: 0,
      target_user_id: 0,
      title: '',
      description: ''
    })
  }, [isOpen])

  useEffect(() => {
    return () => {
      leadRequestRef.current += 1
      targetRequestRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !token) return

    const timeoutId = window.setTimeout(() => {
      void loadLeads(leadSearch)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen, token, leadSearch])

  useEffect(() => {
    if (!isOpen || !token || !user?.id) return
    void loadTargetUsers()
  }, [isOpen, token, user?.id, user?.role])

  async function loadLeads(query: string) {
    if (!token) return

    const requestId = ++leadRequestRef.current

    try {
      setLeadLoading(true)
      const filters = query.trim() ? { search: query.trim() } : {}
      const response = await leadsApi.getWithFilters(filters, token, { page: 1, limit: 20 })
      if (response.success && requestId === leadRequestRef.current) {
        setLeadResults(response.data || [])
      }
    } catch (loadError) {
      console.error('Error loading leads for complaint modal:', loadError)
    } finally {
      if (requestId === leadRequestRef.current) {
        setLeadLoading(false)
      }
    }
  }

  async function loadTargetUsers() {
    if (!token || !user?.id) return

    const requestId = ++targetRequestRef.current

    try {
      setTargetLoading(true)

      let users: AppUser[] = []
      if (canUseTeamLeaderScope) {
        const response = await usersApi.getTeamLeaderAgents(user.id, token)
        users = response.success ? (response.agents as AppUser[]) : []
      } else {
        const response = await usersApi.getAgents(token)
        users = response.success ? (response.agents as AppUser[]) : []
      }

      const filteredUsers = users.filter((candidate) => {
        const candidateRole = normalizeRole(candidate.role)
        return ['agent', 'consultant', 'team leader'].includes(candidateRole)
      })

      filteredUsers.sort((a, b) => {
        const roleOrder = (role: string) => {
          const normalized = normalizeRole(role)
          if (normalized === 'team leader') return 0
          if (normalized === 'consultant') return 1
          return 2
        }

        const roleDiff = roleOrder(a.role) - roleOrder(b.role)
        if (roleDiff !== 0) return roleDiff
        return a.name.localeCompare(b.name)
      })

      if (requestId === targetRequestRef.current) {
        setTargetUsers(filteredUsers)
      }
    } catch (loadError) {
      console.error('Error loading target users for complaints:', loadError)
    } finally {
      if (requestId === targetRequestRef.current) {
        setTargetLoading(false)
      }
    }
  }

  const filteredTargetUsers = useMemo(() => {
    const term = targetSearch.trim().toLowerCase()
    if (!term) return targetUsers

    return targetUsers.filter((candidate) => {
      const roleLabel = formatRole(candidate.role).toLowerCase()
      return (
        candidate.name.toLowerCase().includes(term) ||
        candidate.email.toLowerCase().includes(term) ||
        roleLabel.includes(term) ||
        (candidate.user_code || '').toLowerCase().includes(term)
      )
    })
  }, [targetSearch, targetUsers])

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!selectedLead?.id) nextErrors.lead_id = 'Please select a lead'
    if (!selectedTargetUser?.id) nextErrors.target_user_id = 'Please select the person the complaint is about'
    if (!formData.title.trim()) nextErrors.title = 'Title is required'
    if (!formData.description.trim()) nextErrors.description = 'Description is required'

    setValidationErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !token || !selectedLead || !selectedTargetUser) {
      showError('Please fill in all required fields before submitting')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await complaintsApi.create(
        {
          lead_id: selectedLead.id,
          target_user_id: selectedTargetUser.id,
          title: formData.title.trim(),
          description: formData.description.trim()
        },
        token
      )

      if (response.success) {
        showSuccess('Complaint created successfully')
        onSuccess()
        onClose()
      } else {
        const errorMessage = response.message || 'Failed to create complaint'
        setError(errorMessage)
        showError(errorMessage)
      }
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'Failed to create complaint'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative z-[101] flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="flex-shrink-0 border-b border-gray-200 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Add Complaint</h3>
                  <p className="text-sm text-gray-600">
                    Link a complaint to a lead and the person it concerns.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-900">Lead</h4>
              </div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search by lead name or phone"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-red-500 ${
                    validationErrors.lead_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>

              {validationErrors.lead_id && (
                <p className="mb-2 text-sm text-red-600">{validationErrors.lead_id}</p>
              )}

              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                {leadLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-600">
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    Loading leads...
                  </div>
                ) : leadResults.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No leads found. Try a different search term.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {leadResults.map((lead) => {
                      const isSelected = selectedLead?.id === lead.id
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(lead)
                            setFormData((prev) => ({ ...prev, lead_id: lead.id }))
                            setValidationErrors((prev) => ({ ...prev, lead_id: '' }))
                          }}
                          className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 ${
                            isSelected ? 'bg-red-50' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-gray-900">{lead.customer_name}</p>
                              {lead.lead_role && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                  {lead.lead_role}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-gray-500">
                              {lead.phone_number || 'No phone'} - Lead #{lead.id}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                              Selected
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {selectedLead && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-red-900">{selectedLead.customer_name}</p>
                      <p className="text-xs text-red-700">
                        {selectedLead.phone_number || 'No phone'} - Lead #{selectedLead.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLead(null)
                        setFormData((prev) => ({ ...prev, lead_id: 0 }))
                        setValidationErrors((prev) => ({ ...prev, lead_id: '' }))
                      }}
                      className="text-xs font-medium text-red-700 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-900">Target user</h4>
              </div>

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Search agent, consultant, or team leader"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-red-500 ${
                    validationErrors.target_user_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>

              {validationErrors.target_user_id && (
                <p className="mb-2 text-sm text-red-600">{validationErrors.target_user_id}</p>
              )}

              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                {targetLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-600">
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    Loading users...
                  </div>
                ) : filteredTargetUsers.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No matching users found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredTargetUsers.map((candidate) => {
                      const isSelected = selectedTargetUser?.id === candidate.id
                      const roleLabel = formatRole(candidate.role)
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => {
                            setSelectedTargetUser(candidate)
                            setFormData((prev) => ({ ...prev, target_user_id: candidate.id }))
                            setValidationErrors((prev) => ({ ...prev, target_user_id: '' }))
                          }}
                          className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 ${
                            isSelected ? 'bg-red-50' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{candidate.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>{candidate.email}</span>
                              {candidate.user_code && <span>- {candidate.user_code}</span>}
                            </div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getRoleColor(candidate.role)}`}>
                            {roleLabel}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {selectedTargetUser && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-red-900">{selectedTargetUser.name}</p>
                      <p className="text-xs text-red-700">
                        {formatRole(selectedTargetUser.role)} - {selectedTargetUser.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetUser(null)
                        setFormData((prev) => ({ ...prev, target_user_id: 0 }))
                        setValidationErrors((prev) => ({ ...prev, target_user_id: '' }))
                      }}
                      className="text-xs font-medium text-red-700 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Complaint title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                      setValidationErrors((prev) => ({ ...prev, title: '' }))
                    }}
                    placeholder="Short title for the complaint"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-red-500 ${
                      validationErrors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                      setValidationErrors((prev) => ({ ...prev, description: '' }))
                    }}
                    rows={5}
                    placeholder="Write the full complaint details"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-red-500 ${
                      validationErrors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Complaints are visible to operations, HR, admin, and team leaders according to their access.
              Team leaders can only file complaints against their own team members.
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Create Complaint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
