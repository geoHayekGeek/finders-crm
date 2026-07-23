import { formatCurrency } from '../formatters'

describe('formatCurrency', () => {
  it('formats numeric strings as currency', () => {
    expect(formatCurrency('590000.00')).toBe('$590,000')
  })

  it('formats comma-separated numeric strings as currency', () => {
    expect(formatCurrency('92,994.99')).toBe('$92,994.99')
  })

  it('falls back to $0 for invalid input', () => {
    expect(formatCurrency('not-a-number')).toBe('$0')
  })
})
