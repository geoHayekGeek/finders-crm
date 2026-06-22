'use client'

import { useState } from 'react'
import { BarChart3, Users } from 'lucide-react'
import MonthlyAgentStatsTab from './MonthlyAgentStatsTab'
import TeamReportsTab from './TeamReportsTab'

type ReportView = 'agent' | 'team'

export default function AgentTeamReportsTab() {
  const [view, setView] = useState<ReportView>('agent')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView('agent')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === 'agent'
              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          aria-pressed={view === 'agent'}
        >
          <BarChart3 className="h-4 w-4" />
          Agent reports
        </button>
        <button
          type="button"
          onClick={() => setView('team')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === 'team'
              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          aria-pressed={view === 'team'}
        >
          <Users className="h-4 w-4" />
          Team reports
        </button>
      </div>

      <div hidden={view !== 'agent'}>
        <MonthlyAgentStatsTab />
      </div>
      <div hidden={view !== 'team'}>
        <TeamReportsTab />
      </div>
    </div>
  )
}
