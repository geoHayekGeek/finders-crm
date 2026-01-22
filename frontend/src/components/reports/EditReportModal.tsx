'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'
import { MonthlyAgentReport } from '@/types/reports'
import { reportsApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/utils/formatters'

interface EditReportModalProps {
  report: MonthlyAgentReport
  onClose: () => void
  onSuccess: () => void
}

export default function EditReportModal({ report, onClose, onSuccess }: EditReportModalProps) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadSources, setLeadSources] = useState<string[]>([])
  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    []
  )

  // Editable data
  const [editableData, setEditableData] = useState({
    listings_count: report.listings_count || 0,
    lead_sources: report.lead_sources || {},
    viewings_count: report.viewings_count || 0,
    boosts: typeof report.boosts === 'number' ? report.boosts : parseFloat(report.boosts) || 0,
    sales_count: report.sales_count || 0,
    sales_amount: report.sales_amount || 0,
    agent_commission: report.agent_commission || 0,
    finders_commission: report.finders_commission || 0,
    // referral_commission removed - use referrals_on_properties_commission instead
    team_leader_commission: report.team_leader_commission || 0,
    administration_commission: report.administration_commission || 0,
    total_commission: report.total_commission || 0,
    referral_received_count: report.referral_received_count || 0,
    referral_received_commission: report.referral_received_commission || 0,
    referrals_on_properties_count: report.referrals_on_properties_count || 0,
    referrals_on_properties_commission: report.referrals_on_properties_commission || 0
  })

  // Update editable data when report prop changes
  useEffect(() => {
    if (report) {
      setEditableData({
        listings_count: report.listings_count || 0,
        lead_sources: report.lead_sources || {},
        viewings_count: report.viewings_count || 0,
        boosts: typeof report.boosts === 'number' ? report.boosts : parseFloat(report.boosts) || 0,
        sales_count: report.sales_count || 0,
        sales_amount: report.sales_amount || 0,
        agent_commission: report.agent_commission || 0,
        finders_commission: report.finders_commission || 0,
        team_leader_commission: report.team_leader_commission || 0,
        administration_commission: report.administration_commission || 0,
        total_commission: report.total_commission || 0,
        referral_received_count: report.referral_received_count || 0,
        referral_received_commission: report.referral_received_commission || 0,
        referrals_on_properties_count: report.referrals_on_properties_count || 0,
        referrals_on_properties_commission: report.referrals_on_properties_commission || 0
      })
    }
  }, [report])

  useEffect(() => {
    if (token) {
      loadLeadSources()
    }
  }, [token])

  const loadLeadSources = async () => {
    try {
      const response = await reportsApi.getLeadSources(token)
      if (response.success) {
        setLeadSources(response.data)
      }
    } catch (error) {
      // Error handled silently - lead sources list will remain empty
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setLoading(true)
      
      // Send all editable fields to the backend
      const response = await reportsApi.update(
        report.id,
        {
          listings_count: editableData.listings_count,
          lead_sources: editableData.lead_sources,
          viewings_count: editableData.viewings_count,
          boosts: editableData.boosts,
          sales_count: editableData.sales_count,
          sales_amount: editableData.sales_amount,
          agent_commission: editableData.agent_commission,
          finders_commission: editableData.finders_commission,
          // referral_commission removed - use referrals_on_properties_commission instead
          team_leader_commission: editableData.team_leader_commission,
          administration_commission: editableData.administration_commission,
          total_commission: editableData.total_commission,
          referral_received_count: editableData.referral_received_count,
          referral_received_commission: editableData.referral_received_commission,
          referrals_on_properties_count: editableData.referrals_on_properties_count,
          referrals_on_properties_commission: editableData.referrals_on_properties_commission
        },
        token
      )

      if (response.success) {
        showSuccess('Report updated successfully')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error updating report:', error)
      setError(error.message || 'Failed to update report')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    try {
      setLoading(true)
      const response = await reportsApi.recalculate(report.id, token)
      
      if (response.success) {
        // Update editable data with recalculated values
        setEditableData({
          listings_count: response.data.listings_count,
          lead_sources: response.data.lead_sources,
          viewings_count: response.data.viewings_count,
          boosts: response.data.boosts,
          sales_count: response.data.sales_count,
          sales_amount: response.data.sales_amount,
          agent_commission: response.data.agent_commission,
          finders_commission: response.data.finders_commission,
          // referral_commission removed - use referrals_on_properties_commission instead
          team_leader_commission: response.data.team_leader_commission,
          administration_commission: response.data.administration_commission,
          total_commission: response.data.total_commission,
          referral_received_count: response.data.referral_received_count,
          referral_received_commission: response.data.referral_received_commission,
          referrals_on_properties_count: response.data.referrals_on_properties_count || 0,
          referrals_on_properties_commission: response.data.referrals_on_properties_commission || 0
        })
        showSuccess('Values recalculated successfully')
      }
    } catch (error: any) {
      showError(error.message || 'Failed to recalculate values')
    } finally {
      setLoading(false)
    }
  }

  const handleEditableChange = (field: keyof typeof editableData, value: any) => {
    setEditableData(prev => {
      // Ensure boosts is always a valid number
      if (field === 'boosts') {
        const numValue = typeof value === 'number' && !isNaN(value) ? value : 0
        return { ...prev, [field]: numValue }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleLeadSourceChange = (source: string, value: number) => {
    setEditableData(prev => ({
      ...prev,
      lead_sources: { ...prev.lead_sources, [source]: value }
    }))
  }

  const allLeadSources = leadSources.length > 0 ? leadSources : Object.keys(editableData.lead_sources)

  const formatRangeDisplay = () => {
    const start = report.start_date
      ? new Date(report.start_date)
      : new Date(report.year ?? new Date().getFullYear(), (report.month ?? 1) - 1, 1)
    const end = report.end_date
      ? new Date(report.end_date)
      : new Date(report.year ?? new Date().getFullYear(), report.month ?? 1, 0)

    return `${rangeFormatter.format(start)} → ${rangeFormatter.format(end)}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200  sticky top-0 bg-white z-1 sticky top-0 bg-white rounded-t-lg z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Report</h2>
            <p className="text-sm text-gray-600 mt-1">
              {report.agent_name} • {formatRangeDisplay()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRecalculate}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalculate
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
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

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  All values are editable. Click &quot;Recalculate&quot; to refresh automatic calculations from the database.
                </p>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Report Values (All Editable)
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
                    Boosts ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={typeof editableData.boosts === 'number' && !isNaN(editableData.boosts) ? editableData.boosts : 0}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      if (inputValue === '' || inputValue === null || inputValue === undefined) {
                        handleEditableChange('boosts', 0)
                      } else {
                        const numValue = parseFloat(inputValue)
                        if (!isNaN(numValue) && numValue >= 0) {
                          handleEditableChange('boosts', numValue)
                        }
                      }
                    }}
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

                  {/* referral_commission removed - use referrals_on_properties_commission instead */}

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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

