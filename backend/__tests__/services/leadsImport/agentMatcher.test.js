const { matchAgent, similarity, AGENT_MATCH_THRESHOLD } = require('../../../services/leadsImport/agentMatcher');

describe('leadsImport agentMatcher', () => {
  const assignableUsers = [
    { id: 10, name: 'Nader Bechara', role: 'agent' },
    { id: 11, name: 'Georgio Antoury', role: 'agent' },
  ];

  it('returns fallback when input empty', () => {
    const r = matchAgent(assignableUsers, '');
    expect(r.userId).toBeNull();
    expect(r.fallbackName).toBeNull();
  });

  it('matches exact name', () => {
    const r = matchAgent(assignableUsers, 'Nader Bechara');
    expect(r.userId).toBe(10);
    expect(r.userName).toBe('Nader Bechara');
    expect(r.fallbackName).toBeNull();
  });

  it('matches with small typo when above threshold', () => {
    const r = matchAgent(assignableUsers, 'Nader Bechar');
    expect(r.userId).toBe(10);
  });

  it('returns fallback and warning when no match', () => {
    const r = matchAgent(assignableUsers, 'Unknown Agent XYZ');
    expect(r.userId).toBeNull();
    expect(r.fallbackName).toContain('not in system');
    expect(r.warning).toBeDefined();
  });

  it('similarity returns 1 for same string', () => {
    expect(similarity('john', 'john')).toBe(1);
  });

  it('similarity returns value between 0 and 1', () => {
    const s = similarity('nader bechara', 'nader bechar');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('AGENT_MATCH_THRESHOLD is 0.88', () => {
    expect(AGENT_MATCH_THRESHOLD).toBe(0.88);
  });
});
