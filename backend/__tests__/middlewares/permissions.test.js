// __tests__/middlewares/permissions.test.js
const permissions = require('../../middlewares/permissions');
const jwt = require('jsonwebtoken');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('Permissions Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true for valid permission', () => {
      const result = permissions.hasPermission('admin', 'properties', 'create');
      expect(result).toBe(true);
    });

    it('should return false for invalid role', () => {
      const result = permissions.hasPermission('invalid_role', 'properties', 'create');
      expect(result).toBe(false);
    });

    it('should return false for invalid resource', () => {
      const result = permissions.hasPermission('admin', 'invalid_resource', 'create');
      expect(result).toBe(false);
    });

    it('should return false for invalid action', () => {
      const result = permissions.hasPermission('admin', 'properties', 'invalid_action');
      expect(result).toBe(false);
    });

    it('should check permissions for different roles', () => {
      expect(permissions.hasPermission('admin', 'properties', 'delete')).toBe(true);
      expect(permissions.hasPermission('agent', 'properties', 'delete')).toBe(false);
      expect(permissions.hasPermission('agent', 'properties', 'read')).toBe(true);
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockDecoded = { id: 1, role: 'admin' };
      req.headers['authorization'] = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockDecoded);

      permissions.authenticateToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      req.headers['authorization'] = undefined;

      permissions.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header missing', () => {
      delete req.headers['authorization'];

      permissions.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
    });

    it('should return 403 for invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      permissions.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should extract token from Bearer format', () => {
      const mockDecoded = { id: 1, role: 'admin' };
      req.headers['authorization'] = 'Bearer token123';
      jwt.verify.mockReturnValue(mockDecoded);

      permissions.authenticateToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('token123', 'test-secret');
    });
  });

  describe('checkPermission', () => {
    it('should allow access for user with permission', () => {
      req.user = { role: 'admin' };

      const middleware = permissions.checkPermission('properties', 'create');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for user without permission', () => {
      req.user = { role: 'agent' };

      const middleware = permissions.checkPermission('properties', 'delete');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. agent cannot delete properties'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role not found', () => {
      req.user = {};

      const middleware = permissions.checkPermission('properties', 'create');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'User role not found' });
    });

    it('should return 403 if user not found', () => {
      req.user = null;

      const middleware = permissions.checkPermission('properties', 'create');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'User role not found' });
    });
  });

  describe('canViewFinancialData', () => {
    it('should allow admin to view financial data', () => {
      req.user = { role: 'admin' };

      permissions.canViewFinancialData(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow operations manager to view financial data', () => {
      req.user = { role: 'operations manager' };

      permissions.canViewFinancialData(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny agent access to financial data', () => {
      req.user = { role: 'agent' };

      permissions.canViewFinancialData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. Financial data restricted to admin and operations manager only.'
      });
    });

    it('should return 403 if user role not found', () => {
      req.user = null;

      permissions.canViewFinancialData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'User role not found' });
    });
  });

  describe('canViewAgentPerformance', () => {
    it('should allow admin to view agent performance', () => {
      req.user = { role: 'admin' };
      permissions.canViewAgentPerformance(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow agent manager to view agent performance', () => {
      req.user = { role: 'agent manager' };
      permissions.canViewAgentPerformance(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow team_leader to view agent performance', () => {
      req.user = { role: 'team_leader' };
      permissions.canViewAgentPerformance(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny agent access to agent performance', () => {
      req.user = { role: 'agent' };
      permissions.canViewAgentPerformance(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canManageProperties', () => {
    it('should allow admin to manage properties', () => {
      req.user = { role: 'admin' };
      permissions.canManageProperties(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow operations to manage properties', () => {
      req.user = { role: 'operations' };
      permissions.canManageProperties(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny agent access to manage properties', () => {
      req.user = { role: 'agent' };
      permissions.canManageProperties(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canViewProperties', () => {
    it('should allow agent to view properties', () => {
      req.user = { role: 'agent' };
      permissions.canViewProperties(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow team_leader to view properties', () => {
      req.user = { role: 'team_leader' };
      permissions.canViewProperties(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny accountant access to view properties', () => {
      req.user = { role: 'accountant' };
      permissions.canViewProperties(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canManageUsers', () => {
    it('should allow admin to manage users', () => {
      req.user = { role: 'admin' };
      permissions.canManageUsers(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny operations access to manage users', () => {
      req.user = { role: 'operations' };
      permissions.canManageUsers(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canManageCategoriesAndStatuses', () => {
    it('should allow admin to manage categories and statuses', () => {
      req.user = { role: 'admin' };
      permissions.canManageCategoriesAndStatuses(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow agent manager to manage categories and statuses', () => {
      req.user = { role: 'agent manager' };
      permissions.canManageCategoriesAndStatuses(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny agent access to manage categories and statuses', () => {
      req.user = { role: 'agent' };
      permissions.canManageCategoriesAndStatuses(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canViewCategoriesAndStatuses', () => {
    it('should allow agent to view categories and statuses', () => {
      req.user = { role: 'agent' };
      permissions.canViewCategoriesAndStatuses(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny accountant access to view categories and statuses', () => {
      req.user = { role: 'accountant' };
      permissions.canViewCategoriesAndStatuses(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canViewAllData', () => {
    it('should allow admin to view all data', () => {
      req.user = { role: 'admin' };
      permissions.canViewAllData(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny agent access to view all data', () => {
      req.user = { role: 'agent' };
      permissions.canViewAllData(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canManageLeads', () => {
    it('should allow admin to manage leads', () => {
      req.user = { role: 'admin' };
      permissions.canManageLeads(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow operations to manage leads', () => {
      req.user = { role: 'operations' };
      permissions.canManageLeads(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny agent access to manage leads', () => {
      req.user = { role: 'agent' };
      permissions.canManageLeads(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('canViewLeads', () => {
    it('should allow agent to view leads', () => {
      req.user = { role: 'agent' };
      permissions.canViewLeads(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow team_leader to view leads', () => {
      req.user = { role: 'team_leader' };
      permissions.canViewLeads(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny accountant access to view leads', () => {
      req.user = { role: 'accountant' };
      permissions.canViewLeads(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('filterDataByRole', () => {
    it('should set role filters for admin', () => {
      req.user = { role: 'admin' };

      permissions.filterDataByRole(req, res, next);

      expect(req.roleFilters).toEqual({
        role: 'admin',
        canViewAll: true,
        canViewFinancial: true,
        canViewAgentPerformance: true,
        canManageProperties: true,
        canViewProperties: true,
        canManageUsers: true,
        canManageCategoriesAndStatuses: true,
        canViewCategoriesAndStatuses: true,
        canManageLeads: true,
        canViewLeads: true,
        canViewClients: true,
        canManageViewings: true,
        canViewViewings: true,
        canManageAllViewings: true
      });
      expect(next).toHaveBeenCalled();
    });

    it('should set role filters for agent', () => {
      req.user = { role: 'agent' };

      permissions.filterDataByRole(req, res, next);

      expect(req.roleFilters).toEqual({
        role: 'agent',
        canViewAll: false,
        canViewFinancial: false,
        canViewAgentPerformance: false,
        canManageProperties: false,
        canViewProperties: true,
        canManageUsers: false,
        canManageCategoriesAndStatuses: false,
        canViewCategoriesAndStatuses: true,
        canManageLeads: false,
        canViewLeads: true,
        canViewClients: false,
        canManageViewings: false,
        canViewViewings: true,
        canManageAllViewings: false
      });
    });

    it('should return 403 if user not found', () => {
      req.user = null;

      permissions.filterDataByRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'User role not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if role not found', () => {
      req.user = {};

      permissions.filterDataByRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'User role not found' });
    });
  });
});








