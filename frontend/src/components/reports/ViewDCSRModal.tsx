'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, RefreshCw, Users, Building2, Table } from 'lucide-react'
import { DCSRMonthlyReport } from '@/types/reports'
import { dcsrApi, usersApi, statusesApi, categoriesApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { User } from '@/types/user'
import { normalizeRole } from '@/utils/roleUtils'
import { Status, Category } from '@/types/property'

interface ViewDCSRModalProps {
  report: DCSRMonthlyReport
  onClose: () => void
  onSuccess?: () => void
}

export default function ViewDCSRModal({ report, onClose, onSuccess }: ViewDCSRModalProps) {
  const { token, user } = useAuth()
  const { showError } = useToast()
  const { role } = usePermissions()
  const router = useRouter()
  
  const normalizedRole = normalizeRole(role);
  const isTeamLeader = normalizedRole === 'team leader'

  const [activeTab, setActiveTab] = useState<'company' | 'team'>('company')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Team breakdown state
  const [teamLeaders, setTeamLeaders] = useState<User[]>([])
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<number | undefined>(undefined)
  const [teamBreakdownData, setTeamBreakdownData] = useState<any>(null)
  const [loadingTeamBreakdown, setLoadingTeamBreakdown] = useState(false)
  const [allTeamsBreakdown, setAllTeamsBreakdown] = useState<any>(null)
  const [showAllTeams, setShowAllTeams] = useState(false)
  
  // Detailed view state
  const [teamViewTab, setTeamViewTab] = useState<'overview' | 'detailed'>('overview')
  const [detailedViewTab, setDetailedViewTab] = useState<'properties' | 'leads' | 'viewings'>('properties')
  const [teamProperties, setTeamProperties] = useState<any[]>([])
  const [teamLeads, setTeamLeads] = useState<any[]>([])
  const [teamViewings, setTeamViewings] = useState<any[]>([])
  const [loadingDetailedData, setLoadingDetailedData] = useState(false)
  
  // Filters for detailed view
  const [propertyFilters, setPropertyFilters] = useState<{
    property_type?: string
    status_id?: number
    category_id?: number
    agent_id?: number
  }>({})
  const [leadFilters, setLeadFilters] = useState<{
    agent_id?: number
  }>({})
  const [viewingFilters, setViewingFilters] = useState<{
    status?: string
    agent_id?: number
  }>({})
  
  // Options for filters
  const [statuses, setStatuses] = useState<Status[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Helper function to format date to YYYY-MM-DD only
  const formatDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return ''
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // If it's a full ISO timestamp, extract just the date part
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toISOString().split('T')[0]
    } catch {
      return dateString
    }
  }

  // Get date range from report
  const startDate = report.start_date 
    ? formatDateOnly(report.start_date)
    : (report.year && report.month 
      ? new Date(Date.UTC(report.year, report.month - 1, 1)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0])
  const endDate = report.end_date
    ? formatDateOnly(report.end_date)
    : (report.year && report.month
      ? new Date(Date.UTC(report.year, report.month, 0)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0])

  const loadTeamLeaders = async () => {
    try {
      const response = await usersApi.getAll(token!)
      if (response.success) {
        const teamLeadersList = response.users.filter(
          (u: User) => normalizeRole(u.role) === 'team leader'
        )
        setTeamLeaders(teamLeadersList)
      }
    } catch (error: any) {
      // Error handled silently - team leaders list will remain empty
    }
  }

  const loadStatuses = async () => {
    try {
      const response = await statusesApi.getAll(token!)
      if (response.success) {
        setStatuses(response.data || [])
      }
    } catch (error) {
      // Error handled silently - statuses list will remain empty
    }
  }

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll(token!)
      if (response.success) {
        setCategories(response.data || [])
      }
    } catch (error) {
      // Error handled silently - categories list will remain empty
    }
  }

  // Load team leaders, statuses, and categories
  useEffect(() => {
    if (token) {
      loadTeamLeaders()
      loadStatuses()
      loadCategories()
      
      // If user is a team leader, automatically set their team leader ID and switch to team tab
      if (isTeamLeader && user?.id) {
        setSelectedTeamLeaderId(user.id)
        setActiveTab('team')
      }
    }
  }, [token, isTeamLeader, user])

  const loadTeamBreakdown = async () => {
    // For team leaders, use their user ID; otherwise use selectedTeamLeaderId
    const teamLeaderId = isTeamLeader && user?.id ? user.id : selectedTeamLeaderId
    
    if (!teamLeaderId || !startDate || !endDate) return
    
    try {
      setLoadingTeamBreakdown(true)
      setError(null)
      
      const response = await dcsrApi.getTeamBreakdown(
        teamLeaderId,
        startDate,
        endDate,
        token
      )
      
      if (response.success) {
        setTeamBreakdownData(response.data)
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load team breakdown')
    } finally {
      setLoadingTeamBreakdown(false)
    }
  }

  const loadAllTeamsBreakdown = async () => {
    if (!startDate || !endDate) return
    
    // Team leaders cannot see all teams breakdown
    if (isTeamLeader) {
      setError('Access denied. Team leaders can only view their own team breakdown.')
      return
    }
    
    try {
      setLoadingTeamBreakdown(true)
      setError(null)
      
      const response = await dcsrApi.getAllTeamsBreakdown(
        startDate,
        endDate,
        token
      )
      
      if (response.success) {
        setAllTeamsBreakdown(response.data)
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load teams breakdown')
    } finally {
      setLoadingTeamBreakdown(false)
    }
  }

  const loadDetailedData = async () => {
    // For team leaders, use their user ID; otherwise use selectedTeamLeaderId
    const teamLeaderId = isTeamLeader && user?.id ? user.id : selectedTeamLeaderId
    
    if (!teamLeaderId || !startDate || !endDate) return
    
    try {
      setLoadingDetailedData(true)
      setError(null)
      
      if (detailedViewTab === 'properties') {
        const response = await dcsrApi.getTeamProperties(
          teamLeaderId,
          startDate,
          endDate,
          propertyFilters,
          token
        )
        if (response.success) {
          setTeamProperties(response.data)
        }
      } else if (detailedViewTab === 'leads') {
        const response = await dcsrApi.getTeamLeads(
          teamLeaderId,
          startDate,
          endDate,
          leadFilters,
          token
        )
        if (response.success) {
          setTeamLeads(response.data)
        }
      } else if (detailedViewTab === 'viewings') {
        const response = await dcsrApi.getTeamViewings(
          teamLeaderId,
          startDate,
          endDate,
          viewingFilters,
          token
        )
        if (response.success) {
          setTeamViewings(response.data)
        }
      }
    } catch (error: any) {
      console.error('Error loading detailed data:', error)
      setError(error.message || 'Failed to load detailed data')
    } finally {
      setLoadingDetailedData(false)
    }
  }

  // Load team breakdown when team leader or dates change
  useEffect(() => {
    if (activeTab === 'team' && startDate && endDate && token) {
      // For team leaders, automatically load their team breakdown
      if (isTeamLeader && user?.id && !showAllTeams) {
        if (teamViewTab === 'overview') {
          loadTeamBreakdown()
        } else if (teamViewTab === 'detailed') {
          loadDetailedData()
        }
      } else if (showAllTeams && !isTeamLeader) {
        // Non-team leaders can see all teams
        loadAllTeamsBreakdown()
      } else if (selectedTeamLeaderId && !isTeamLeader) {
        // Non-team leaders viewing a specific team
        if (teamViewTab === 'overview') {
          loadTeamBreakdown()
        } else if (teamViewTab === 'detailed') {
          loadDetailedData()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamLeaderId, startDate, endDate, token, activeTab, showAllTeams, teamViewTab, propertyFilters, leadFilters, viewingFilters, detailedViewTab, isTeamLeader, user])

  const formatRangeDisplay = () => {
    if (report.start_date && report.end_date) {
      const start = new Date(report.start_date)
      const end = new Date(report.end_date)
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      return `${formatter.format(start)} → ${formatter.format(end)}`
    } else if (report.year && report.month) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[report.month - 1]} ${report.year}`
    }
    return 'Date range not specified'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200  sticky top-0 bg-white z-1 sticky top-0 bg-white rounded-t-lg z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">View DCSR Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatRangeDisplay()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('company')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'company'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company-wide
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Breakdown
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Date Range Display */}
          <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wider">
              Reporting Window
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="px-3 py-2 border border-blue-200 rounded-lg bg-white text-gray-900">
                {startDate}
              </div>
              <div className="hidden md:flex items-center justify-center text-blue-400 font-semibold">
                —
              </div>
              <div className="px-3 py-2 border border-blue-200 rounded-lg bg-white text-gray-900">
                {endDate}
              </div>
            </div>
          </div>

          {/* Team Leader Selection (Team Breakdown Tab) */}
          {activeTab === 'team' && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              {!isTeamLeader && (
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-medium text-gray-700">
                    View Options
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllTeams(true)
                        setSelectedTeamLeaderId(undefined)
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        showAllTeams
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Teams Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllTeams(false)
                        setSelectedTeamLeaderId(undefined)
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        !showAllTeams
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Single Team
                    </button>
                  </div>
                </div>
              )}
              
              {!showAllTeams && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isTeamLeader ? 'Your Team' : 'Select Team Leader'}
                  </label>
                  {isTeamLeader ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                      {user?.name} {(user as any)?.user_code ? `(${(user as any).user_code})` : ''}
                    </div>
                  ) : (
                    <select
                      value={selectedTeamLeaderId || ''}
                      onChange={(e) => setSelectedTeamLeaderId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">Choose a team leader...</option>
                      {teamLeaders.map((leader) => (
                        <option key={leader.id} value={leader.id}>
                          {leader.name} {leader.user_code ? `(${leader.user_code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {(loading || loadingTeamBreakdown) && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">
                {activeTab === 'company' 
                  ? 'Loading report data...'
                  : 'Loading team breakdown...'}
              </span>
            </div>
          )}

          {/* Company-wide View */}
          {activeTab === 'company' && !loading && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Calculated Values
                </h3>

                {/* Description (Data & Calls) */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Description</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Listings
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={report.listings_count}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Leads
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={report.leads_count}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Closures */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Closures</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sales
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={report.sales_count}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rent
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={report.rent_count}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Viewings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Viewings
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={report.viewings_count}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* All Teams Summary Display */}
          {activeTab === 'team' && showAllTeams && allTeamsBreakdown && !loadingTeamBreakdown && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border border-indigo-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-indigo-900 mb-4 uppercase tracking-wider">
                  All Teams Summary ({allTeamsBreakdown.total_teams} teams)
                </h3>
                
                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {allTeamsBreakdown.teams.map((team: any) => (
                    <div key={team.team_leader_id} className="bg-white border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-indigo-900">
                          {team.team_leader_name} {team.team_leader_code ? `(${team.team_leader_code})` : ''}
                        </h4>
                        <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                          {team.team_members.length} members
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Listings:</span>
                          <span className="font-semibold text-blue-900 ml-1">{team.listings_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Leads:</span>
                          <span className="font-semibold text-blue-900 ml-1">{team.leads_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sales:</span>
                          <span className="font-semibold text-green-900 ml-1">{team.sales_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rent:</span>
                          <span className="font-semibold text-green-900 ml-1">{team.rent_count}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Viewings:</span>
                          <span className="font-semibold text-purple-900 ml-1">{team.viewings_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unassigned Section */}
                {allTeamsBreakdown.unassigned_listings > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-yellow-900">
                        ⚠️ Unassigned Listings
                      </h4>
                      <span className="text-lg font-bold text-yellow-900">
                        {allTeamsBreakdown.unassigned_listings}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700">
                      These listings are not assigned to any team (NULL agent_id or assigned to agents not in any team).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Single Team Breakdown Display */}
          {activeTab === 'team' && !showAllTeams && selectedTeamLeaderId && (
            <div className="space-y-4">
              {/* Sub-tabs for Overview and Detailed View */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Team View Tabs">
                  <button
                    type="button"
                    onClick={() => setTeamViewTab('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      teamViewTab === 'overview'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamViewTab('detailed')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      teamViewTab === 'detailed'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      Detailed View
                    </div>
                  </button>
                </nav>
              </div>

              {/* Overview Tab */}
              {teamViewTab === 'overview' && teamBreakdownData && !loadingTeamBreakdown && (
                <div className="bg-gradient-to-r from-purple-50 via-white to-purple-50 border border-purple-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-purple-900 mb-4 uppercase tracking-wider">
                    Team: {teamBreakdownData.team_leader_name} {teamBreakdownData.team_leader_code ? `(${teamBreakdownData.team_leader_code})` : ''}
                  </h3>

                {/* Team Members */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Team Members ({teamBreakdownData.team_members.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {teamBreakdownData.team_members.map((member: any) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {member.name} {member.user_code ? `(${member.user_code})` : ''}
                        {normalizeRole(member.role) === 'team leader' && ' [TL]'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description (Data & Calls) */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Description</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        setTeamViewTab('detailed')
                        setDetailedViewTab('properties')
                      }}
                    >
                      <div className="text-xs font-medium text-blue-700 mb-1">Listings</div>
                      <div className="text-2xl font-bold text-blue-900">{teamBreakdownData.listings_count}</div>
                      <div className="text-xs text-blue-600 mt-1">Properties assigned to team members</div>
                    </div>
                    <div 
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        setTeamViewTab('detailed')
                        setDetailedViewTab('leads')
                      }}
                    >
                      <div className="text-xs font-medium text-blue-700 mb-1">Leads</div>
                      <div className="text-2xl font-bold text-blue-900">{teamBreakdownData.leads_count}</div>
                      <div className="text-xs text-blue-600 mt-1">Leads assigned to team members</div>
                    </div>
                  </div>
                </div>

                {/* Closures */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Closures</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => {
                        setTeamViewTab('detailed')
                        setDetailedViewTab('properties')
                        setPropertyFilters({ property_type: 'sale' })
                      }}
                    >
                      <div className="text-xs font-medium text-green-700 mb-1">Sales</div>
                      <div className="text-2xl font-bold text-green-900">{teamBreakdownData.sales_count}</div>
                      <div className="text-xs text-green-600 mt-1">Sales closed by team members</div>
                    </div>
                    <div 
                      className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => {
                        setTeamViewTab('detailed')
                        setDetailedViewTab('properties')
                        setPropertyFilters({ property_type: 'rent' })
                      }}
                    >
                      <div className="text-xs font-medium text-green-700 mb-1">Rent</div>
                      <div className="text-2xl font-bold text-green-900">{teamBreakdownData.rent_count}</div>
                      <div className="text-xs text-green-600 mt-1">Rentals closed by team members</div>
                    </div>
                  </div>
                </div>

                {/* Viewings */}
                <div>
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">Viewings</h4>
                  <div 
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => {
                      setTeamViewTab('detailed')
                      setDetailedViewTab('viewings')
                    }}
                  >
                    <div className="text-xs font-medium text-purple-700 mb-1">Total Viewings</div>
                    <div className="text-2xl font-bold text-purple-900">{teamBreakdownData.viewings_count}</div>
                    <div className="text-xs text-purple-600 mt-1">Viewings conducted by team members</div>
                  </div>
                </div>
              </div>
            )}

              {/* Detailed View Tab - Same as CreateDCSRModal */}
              {teamViewTab === 'detailed' && (
                <div className="space-y-4">
                  {showAllTeams ? (
                    <DCSRAgentBreakdownTable
                      title={`All Teams Agent Breakdown (${allTeamsBreakdown?.total_teams || 0} teams)`}
                      subtitle="Listings are data and leads are calls. Each team is grouped with one row per agent."
                      teams={allTeamsBreakdown?.teams || []}
                      unassignedListings={allTeamsBreakdown?.unassigned_listings}
                    />
                  ) : selectedTeamLeaderId && teamBreakdownData ? (
                    <DCSRAgentBreakdownTable
                      title={`Team Agent Breakdown: ${teamBreakdownData.team_leader_name}${teamBreakdownData.team_leader_code ? ` (${teamBreakdownData.team_leader_code})` : ''}`}
                      subtitle="Listings are data and leads are calls. Each team member is shown with their own numbers."
                      teams={[teamBreakdownData]}
                    />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Info Messages */}
          {activeTab === 'team' && !teamBreakdownData && !allTeamsBreakdown && !loadingTeamBreakdown && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-purple-700">
                    {showAllTeams
                      ? 'Click "All Teams Summary" to view all teams breakdown with unassigned listings.'
                      : 'Select a team leader or click "All Teams Summary" to view team breakdown data.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
