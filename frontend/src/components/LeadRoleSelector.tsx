'use client'

interface LeadRoleSelectorProps {
  isBuyer: boolean
  isSeller: boolean
  onChange: (next: { is_buyer: boolean; is_seller: boolean }) => void
  error?: string
  label?: string
  helperText?: string
  disabled?: boolean
}

export function LeadRoleSelector({
  isBuyer,
  isSeller,
  onChange,
  error,
  label = 'Lead Type',
  helperText = 'Choose buyer, seller, or both.',
  disabled = false
}: LeadRoleSelectorProps) {
  const updateRole = (key: 'is_buyer' | 'is_seller', checked: boolean) => {
    onChange({
      is_buyer: key === 'is_buyer' ? checked : isBuyer,
      is_seller: key === 'is_seller' ? checked : isSeller
    })
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
            isBuyer ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 bg-white'
          } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={isBuyer}
            onChange={(e) => updateRole('is_buyer', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            disabled={disabled}
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Buyer</span>
            <span className="block text-xs text-gray-500">Can select this lead as a property buyer.</span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
            isSeller ? 'border-amber-300 bg-amber-50' : 'border-gray-300 bg-white'
          } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={isSeller}
            onChange={(e) => updateRole('is_seller', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            disabled={disabled}
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Seller</span>
            <span className="block text-xs text-gray-500">Can select this lead as a property owner.</span>
          </span>
        </label>
      </div>

      <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <span className="mr-1">!</span>
          {error}
        </p>
      )}
    </div>
  )
}
