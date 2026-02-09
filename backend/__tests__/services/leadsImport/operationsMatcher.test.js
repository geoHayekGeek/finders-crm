const { matchOperationsUser, ROLE_PRIORITY } = require('../../../services/leadsImport/operationsMatcher');

describe('leadsImport operationsMatcher', () => {
  const users = [
    { id: 1, name: 'Melissa Atallah', role: 'operations', user_code: 'MA', updated_at: '2024-01-01' },
    { id: 2, name: 'Elsy Wehbe', role: 'operations_manager', user_code: 'EW', updated_at: '2024-02-01' },
    { id: 3, name: 'Gaelle Chamoun', role: 'operations', user_code: 'GC', updated_at: '2024-01-15' },
  ];

  it('matches initials MA to Melissa Atallah', () => {
    const r = matchOperationsUser(users, 'MA');
    expect(r.userId).toBe(1);
    expect(r.userName).toBe('Melissa Atallah');
  });

  it('matches initials EW to Elsy Wehbe', () => {
    const r = matchOperationsUser(users, 'EW');
    expect(r.userId).toBe(2);
  });

  it('prefers higher role when multiple match (GC matches Gaelle)', () => {
    const r = matchOperationsUser(users, 'GC');
    expect(r.userId).toBe(3);
  });

  it('returns warning and null userId when no match', () => {
    const r = matchOperationsUser(users, 'XX');
    expect(r.userId).toBeNull();
    expect(r.warning).toContain('not in system');
  });

  it('matches full name with space', () => {
    const r = matchOperationsUser(users, 'Melissa Atallah');
    expect(r.userId).toBe(1);
  });
});
