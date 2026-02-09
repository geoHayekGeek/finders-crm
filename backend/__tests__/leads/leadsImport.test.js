/**
 * Tests for lead import: controller with mocked service.
 */

const LeadsController = require('../../controllers/leadsController');
const leadsImportService = require('../../services/leadsImport');

jest.mock('../../services/leadsImport');

describe('Leads Import', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Admin', role: 'admin' },
      query: {},
      body: {},
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('importLeads controller', () => {
    it('returns 400 when no file', async () => {
      req.file = null;
      await LeadsController.importLeads(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('file'),
        })
      );
    });

    it('calls dryRun when dryRun=true', async () => {
      req.query.dryRun = 'true';
      req.file = { buffer: Buffer.from('x'), mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
      leadsImportService.dryRun.mockResolvedValue({
        success: true,
        dryRun: true,
        summary: { total: 2, valid: 2, invalid: 0, duplicate: 0 },
      });
      await LeadsController.importLeads(req, res);
      expect(leadsImportService.dryRun).toHaveBeenCalledWith(
        req.file.buffer,
        req.file.mimetype,
        1,
        'admin'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, dryRun: true })
      );
    });

    it('calls commitImport when dryRun is false', async () => {
      req.file = { buffer: Buffer.from('x'), mimetype: 'text/csv' };
      leadsImportService.commitImport.mockResolvedValue({
        success: true,
        dryRun: false,
        importedCount: 1,
        skippedDuplicatesCount: 0,
        errorCount: 0,
      });
      await LeadsController.importLeads(req, res);
      expect(leadsImportService.commitImport).toHaveBeenCalledWith(
        req.file.buffer,
        req.file.mimetype,
        1,
        'admin',
        'skip'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, importedCount: 1 })
      );
    });
  });
});

