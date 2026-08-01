'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, RefreshCw, Search, X } from 'lucide-react'
import { formatRole, getRoleColor } from '@/utils/roleFormatter'
import { OperationsUser } from '@/types/leads'

interface OperationsDailyMultiSelectProps {
  users: OperationsUser[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
}

export default function OperationsDailyMultiSelect({
  users,
  selectedIds,
  onChange,
  loading = false,
  error = null,
  onRefresh
}: OperationsDailyMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-operations-daily-multi-select]')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [selectedIds, users]
  )

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      if (!normalizedSearch) {
        return true
      }

      return (
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.role.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [searchTerm, users])

  const toggleUser = (userId: number) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId))
      return
    }

    onChange([...selectedIds, userId])
  }

  const handleSelectAll = () => {
    onChange(users.map((user) => user.id))
  }

  const handleClear = () => {
    onChange([])
  }

  const removeUser = (userId: number) => {
    onChange(selectedIds.filter((id) => id !== userId))
  }

  return (
    <div className="space-y-3" data-operations-daily-multi-select>
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800"
            >
              {user.name}
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="rounded-full p-0.5 text-blue-700 transition-colors hover:bg-blue-200"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={loading || users.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Select All
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={loading || selectedIds.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-left transition-colors hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <span className={selectedIds.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
            {loading
              ? 'Loading operations users...'
              : selectedIds.length > 0
                ? `${selectedIds.length} operations selected`
                : 'Select one or more operations users'}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-30 mt-2 max-h-96 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-200 p-3">
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search operations users..."
                  className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </label>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {error ? (
                <div className="p-4 text-sm text-red-600">{error}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  {searchTerm ? 'No operations users match your search.' : 'No operations users available.'}
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id)

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={`flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-600">{user.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                          isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 bg-white text-transparent'
                        }`}>
                          <Check className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && !isOpen && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
