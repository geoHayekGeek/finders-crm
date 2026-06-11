'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Plus, Search, Users, FileText, CalendarDays, UserCheck, Eye, Trash2 } from 'lucide-react'
import { RequireComplaintsAccess, usePermissions } from '@/contexts/PermissionContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { complaintsApi } from '@/utils/api'
import { Complaint } from '@/types/complaints'
import ComplaintModal from '@/components/complaints/ComplaintModal'
import ComplaintDetailsModal from '@/components/complaints/ComplaintDetailsModal'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { formatRole, getRoleColor } from '@/utils/roleFormatter'
import { normalizeRole } from '@/utils/roleUtils'

export default function ComplaintsPage() {
  const { token, isAuthenticated } = useAuth()
  const { canManageComplaints } = usePermissions()
  const { showSuccess, showError } = useToast()

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [targetRoleFilter, setTargetRoleFilter] = useState<'all' | 'agent' | 'team leader'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [complaintToDelete, setComplaintToDelete] = useState<Complaint | null>(null)
  const [deletingComplaint, setDeletingComplaint] = useState(false)
  const loadRequestRef = useRef(0)

  useEffect(() => {
    if (isAuthenticated && token) {
      void loadComplaints()
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    return () => {
      loadRequestRef.current += 1
    }
  }, [])

  async function loadComplaints() {
    if (!token) {
      setError('You must be logged in to view complaints')
      setLoading(false)
      return
    }

    const requestId = ++loadRequestRef.current

    try {
      setLoading(true)
      setError(null)

      const response = await complaintsApi.getAll({}, token)
      if (response.success && requestId === loadRequestRef.current) {
        setComplaints(response.data || [])
      } else if (requestId === loadRequestRef.current) {
        setError('Failed to load complaints')
      }
    } catch (loadError) {
      console.error('Error loading complaints:', loadError)
      if (requestId === loadRequestRef.current) {
        setError('Failed to load complaints. Please try again.')
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false)
      }
    }
  }

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint)
  }

  const handleRequestDeleteComplaint = (complaint: Complaint) => {
    setComplaintToDelete(complaint)
  }

  const handleDeleteComplaint = async () => {
    if (!token || !complaintToDelete) {
      return
    }

    try {
      setDeletingComplaint(true)
      const response = await complaintsApi.delete(complaintToDelete.id, token)

      if (response.success) {
        setComplaints((current) => current.filter((complaint) => complaint.id !== complaintToDelete.id))
        if (selectedComplaint?.id === complaintToDelete.id) {
          setSelectedComplaint(null)
        }
        setComplaintToDelete(null)
        showSuccess('Complaint deleted successfully')
      } else {
        showError(response.message || 'Failed to delete complaint')
      }
    } catch (deleteError) {
      console.error('Error deleting complaint:', deleteError)
      showError(deleteError instanceof Error ? deleteError.message : 'Failed to delete complaint')
    } finally {
      setDeletingComplaint(false)
    }
  }

  const filteredComplaints = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return complaints.filter((complaint) => {
      const targetRole = normalizeRole(complaint.target_user_role)
      const matchesSearch =
        !term ||
        complaint.title.toLowerCase().includes(term) ||
        complaint.description.toLowerCase().includes(term) ||
        (complaint.lead_name || '').toLowerCase().includes(term) ||
        (complaint.target_user_name || '').toLowerCase().includes(term) ||
        (complaint.created_by_name || '').toLowerCase().includes(term)

      const matchesTargetRole =
        targetRoleFilter === 'all' ||
        (targetRoleFilter === 'agent' && ['agent', 'consultant'].includes(targetRole)) ||
        (targetRoleFilter === 'team leader' && targetRole === 'team leader')

      return matchesSearch && matchesTargetRole
    })
  }, [complaints, searchTerm, targetRoleFilter])

  const stats = useMemo(() => {
    const agentLikeCount = complaints.filter((complaint) =>
      ['agent', 'consultant'].includes(normalizeRole(complaint.target_user_role))
    ).length
    const teamLeaderCount = complaints.filter((complaint) => normalizeRole(complaint.target_user_role) === 'team leader').length
    const today = new Date()

    const complaintsToday = complaints.filter((complaint) => {
      const createdAt = new Date(complaint.created_at)
      return createdAt.toDateString() === today.toDateString()
    }).length

    return {
      total: complaints.length,
      agentLikeCount,
      teamLeaderCount,
      complaintsToday
    }
  }, [complaints])

  return (
    <RequireComplaintsAccess>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
              <p className="text-gray-600">
                Track complaints linked to leads and the users they concern.
              </p>
            </div>
          </div>

          {canManageComplaints && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              Add Complaint
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Complaints</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Against Agents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.agentLikeCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <UserCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Against Team Leaders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.teamLeaderCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <CalendarDays className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Added Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.complaintsToday}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div
            className="flex flex-col gap-4 lg:grid lg:items-center"
            style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(220px, 0.8fr) auto' }}
          >
            <div className="input-with-icon relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search complaints by title, lead, target user, or creator"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <select
              value={targetRoleFilter}
              onChange={(e) => setTargetRoleFilter(e.target.value as 'all' | 'agent' | 'team leader')}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Targets</option>
              <option value="agent">Agents & Consultants</option>
              <option value="team leader">Team Leaders</option>
            </select>

            {(searchTerm || targetRoleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setTargetRoleFilter('all')
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 lg:justify-self-end"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
              <span className="ml-3 text-gray-600">Loading complaints...</span>
            </div>
          ) : error ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">Error Loading Complaints</h3>
              <p className="mb-4 text-gray-600">{error}</p>
              <button
                onClick={loadComplaints}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {complaints.length === 0 ? 'No complaints yet' : 'No complaints match your filters'}
              </h3>
              <p className="mb-4 text-gray-600">
                {complaints.length === 0
                  ? 'Create the first complaint to start tracking issues.'
                  : 'Try changing the search or target filter.'}
              </p>
              {canManageComplaints && complaints.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Add Complaint
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredComplaints.map((complaint) => {
                    const targetRole = normalizeRole(complaint.target_user_role)
                    return (
                      <tr key={complaint.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-xs">
                            <div className="font-medium text-gray-900">{complaint.title}</div>
                            <div className="mt-1 text-xs text-gray-500">Complaint #{complaint.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-xs">
                            <div className="font-medium text-gray-900">{complaint.lead_name || 'Unknown Lead'}</div>
                            <div className="text-sm text-gray-500">{complaint.lead_phone || 'No phone'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-xs">
                            <div className="font-medium text-gray-900">{complaint.target_user_name || 'Unknown User'}</div>
                            <div className="mt-1">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(targetRole)}`}>
                                {formatRole(complaint.target_user_role || '')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-xs">
                            <div className="font-medium text-gray-900">{complaint.created_by_name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-500">{formatRole(complaint.created_by_role || '')}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-md text-sm leading-6 text-gray-700">
                            {complaint.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500">
                          {new Date(complaint.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewComplaint(complaint)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            {canManageComplaints && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteComplaint(complaint)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ComplaintModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            void loadComplaints()
          }}
        />

        <ComplaintDetailsModal
          complaint={selectedComplaint}
          isOpen={selectedComplaint !== null}
          onClose={() => setSelectedComplaint(null)}
        />

        <ConfirmationModal
          isOpen={complaintToDelete !== null}
          onClose={() => {
            if (!deletingComplaint) {
              setComplaintToDelete(null)
            }
          }}
          onConfirm={handleDeleteComplaint}
          title="Delete Complaint"
          message={
            complaintToDelete
              ? `Are you sure you want to delete "${complaintToDelete.title}"? This action cannot be undone.`
              : 'Are you sure you want to delete this complaint? This action cannot be undone.'
          }
          confirmText="Delete Complaint"
          variant="danger"
          loading={deletingComplaint}
        />
      </div>
    </RequireComplaintsAccess>
  )
}
