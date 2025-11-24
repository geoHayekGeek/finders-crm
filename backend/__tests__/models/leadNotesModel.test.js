const LeadNote = require('../../models/leadNotesModel');
const pool = require('../../config/db');

jest.mock('../../config/db');

describe('LeadNote Model', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool.query = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a new note', async () => {
      const leadId = 1;
      const user = { id: 1, role: 'agent' };
      const noteText = 'Test note';

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, lead_id: leadId, created_by: user.id, note_text: noteText }]
      });

      const result = await LeadNote.createNote(leadId, user, noteText);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_notes'),
        [leadId, user.id, user.role, noteText]
      );
      expect(result.lead_id).toBe(leadId);
      expect(result.note_text).toBe(noteText);
    });
  });

  describe('updateNote', () => {
    it('should update an existing note', async () => {
      const noteId = 1;
      const noteText = 'Updated note';

      mockQuery.mockResolvedValue({
        rows: [{ id: noteId, note_text: noteText }]
      });

      const result = await LeadNote.updateNote(noteId, noteText);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lead_notes'),
        [noteText, noteId]
      );
      expect(result.note_text).toBe(noteText);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const noteId = 1;

      mockQuery.mockResolvedValue({
        rows: [{ id: noteId }]
      });

      const result = await LeadNote.deleteNote(noteId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM lead_notes'),
        [noteId]
      );
      expect(result.id).toBe(noteId);
    });
  });

  describe('getNotesForLead', () => {
    it('should get all notes for a lead', async () => {
      const leadId = 1;
      const mockNotes = [
        {
          id: 1,
          lead_id: leadId,
          note_text: 'Note 1',
          created_by: 1,
          created_by_name: 'User 1'
        },
        {
          id: 2,
          lead_id: leadId,
          note_text: 'Note 2',
          created_by: 2,
          created_by_name: 'User 2'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockNotes });

      const result = await LeadNote.getNotesForLead(leadId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ln.lead_id = $1'),
        [leadId]
      );
      expect(result).toEqual(mockNotes);
    });

    it('should return empty array if no notes exist', async () => {
      const leadId = 1;

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await LeadNote.getNotesForLead(leadId);

      expect(result).toEqual([]);
    });
  });
});

