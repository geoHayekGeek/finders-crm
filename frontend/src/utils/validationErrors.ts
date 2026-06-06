export interface FieldValidationError {
  field?: string
  message: string
}

export const normalizeValidationField = (field?: string): string => {
  if (!field) {
    return 'form'
  }

  if (field.startsWith('referrals')) {
    return 'referrals'
  }

  if (field.startsWith('details')) {
    return 'details'
  }

  if (field.startsWith('interior_details')) {
    return 'interior_details'
  }

  return field
}

export const mapValidationErrors = (
  errors: FieldValidationError[] = []
): Record<string, string> => {
  const fieldErrors: Record<string, string> = {}

  errors.forEach(({ field, message }) => {
    const normalizedField = normalizeValidationField(field)

    if (fieldErrors[normalizedField]) {
      fieldErrors[normalizedField] += `; ${message}`
      return
    }

    fieldErrors[normalizedField] = message
  })

  return fieldErrors
}
