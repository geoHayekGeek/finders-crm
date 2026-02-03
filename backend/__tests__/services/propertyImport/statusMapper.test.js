/**
 * Unit tests for property import status mapper (Active/Inactive -> status_id).
 */

const { resolveStatus, STATUS_SYNONYMS } = require('../../../services/propertyImport/statusMapper');

describe('propertyImport statusMapper', () => {
  const statuses = [
    { id: 1, name: 'Active', code: 'active' },
    { id: 2, name: 'Inactive', code: 'inactive' },
    { id: 3, name: 'Archived', code: 'archived' },
  ];

  it('maps "Active" to Active status', () => {
    const r = resolveStatus(statuses, 'Active');
    expect(r.statusId).toBe(1);
    expect(r.statusName).toBe('Active');
    expect(r.error).toBeUndefined();
  });

  it('maps "active" (lowercase) to Active', () => {
    const r = resolveStatus(statuses, 'active');
    expect(r.statusId).toBe(1);
  });

  it('maps "Inactive" to Inactive status', () => {
    const r = resolveStatus(statuses, 'Inactive');
    expect(r.statusId).toBe(2);
    expect(r.statusName).toBe('Inactive');
  });

  it('maps "inactive" / "archived" to Inactive or Archived', () => {
    const r1 = resolveStatus(statuses, 'inactive');
    expect(r1.statusId).toBe(2);
    const r2 = resolveStatus(statuses, 'archived');
    expect(r2.statusId).toBe(3);
  });

  it('when empty, defaults to Active if available', () => {
    const r = resolveStatus(statuses, '');
    expect(r.statusId).toBe(1);
    expect(r.statusName).toBe('Active');
  });

  it('returns error for unknown status value when no match', () => {
    const r = resolveStatus(statuses, 'UnknownStatus');
    expect(r.statusId).toBeNull();
    expect(r.error).toContain('Unknown status');
  });

  it('STATUS_SYNONYMS defines active and inactive lists', () => {
    expect(STATUS_SYNONYMS.active).toContain('active');
    expect(STATUS_SYNONYMS.inactive).toContain('inactive');
    expect(STATUS_SYNONYMS.inactive).toContain('archived');
  });
});
