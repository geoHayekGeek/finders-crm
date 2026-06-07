import type { Lead, LeadRole } from '@/types/leads'

type LeadRoleLike = Pick<Lead, 'is_buyer' | 'is_seller' | 'lead_role'>

export const getLeadRoleSelection = (
  value?: LeadRoleLike | LeadRole | null
): LeadRole | undefined => {
  if (!value) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  if (value.lead_role) {
    return value.lead_role
  }

  const isBuyer = !!value.is_buyer
  const isSeller = !!value.is_seller

  if (isBuyer && isSeller) return 'both'
  if (isBuyer) return 'buyer'
  if (isSeller) return 'seller'
  return undefined
}

export const getLeadRoleLabel = (value?: LeadRoleLike | LeadRole | null): string => {
  const role = getLeadRoleSelection(value)

  switch (role) {
    case 'buyer':
      return 'Buyer'
    case 'seller':
      return 'Seller'
    case 'both':
      return 'Buyer + Seller'
    default:
      return 'Unassigned'
  }
}

export const getLeadRoleBadgeClassName = (value?: LeadRoleLike | LeadRole | null): string => {
  const role = getLeadRoleSelection(value)

  switch (role) {
    case 'buyer':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'seller':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'both':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

export const getLeadRoleFilterLabel = (value?: LeadRole | null): string => {
  if (!value) {
    return 'All Lead Types'
  }

  if (value === 'both') {
    return 'Buyer + Seller'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}
