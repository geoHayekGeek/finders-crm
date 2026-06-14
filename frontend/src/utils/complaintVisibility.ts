import type { Complaint } from '@/types/complaints'

const COMPLAINT_VIEWED_PREFIX = 'finders-crm:complaints:viewed'

export function getComplaintViewedKey(userId?: number | string | null) {
  if (userId === undefined || userId === null || userId === '') {
    return null
  }

  return `${COMPLAINT_VIEWED_PREFIX}:${userId}`
}

function readViewedIds(userId?: number | string | null) {
  if (typeof window === 'undefined') {
    return new Set<number>()
  }

  const key = getComplaintViewedKey(userId)
  if (!key) {
    return new Set<number>()
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return new Set<number>()
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set<number>()
    }

    return new Set(
      parsed
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  } catch {
    return new Set<number>()
  }
}

export function getComplaintBadgeCount(complaints: Complaint[], userId?: number | string | null) {
  const viewedIds = readViewedIds(userId)
  const currentUserId = userId === undefined || userId === null || userId === '' ? null : Number(userId)

  return complaints.filter((complaint) => {
    if (currentUserId !== null && Number.isFinite(currentUserId) && complaint.created_by === currentUserId) {
      return false
    }

    return !viewedIds.has(complaint.id)
  }).length
}

export function markComplaintAsViewed(userId?: number | string | null, complaintId?: number | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (userId === undefined || userId === null || userId === '' || complaintId === undefined || complaintId === null) {
    return
  }

  const key = getComplaintViewedKey(userId)
  if (!key) {
    return
  }

  const viewedIds = readViewedIds(userId)
  viewedIds.add(complaintId)

  window.localStorage.setItem(key, JSON.stringify(Array.from(viewedIds)))
  window.dispatchEvent(new Event('complaints:refresh'))
}
