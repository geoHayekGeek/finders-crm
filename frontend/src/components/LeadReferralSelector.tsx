'use client'

import React, { useState } from 'react'
import { Plus, X, Calendar, User, Users } from 'lucide-react'

interface Agent {
  id: number
  name: string
  email?: string
  role?: string
}

interface LeadReferral {
  id?: number
  name: string
  type: 'employee' | 'custom'
  employee_id?: number
  date: string
  status?: 'pending' | 'confirmed' | 'rejected'
  external?: boolean
}

interface LeadReferralSelectorProps {
  referrals: LeadReferral[]
  onReferralsChange: (referrals: LeadReferral[]) => void
  agents: Agent[]
  placeholder?: string
}

export function LeadReferralSelector({
  referrals,
  onReferralsChange,
  agents,
  placeholder = "Select referrals..."
}: LeadReferralSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newReferral, setNewReferral] = useState<Partial<LeadReferral>>({
    name: '',
    type: 'employee',
    date: new Date().toISOString().split('T')[0]
  })

  const addReferral = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (newReferral.name && newReferral.date) {
      console.log('Adding referral with date:', newReferral.date)
      const referral: LeadReferral = {
        name: newReferral.name,
        type: newReferral.type as 'employee' | 'custom',
        employee_id: newReferral.type === 'employee' ? newReferral.employee_id : undefined,
        date: newReferral.date
      }
      
      onReferralsChange([...referrals, referral])
      setNewReferral({
        name: '',
        type: 'employee',
        date: new Date().toISOString().split('T')[0]
      })
      setShowAddForm(false)
    }
  }

  const removeReferral = (index: number) => {
    const updatedReferrals = referrals.filter((_, i) => i !== index)
    onReferralsChange(updatedReferrals)
  }

  const updateReferralDate = (index: number, date: string) => {
    const updatedReferrals = referrals.map((referral, i) => 
      i === index ? { ...referral, date } : referral
    )
    onReferralsChange(updatedReferrals)
  }

  const getAgentName = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId)
    return agent ? agent.name : 'Unknown Agent'
  }

  const handleMainInputClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleAddReferralClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowAddForm(!showAddForm)
  }

  return (
    <div className="relative">
      {/* Main Input */}
      <div className="relative">
        <div
          onClick={handleMainInputClick}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 cursor-pointer hover:border-gray-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className={referrals.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                {referrals.length > 0 
                  ? `${referrals.length} referral${referrals.length !== 1 ? 's' : ''} selected`
                  : placeholder
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {referrals.length > 0 && (
                <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {referrals.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Referrals</h3>
              <button
                type="button"
                onClick={handleAddReferralClick}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Referral</span>
              </button>
            </div>
          </div>

          {/* Add Referral Form */}
          {showAddForm && (
            <div className="p-3 border-b border-gray-200 bg-blue-50">
              <div className="space-y-3">
                {/* Referral Type Selection */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setNewReferral(prev => ({ ...prev, type: 'employee', name: '', employee_id: undefined }))}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      newReferral.type === 'employee'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewReferral(prev => ({ ...prev, type: 'custom', name: '', employee_id: undefined }))}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      newReferral.type === 'custom'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Employee Selection or Custom Name */}
                {newReferral.type === 'employee' ? (
                  <select
                    value={newReferral.employee_id || ''}
                    onChange={(e) => {
                      const agentId = parseInt(e.target.value)
                      const agent = agents.find(a => a.id === agentId)
                      setNewReferral(prev => ({
                        ...prev,
                        employee_id: agentId,
                        name: agent ? agent.name : ''
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                  >
                    <option value="">Select an agent...</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}{agent.role ? ` (${agent.role})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newReferral.name}
                    onChange={(e) => setNewReferral(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter custom referral name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                  />
                )}

                {/* Date Selection */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={newReferral.date}
                    onChange={(e) => {
                      console.log('Date changed to:', e.target.value)
                      setNewReferral(prev => ({ ...prev, date: e.target.value }))
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={addReferral}
                    disabled={!newReferral.name || !newReferral.date}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Referral
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewReferral({
                        name: '',
                        type: 'employee',
                        date: new Date().toISOString().split('T')[0]
                      })
                    }}
                    className="px-3 py-1 text-gray-600 text-xs rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current Referrals List */}
          {referrals.length > 0 && (
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Referrals</h4>
              <div className="space-y-2">
                {referrals.map((referral, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded-full ${
                        referral.type === 'employee' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        <User className={`h-3 w-3 ${
                          referral.type === 'employee' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {referral.type === 'employee' && referral.employee_id
                              ? getAgentName(referral.employee_id)
                              : referral.name
                            }
                          </span>
                          {/* Status badges */}
                          {referral.status === 'pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Pending
                            </span>
                          )}
                          {referral.status === 'rejected' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Rejected
                            </span>
                          )}
                          {referral.status === 'confirmed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Confirmed
                            </span>
                          )}
                          {!referral.status && referral.external && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              External
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(referral.date).toLocaleDateString()}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-black">
                            {referral.type === 'employee' ? 'Employee' : 'Custom'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        value={referral.date}
                        onChange={(e) => updateReferralDate(index, e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeReferral(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {referrals.length === 0 && !showAddForm && (
            <div className="p-6 text-center text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No referrals added yet</p>
              <p className="text-xs">Click &quot;Add Referral&quot; to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Click Outside to Close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
