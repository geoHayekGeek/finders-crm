'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, AlertCircle, RefreshCw, CalendarRange, Users, Download } from 'lucide-react'
import { reportsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { User } from '@/types/user'
import { normalizeRole } from '@/utils/roleUtils'

interface CreateTeamReportModalProps {
  onClose: () => void
  onSuccess: () => void
}

interface TeamReportFormState {
  team_leader_id?: number
  start_date: string
  end_date: string
}

export default function CreateTeamReportModal({ onClose, onSuccess }: CreateTeamReportModalProps) {
  const { token, user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [teamLeaders, setTeamLeaders] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const defaultStartDate = previousMonthStart.toISOString().split('T')[0]
  const defaultEndDate = previousMonthEnd.toISOString().split('T')[0]

  const normalizedRole = normalizeRole(user?.role)
  const lockedTeamLeaderId = normalizedRole === 'team leader' ? user?.id : undefined

  const [formData, setFormData] = useState<TeamReportFormState>({
    team_leader_id: lockedTeamLeaderId,
    start_date: defaultStartDate,
    end_date: defaultEndDate
  })

  useEffect(() => {
    if (token) {
      loadTeamLeaders()
    }
  }, [token])

  useEffect(() => {
    if (lockedTeamLeaderId) {
      setFormData(prev => prev.team_leader_id === lockedTeamLeaderId ? prev : { ...prev, team_leader_id: lockedTeamLeaderId })
    }
  }, [lockedTeamLeaderId])

  const loadTeamLeaders = async () => {
    if (!token) return

    try {
      const response = await usersApi.getAll(token)
      if (response.success) {
        setTeamLeaders(
          response.users.filter((u: User) => normalizeRole(u.role) === 'team leader')
        )
      }
    } catch (error) {
      // Team leaders list remains empty if loading fails
    }
  }

  const handleChange = (field: keyof TeamReportFormState, value: any) => {
    setFormData(prev => {
      if (field === 'start_date' && value && prev.end_date && value > prev.end_date) {
        return { ...prev, start_date: value, end_date: value }
      }
      if (field === 'end_date' && value && prev.start_date && value < prev.start_date) {
        return { ...prev, start_date: value, end_date: value }
      }
      return { ...prev, [field]: value }
    })
    setError(null)
  }

  const downloadExcel = async (reportId: number, teamName: string) => {
    const blob = await reportsApi.exportTeamToExcel(reportId, token)
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    const slug = `${teamName.replace(/\s+/g, '_')}_${formatter.format(start).replace(/[, ]/g, '-')}_to_${formatter.format(end).replace(/[, ]/g, '-')}`
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Team_Report_${slug}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.team_leader_id) {
      setError('Please select a team leader')
      return
    }

    if (!formData.start_date) {
      setError('Pick a start date for the report')
      return
    }

    if (!formData.end_date) {
      setError('Pick an end date for the report')
      return
    }

    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError('Make sure the date range is valid')
      return
    }

    if (endDate < startDate) {
      setError('End date cannot be before the start date')
      return
    }

    try {
      setLoading(true)
      const response = await reportsApi.createTeam(
        {
          team_leader_id: formData.team_leader_id!,
          start_date: formData.start_date,
          end_date: formData.end_date
        },
        token
      )

      if (response.success) {
        try {
          await downloadExcel(response.data.id, response.data.team_leader_name || 'Team')
          showSuccess('Team report created and downloaded successfully')
        } catch (downloadError) {
          showError('Team report was saved, but the Excel download failed. You can export it from the reports list.')
        }
        onSuccess()
      }
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        setError('A team report already exists for this team and date range. Please adjust the period.')
      } else {
        setError(error.message || 'Failed to create team report')
      }
      showError(error.message || 'Failed to create team report')
    } finally {
      setLoading(false)
    }
  }

  const rangePresets = useMemo(() => ([
    { label: 'Previous Month', start: defaultStartDate, end: defaultEndDate },
    { label: 'Month to Date', start: (() => {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}-01`
    })(), end: new Date().toISOString().split('T')[0] },
    { label: 'Last 30 Days', start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    { label: 'Quarter to Date', start: (() => {
      const d = new Date()
      const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3
      return new Date(d.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0]
    })(), end: new Date().toISOString().split('T')[0] }
  ]), [defaultStartDate, defaultEndDate])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Team Report</h2>
            <p className="text-sm text-gray-600 mt-1">Creates one summary workbook and a sheet for each agent in the team.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:border-blue-300 transition-colors">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Leader <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.team_leader_id || ''}
                  onChange={(e) => handleChange('team_leader_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={!!lockedTeamLeaderId}
                  className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100"
                >
                  <option value="">Select a team...</option>
                  {teamLeaders.map((teamLeader) => (
                    <option key={teamLeader.id} value={teamLeader.id}>
                      {teamLeader.name} {teamLeader.user_code ? `(${teamLeader.user_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2 bg-white rounded-lg border border-blue-200 p-4 shadow-sm hover:border-blue-400 transition-colors">
                <label className="block text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-blue-600" />
                  Reporting window <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs uppercase tracking-wide text-blue-500 font-semibold">
                      From
                    </span>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value || undefined)}
                      className="mt-5 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      max={formData.end_date || undefined}
                      required
                    />
                  </div>

                  <div className="hidden md:flex items-center justify-center text-blue-400 font-semibold">
                    -
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs uppercase tracking-wide text-blue-500 font-semibold">
                      To
                    </span>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value || undefined)}
                      className="mt-5 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      min={formData.start_date || undefined}
                      required
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {rangePresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => {
                        handleChange('start_date', preset.start)
                        handleChange('end_date', preset.end)
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">What gets created?</p>
                  <p className="text-sm text-blue-700 mt-1">
                    One saved team summary report plus one Excel sheet for each active agent in the selected team.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 min-w-[120px] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.team_leader_id}
              className="inline-flex items-center justify-center px-4 py-2 min-w-[150px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create & Download
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
