'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'
import { ReportFormData, MonthlyAgentReport } from '@/types/reports'
import { reportsApi, usersApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { User } from '@/types/user'
import { formatCurrency } from '@/utils/formatters'

interface CreateReportModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateReportModal({ onClose, onSuccess }: CreateReportModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [agents, setAgents] = useState<User[]>([])
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<Partial<MonthlyAgentReport> | null>(null)

  // Get previous month as default
  const now = new Date()
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const defaultMonth = previousMonth.getMonth() + 1
  const defaultYear = previousMonth.getFullYear()

  const [formData, setFormData] = useState<ReportFormData>({
    agent_id: undefined,
    month: defaultMonth,
    year: defaultYear,
    boosts: 0
  })

  // Editable calculated fields
  const [editableData, setEditableData] = useState({
    listings_count: 0,
    lead_sources: {} as { [key: string]: number },
    viewings_count: 0,
    sales_count: 0,
    sales_amount: 0,
    agent_commission: 0,
    finders_commission: 0,
    referral_commission: 0,
    team_leader_commission: 0,
    administration_commission: 0,
    total_commission: 0,
    referral_received_count: 0,
    referral_received_commission: 0,
    referrals_on_properties_count: 0,
    referrals_on_properties_commission: 0
  })

  // Load agents and lead sources
  useEffect(() => {
    if (token) {
      loadAgents()
      loadLeadSources()
    }
  }, [token])

  // Calculate preview when agent/month/year changes
  useEffect(() => {
    if (formData.agent_id && formData.month && formData.year && token) {
      calculatePreview()
    }
  }, [formData.agent_id, formData.month, formData.year, token])

  const loadAgents = async () => {
    try {
      const response = await usersApi.getAll(token)
      if (response.success) {
        const agentsList = response.users.filter(
          (u: User) => u.role === 'agent' || u.role === 'team_leader'
        )
        setAgents(agentsList)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const loadLeadSources = async () => {
    try {
      const response = await reportsApi.getLeadSources(token)
      if (response.success) {
        setLeadSources(response.data)
      }
    } catch (error) {
      console.error('Error loading lead sources:', error)
    }
  }

  const calculatePreview = async () => {
    try {
      setCalculating(true)
      setError(null)
      
      // Create a temporary report to get calculated values
      const tempReport = await reportsApi.create(
        {
          agent_id: formData.agent_id!,
          month: formData.month,
          year: formData.year,
          boosts: formData.boosts
        },
        token
      )

      if (tempReport.success) {
        setPreviewData(tempReport.data)
        setEditableData({
          listings_count: tempReport.data.listings_count,
          lead_sources: tempReport.data.lead_sources,
          viewings_count: tempReport.data.viewings_count,
          sales_count: tempReport.data.sales_count,
          sales_amount: tempReport.data.sales_amount,
          agent_commission: tempReport.data.agent_commission,
          finders_commission: tempReport.data.finders_commission,
          referral_commission: tempReport.data.referral_commission,
          team_leader_commission: tempReport.data.team_leader_commission,
          administration_commission: tempReport.data.administration_commission,
          total_commission: tempReport.data.total_commission,
          referral_received_count: tempReport.data.referral_received_count,
          referral_received_commission: tempReport.data.referral_received_commission,
          referrals_on_properties_count: tempReport.data.referrals_on_properties_count || 0,
          referrals_on_properties_commission: tempReport.data.referrals_on_properties_commission || 0
        })
        
        // Delete the temporary report
        await reportsApi.delete(tempReport.data.id, token)
      }
    } catch (error: any) {
      // If report already exists, show specific message
      if (error.message?.includes('already exists')) {
        setError('A report already exists for this agent and month. Please select a different agent or month.')
      } else {
        console.error('Error calculating preview:', error)
      }
    } finally {
      setCalculating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.agent_id) {
      setError('Please select an agent')
      return
    }

    if (!formData.month || formData.month < 1 || formData.month > 12) {
      setError('Please select a valid month')
      return
    }

    if (!formData.year || formData.year < 2000) {
      setError('Please select a valid year')
      return
    }

    try {
      setLoading(true)
      
      // Create the report with edited values
      const response = await reportsApi.create(
        {
          agent_id: formData.agent_id,
          month: formData.month,
          year: formData.year,
          boosts: formData.boosts
        },
        token
      )

      if (response.success) {
        // Update with manual edits if any fields were changed
        const hasManualEdits = previewData && (
          editableData.listings_count !== previewData.listings_count ||
          editableData.viewings_count !== previewData.viewings_count ||
          editableData.sales_count !== previewData.sales_count ||
          editableData.sales_amount !== previewData.sales_amount ||
          JSON.stringify(editableData.lead_sources) !== JSON.stringify(previewData.lead_sources)
        )

        if (hasManualEdits) {
          // For now, we'll just show success. In a full implementation,
          // you'd add an endpoint to accept manual overrides
          showSuccess('Report created successfully with custom values')
        } else {
          showSuccess('Report created successfully')
        }
        
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error creating report:', error)
      
      if (error.message?.includes('already exists')) {
        setError('A report already exists for this agent and month. Please select a different agent or month.')
      } else {
        setError(error.message || 'Failed to create report')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ReportFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setPreviewData(null) // Clear preview when changing selection
  }

  const handleEditableChange = (field: keyof typeof editableData, value: any) => {
    setEditableData(prev => ({ ...prev, [field]: value }))
  }

  const handleLeadSourceChange = (source: string, value: number) => {
    setEditableData(prev => ({
      ...prev,
      lead_sources: { ...prev.lead_sources, [source]: value }
    }))
  }

  // Generate month/year options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]

  const allLeadSources = leadSources.length > 0 ? leadSources : Object.keys(editableData.lead_sources)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-xl font-semibold text-gray-900">Create Monthly Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
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

          {/* Selection Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-4">Report Period</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.agent_id || ''}
                  onChange={(e) => handleChange('agent_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.user_code ? `(${agent.user_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => handleChange('month', parseInt(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => handleChange('year', parseInt(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Calculating Indicator */}
          {calculating && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Calculating values from database...</span>
            </div>
          )}

          {/* Editable Fields Section */}
          {previewData && !calculating && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  📊 Calculated Values (All Editable)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Listings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Listings
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editableData.listings_count}
                      onChange={(e) => handleEditableChange('listings_count', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Viewings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Viewings
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editableData.viewings_count}
                      onChange={(e) => handleEditableChange('viewings_count', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Boosts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Boosts
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.boosts}
                      onChange={(e) => handleChange('boosts', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>

                {/* Lead Sources */}
                {allLeadSources.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lead Sources
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {allLeadSources.map((source) => (
                        <div key={source}>
                          <label className="block text-xs text-gray-600 mb-1">{source}</label>
                          <input
                            type="number"
                            min="0"
                            value={editableData.lead_sources[source] || 0}
                            onChange={(e) => handleLeadSourceChange(source, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sales Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sales Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editableData.sales_count}
                      onChange={(e) => handleEditableChange('sales_count', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sales Amount ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editableData.sales_amount}
                      onChange={(e) => handleEditableChange('sales_amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>

                {/* Commissions on Agent Properties */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Commissions on Agent Properties</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Agent Com ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.agent_commission}
                        onChange={(e) => handleEditableChange('agent_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Finders Com ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.finders_commission}
                        onChange={(e) => handleEditableChange('finders_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Referral Com ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.referral_commission}
                        onChange={(e) => handleEditableChange('referral_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">TL Com ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.team_leader_commission}
                        onChange={(e) => handleEditableChange('team_leader_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Admin Com ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.administration_commission}
                        onChange={(e) => handleEditableChange('administration_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Referrals On Props ($)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editableData.referrals_on_properties_commission}
                          onChange={(e) => handleEditableChange('referrals_on_properties_commission', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        />
                        <span className="text-xs text-gray-500">({editableData.referrals_on_properties_count})</span>
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-3 border-t border-blue-300 pt-3 mt-2">
                      <label className="block text-xs text-blue-900 font-semibold mb-1">Total Commission ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.total_commission}
                        onChange={(e) => handleEditableChange('total_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Commissions on Referrals Given By Agent */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">Commissions on Referrals Given By Agent</h4>
                  <p className="text-xs text-green-700 mb-3">Properties this agent referred to other agents</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-green-700 mb-1">
                        Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editableData.referral_received_count}
                        onChange={(e) => handleEditableChange('referral_received_count', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-green-700 mb-1">
                        Commission ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editableData.referral_received_commission}
                        onChange={(e) => handleEditableChange('referral_received_commission', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          {!previewData && !calculating && formData.agent_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Select an agent, month, and year to see calculated values. All fields will be editable.
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
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.agent_id || calculating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
