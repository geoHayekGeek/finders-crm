const permissions = require('../../middlewares/permissions');

describe('Permissions Middleware - Consultant role', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: null, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should allow consultant to view properties', () => {
    req.user = { role: 'consultant' };

    permissions.canViewProperties(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow consultant to manage leads', () => {
    req.user = { role: 'consultant' };

    permissions.canManageLeads(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow consultant to view leads', () => {
    req.user = { role: 'consultant' };

    permissions.canViewLeads(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
