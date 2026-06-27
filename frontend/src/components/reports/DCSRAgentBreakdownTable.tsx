'use client'

import { Fragment, useMemo, type ReactNode } from 'react'
import { BadgeCheck, Eye, Home, PhoneCall, Users } from 'lucide-react'
import { DCSRTeamBreakdown } from '@/types/reports'
import { normalizeRole } from '@/utils/roleUtils'

interface DCSRAgentBreakdownTableProps {
  title: string
  subtitle?: string
  teams: DCSRTeamBreakdown[]
  unassignedListings?: number
}

type TeamAccent = {
  border: string
  soft: string
  chip: string
  chipText: string
  badge: string
  panel: string
  panelBorder: string
  value: string
  iconBg: string
  iconText: string
}

const TEAM_ACCENTS: TeamAccent[] = [
  {
    border: 'border-l-blue-500',
    soft: 'bg-blue-50',
    chip: 'bg-blue-100',
    chipText: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
    panel: 'bg-gradient-to-br from-blue-50 via-white to-blue-100/60',
    panelBorder: 'border-blue-100',
    value: 'text-blue-900',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700'
  },
  {
    border: 'border-l-violet-500',
    soft: 'bg-violet-50',
    chip: 'bg-violet-100',
    chipText: 'text-violet-900',
    badge: 'bg-violet-100 text-violet-800',
    panel: 'bg-gradient-to-br from-violet-50 via-white to-violet-100/60',
    panelBorder: 'border-violet-100',
    value: 'text-violet-900',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700'
  },
  {
    border: 'border-l-emerald-500',
    soft: 'bg-emerald-50',
    chip: 'bg-emerald-100',
    chipText: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800',
    panel: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60',
    panelBorder: 'border-emerald-100',
    value: 'text-emerald-900',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700'
  },
  {
    border: 'border-l-amber-500',
    soft: 'bg-amber-50',
    chip: 'bg-amber-100',
    chipText: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
    panel: 'bg-gradient-to-br from-amber-50 via-white to-amber-100/60',
    panelBorder: 'border-amber-100',
    value: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700'
  },
  {
    border: 'border-l-rose-500',
    soft: 'bg-rose-50',
    chip: 'bg-rose-100',
    chipText: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-800',
    panel: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/60',
    panelBorder: 'border-rose-100',
    value: 'text-rose-900',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-700'
  },
  {
    border: 'border-l-cyan-500',
    soft: 'bg-cyan-50',
    chip: 'bg-cyan-100',
    chipText: 'text-cyan-900',
    badge: 'bg-cyan-100 text-cyan-800',
    panel: 'bg-gradient-to-br from-cyan-50 via-white to-cyan-100/60',
    panelBorder: 'border-cyan-100',
    value: 'text-cyan-900',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-700'
  }
]

function formatNumber(value: number) {
  return value.toLocaleString()
}

function MetricCard({
  label,
  value,
  icon,
  tone
}: {
  label: string
  value: number
  icon: ReactNode
  tone: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'
}) {
  const toneClasses = {
    blue: {
      panel: 'bg-gradient-to-br from-blue-50 via-white to-blue-100/60',
      border: 'border-blue-100',
      value: 'text-blue-900',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-700'
    },
    violet: {
      panel: 'bg-gradient-to-br from-violet-50 via-white to-violet-100/60',
      border: 'border-violet-100',
      value: 'text-violet-900',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-700'
    },
    emerald: {
      panel: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60',
      border: 'border-emerald-100',
      value: 'text-emerald-900',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-700'
    },
    amber: {
      panel: 'bg-gradient-to-br from-amber-50 via-white to-amber-100/60',
      border: 'border-amber-100',
      value: 'text-amber-900',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-700'
    },
    rose: {
      panel: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/60',
      border: 'border-rose-100',
      value: 'text-rose-900',
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-700'
    },
    cyan: {
      panel: 'bg-gradient-to-br from-cyan-50 via-white to-cyan-100/60',
      border: 'border-cyan-100',
      value: 'text-cyan-900',
      iconBg: 'bg-cyan-100',
      iconText: 'text-cyan-700'
    }
  }[tone]

  return (
    <div className={`flex h-full min-h-[108px] flex-col justify-between overflow-hidden rounded-2xl border px-4 py-3 shadow-sm ring-1 ring-white/60 ${toneClasses.panel} ${toneClasses.border}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClasses.iconBg} ${toneClasses.iconText}`}>
          {icon}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {label}
        </p>
      </div>
      <div className={`mt-4 text-[30px] font-semibold leading-none tracking-[-0.04em] ${toneClasses.value}`}>
        {formatNumber(value)}
      </div>
    </div>
  )
}

export default function DCSRAgentBreakdownTable({
  title,
  subtitle,
  teams,
  unassignedListings
}: DCSRAgentBreakdownTableProps) {
  const summary = useMemo(() => {
    return teams.reduce(
      (acc, team) => {
        acc.teamCount += 1
        acc.agentCount += (team.agent_breakdown || []).filter(
          (agent) => normalizeRole(agent.role) !== 'unassigned'
        ).length
        acc.listings += team.listings_count || 0
        acc.calls += team.leads_count || 0
        acc.sales += team.sales_count || 0
        acc.rent += team.rent_count || 0
        acc.viewings += team.viewings_count || 0
        return acc
      },
      {
        teamCount: 0,
        agentCount: 0,
        listings: 0,
        calls: 0,
        sales: 0,
        rent: 0,
        viewings: 0
      }
    )
  }, [teams])

  const hasTeams = teams.length > 0
  let runningIndex = 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 shadow-sm">
        <div className="space-y-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Detailed breakdown
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {subtitle}
              </p>
            )}
            {unassignedListings !== undefined && unassignedListings > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                <BadgeCheck className="h-3.5 w-3.5" />
                {formatNumber(unassignedListings)} unassigned listings are excluded from the team rows
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Teams" value={summary.teamCount} icon={<Users className="h-4 w-4" />} tone="violet" />
            <MetricCard label="Agents" value={summary.agentCount} icon={<Users className="h-4 w-4" />} tone="blue" />
            <MetricCard label="Listings" value={summary.listings} icon={<Home className="h-4 w-4" />} tone="blue" />
            <MetricCard label="Calls" value={summary.calls} icon={<PhoneCall className="h-4 w-4" />} tone="cyan" />
            <MetricCard label="Viewings" value={summary.viewings} icon={<Eye className="h-4 w-4" />} tone="violet" />
            <MetricCard label="Closures" value={summary.sales + summary.rent} icon={<BadgeCheck className="h-4 w-4" />} tone="emerald" />
          </div>
        </div>
      </div>

      {!hasTeams ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No agent breakdown data is available for the selected range.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th rowSpan={2} className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    #
                  </th>
                  <th rowSpan={2} className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Agent
                  </th>
                  <th colSpan={2} className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Description
                  </th>
                  <th colSpan={2} className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Closure
                  </th>
                  <th rowSpan={2} className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Viewings
                  </th>
                </tr>
                <tr>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Listings
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Leads
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sale
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Rent
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, teamIndex) => {
                  const accent = TEAM_ACCENTS[teamIndex % TEAM_ACCENTS.length]
                  const members = team.agent_breakdown || []
                  const actualMembers = members.filter((agent) => normalizeRole(agent.role) !== 'unassigned')
                  const hasUnassignedActivity = members.some((agent) => normalizeRole(agent.role) === 'unassigned')
                  const teamLabel = `${team.team_leader_name}${team.team_leader_code ? ` (${team.team_leader_code})` : ''}`

                  return (
                    <Fragment key={team.team_leader_id}>
                      <tr>
                        <td colSpan={7} className={`border-b border-slate-200 border-l-4 ${accent.border} ${accent.soft} px-4 py-4`}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  {teamLabel}
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}>
                                  {actualMembers.length} members
                                </span>
                                {hasUnassignedActivity && (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                                    Includes unassigned activity
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                Team totals are shown below, with one row per agent.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                                <Home className="h-3.5 w-3.5" />
                                {formatNumber(team.listings_count || 0)} listings
                              </span>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                                <PhoneCall className="h-3.5 w-3.5" />
                                {formatNumber(team.leads_count || 0)} calls
                              </span>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                                <BadgeCheck className="h-3.5 w-3.5" />
                                {formatNumber((team.sales_count || 0) + (team.rent_count || 0))} closures
                              </span>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accent.chip} ${accent.chipText}`}>
                                <Eye className="h-3.5 w-3.5" />
                                {formatNumber(team.viewings_count || 0)} viewings
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {members.map((agent) => {
                        runningIndex += 1
                        const isLeader = normalizeRole(agent.role) === 'team leader'
                        const isUnassignedActivity = normalizeRole(agent.role) === 'unassigned'

                        return (
                          <tr
                            key={agent.id}
                            className={`group border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                              isUnassignedActivity ? 'bg-slate-50/70' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                              {runningIndex}
                            </td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex min-w-0 items-start gap-3 rounded-xl px-3 py-2 ${
                                isLeader
                                  ? accent.soft
                                  : isUnassignedActivity
                                    ? 'bg-slate-100'
                                    : 'bg-white'
                              }`}>
                                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isLeader ? accent.badge : 'bg-slate-100 text-slate-600'}`}>
                                  {agent.name
                                    .split(' ')
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map(part => part[0])
                                    .join('')
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-sm font-semibold ${
                                      isLeader
                                        ? 'text-slate-900'
                                        : isUnassignedActivity
                                          ? 'text-slate-700 italic'
                                          : 'text-slate-800'
                                    }`}>
                                      {agent.name}
                                    </span>
                                    {agent.user_code && (
                                      <span className="text-xs text-slate-500">
                                        ({agent.user_code})
                                      </span>
                                    )}
                                    {isUnassignedActivity && (
                                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                                        Unassigned
                                      </span>
                                    )}
                                    {isLeader && (
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}>
                                        Leader
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-500">
                                    {isUnassignedActivity
                                      ? 'Records not linked to a specific agent'
                                      : isLeader
                                        ? 'Team lead'
                                        : 'Team member'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-blue-700">
                              {formatNumber(agent.listings_count || 0)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-cyan-700">
                              {formatNumber(agent.leads_count || 0)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                              {formatNumber(agent.sales_count || 0)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                              {formatNumber(agent.rent_count || 0)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-violet-700">
                              {formatNumber(agent.viewings_count || 0)}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
