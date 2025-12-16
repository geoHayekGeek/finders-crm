// __tests__/leads/leadsNotesPermissions.test.js
// Comprehensive tests for lead notes permissions system
const LeadsController = require('../../controllers/leadsController');
const Lead = require('../../models/leadsModel');
const LeadNote = require('../../models/leadNotesModel');
const pool = require('../../config/db');

jest.mock('../../models/leadsModel');
jest.mock('../../models/leadNotesModel');
jest.mock('../../config/db');

describe('Lead Notes Permissions System', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Test User', role: 'admin' },
      params: {},
      query: {},
      body: {},
      roleFilters: {
        canViewLeads: true,
        canManageLeads: true,
        role: 'admin'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('filterNotesForUser - Admin', () => {
    it('should return all notes for admin', async () => {
      const notes = [
        { id: 1, note_text: 'Note 1', created_by: 1, created_by_role: 'admin' },
        { id: 2, note_text: 'Note 2', created_by: 2, created_by_role: 'agent' },
        { id: 3, note_text: 'Note 3', created_by: 3, created_by_role: 'operations' },
        { id: 4, note_text: 'Note 4', created_by: 4, created_by_role: 'team_leader' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 1, role: 'admin' };

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(notes);
    });
  });

  describe('filterNotesForUser - Operations Roles', () => {
    it('should return only own notes for operations', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 5, created_by_role: 'operations' },
        { id: 2, note_text: 'Agent Note', created_by: 2, created_by_role: 'agent' },
        { id: 3, note_text: 'Another Ops Note', created_by: 6, created_by_role: 'operations' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 5, role: 'operations' };

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
      expect(filtered[0].created_by).toBe(5);
    });

    it('should return all notes for operations_manager', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 7, created_by_role: 'operations_manager' },
        { id: 2, note_text: 'Agent Note', created_by: 2, created_by_role: 'agent' },
        { id: 3, note_text: 'Admin Note', created_by: 1, created_by_role: 'admin' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 7, role: 'operations_manager' };

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(notes);
    });

    it('should return only own notes for agent_manager', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 8, created_by_role: 'agent_manager' },
        { id: 2, note_text: 'Agent Note', created_by: 2, created_by_role: 'agent' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 8, role: 'agent_manager' };

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].created_by).toBe(8);
    });
  });

  describe('filterNotesForUser - Team Leader', () => {
    it('should return own notes and team agent notes for team leader', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 10, created_by_role: 'team_leader' },
        { id: 2, note_text: 'Team Agent Note', created_by: 20, created_by_role: 'agent' },
        { id: 3, note_text: 'Other Agent Note', created_by: 30, created_by_role: 'agent' },
        { id: 4, note_text: 'Another Team Agent', created_by: 21, created_by_role: 'agent' }
      ];
      const lead = { id: 1, agent_id: 20 };
      const user = { id: 10, role: 'team_leader' };

      // Mock team agents query - agents 20 and 21 are in team
      pool.query.mockResolvedValue({
        rows: [
          { agent_id: 20 },
          { agent_id: 21 }
        ]
      });

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(n => n.id)).toEqual([1, 2, 4]);
    });

    it('should not return notes from agents outside team', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 10, created_by_role: 'team_leader' },
        { id: 2, note_text: 'Team Agent Note', created_by: 20, created_by_role: 'agent' },
        { id: 3, note_text: 'Outside Team Note', created_by: 99, created_by_role: 'agent' }
      ];
      const lead = { id: 1, agent_id: 20 };
      const user = { id: 10, role: 'team_leader' };

      pool.query.mockResolvedValue({
        rows: [{ agent_id: 20 }]
      });

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(n => n.id)).toEqual([1, 2]);
    });
  });

  describe('filterNotesForUser - Agent', () => {
    it('should return own notes and notes from previous agents who had the lead', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 2, created_by_role: 'agent' },
        { id: 2, note_text: 'Previous Agent Note', created_by: 3, created_by_role: 'agent' },
        { id: 3, note_text: 'Other Agent Note', created_by: 99, created_by_role: 'agent' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 2, role: 'agent' };

      // Mock getLeadById to return lead with current agent (called in getLeadAgentIds)
      Lead.getLeadById.mockResolvedValue({ id: 1, agent_id: 2 });

      // Mock referrals query - agent 3 was previously assigned
      pool.query.mockResolvedValue({
        rows: [
          { referred_to_agent_id: 3, agent_id: null },
          { referred_to_agent_id: null, agent_id: 2 }
        ]
      });

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(n => n.id)).toEqual([1, 2]);
    });

    it('should include notes from current agent_id', async () => {
      const notes = [
        { id: 1, note_text: 'Current Agent Note', created_by: 2, created_by_role: 'agent' },
        { id: 2, note_text: 'My Note', created_by: 2, created_by_role: 'agent' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 2, role: 'agent' };

      Lead.getLeadById.mockResolvedValue({ id: 1, agent_id: 2 });
      pool.query.mockResolvedValue({ rows: [] });

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(2);
    });

    it('should include notes from agents in confirmed referrals', async () => {
      const notes = [
        { id: 1, note_text: 'My Note', created_by: 2, created_by_role: 'agent' },
        { id: 2, note_text: 'Referred Agent Note', created_by: 5, created_by_role: 'agent' }
      ];
      const lead = { id: 1, agent_id: 2 };
      const user = { id: 2, role: 'agent' };

      Lead.getLeadById.mockResolvedValue({ id: 1, agent_id: 2 });
      pool.query.mockResolvedValue({
        rows: [
          { referred_to_agent_id: 5, agent_id: null }
        ]
      });

      const filtered = await LeadsController.filterNotesForUser(notes, lead, user);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(n => n.id)).toEqual([1, 2]);
    });
  });

  describe('addLeadNote - Permission Checks', () => {
    it('should allow admin to add notes', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params.id = '1';
      req.body = { note_text: 'Admin note' };
      const mockLead = { id: 1, agent_id: 2 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'Admin note', created_by: 1 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow operations to add notes', async () => {
      req.user = { id: 5, role: 'operations' };
      req.params.id = '1';
      req.body = { note_text: 'Operations note' };
      const mockLead = { id: 1, agent_id: 2 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'Operations note', created_by: 5 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow operations_manager to add notes', async () => {
      req.user = { id: 7, role: 'operations_manager' };
      req.params.id = '1';
      req.body = { note_text: 'Ops manager note' };
      const mockLead = { id: 1, agent_id: 2 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'Ops manager note', created_by: 7 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow agent_manager to add notes', async () => {
      req.user = { id: 8, role: 'agent_manager' };
      req.params.id = '1';
      req.body = { note_text: 'Agent manager note' };
      const mockLead = { id: 1, agent_id: 2 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'Agent manager note', created_by: 8 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow agent to add notes to assigned lead', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params.id = '1';
      req.body = { note_text: 'Agent note' };
      const mockLead = { id: 1, agent_id: 2 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'Agent note', created_by: 2 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow agent to add notes if previously assigned/referred', async () => {
      req.user = { id: 3, role: 'agent' };
      req.params.id = '1';
      req.body = { note_text: 'Previous agent note' };
      const mockLead = { id: 1, agent_id: 2 }; // Currently assigned to agent 2
      const mockNote = { id: 1, lead_id: 1, note_text: 'Previous agent note', created_by: 3 };

      // Mock getLeadById - first call in addLeadNote, second call in getLeadAgentIds
      Lead.getLeadById
        .mockResolvedValueOnce(mockLead) // First call in addLeadNote
        .mockResolvedValueOnce(mockLead); // Second call in getLeadAgentIds

      // Mock referrals query - agent 3 was previously assigned
      pool.query.mockResolvedValue({
        rows: [
          { referred_to_agent_id: 3, agent_id: null }
        ]
      });
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should deny agent from adding notes to unassigned lead', async () => {
      req.user = { id: 99, role: 'agent' };
      req.params.id = '1';
      req.body = { note_text: 'Unauthorized note' };
      const mockLead = { id: 1, agent_id: 2 }; // Assigned to different agent

      Lead.getLeadById.mockResolvedValue(mockLead);
      pool.query.mockResolvedValue({ rows: [] }); // No previous assignments

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to add notes to this lead'
      });
    });

    it('should allow team leader to add notes to team agent lead', async () => {
      req.user = { id: 10, role: 'team_leader' };
      req.params.id = '1';
      req.body = { note_text: 'Team leader note' };
      const mockLead = { id: 1, agent_id: 20 };
      const mockNote = { id: 1, lead_id: 1, note_text: 'Team leader note', created_by: 10 };

      Lead.getLeadById.mockResolvedValue(mockLead);
      pool.query.mockResolvedValue({ rows: [{ 1: 1 }] }); // Team agent check
      LeadNote.createNote.mockResolvedValue(mockNote);
      LeadNote.getNotesForLead.mockResolvedValue([mockNote]);

      await LeadsController.addLeadNote(req, res);

      expect(LeadNote.createNote).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getLeadNotes - Integration with filterNotesForUser', () => {
    it('should filter notes correctly for agent viewing lead with previous agents', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params.id = '1';
      const mockLead = { id: 1, agent_id: 2 };
      const allNotes = [
        { id: 1, note_text: 'My Note', created_by: 2, created_by_role: 'agent' },
        { id: 2, note_text: 'Previous Agent Note', created_by: 3, created_by_role: 'agent' },
        { id: 3, note_text: 'Other Note', created_by: 99, created_by_role: 'agent' }
      ];

      // Mock getLeadById - first call in getLeadNotes, second call in getLeadAgentIds
      Lead.getLeadById
        .mockResolvedValueOnce(mockLead) // First call in getLeadNotes
        .mockResolvedValueOnce(mockLead); // Second call in getLeadAgentIds
      LeadNote.getNotesForLead.mockResolvedValue(allNotes);
      pool.query.mockResolvedValue({
        rows: [
          { referred_to_agent_id: 3, agent_id: null }
        ]
      });

      await LeadsController.getLeadNotes(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 })
        ]),
        message: expect.stringContaining('Retrieved')
      });
    });
  });
});

