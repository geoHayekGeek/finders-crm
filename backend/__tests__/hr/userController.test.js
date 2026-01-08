// __tests__/hr/userController.test.js
const userController = require('../../controllers/userController');
const userModel = require('../../models/userModel');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../utils/jwt');

// Mock all dependencies
jest.mock('../../models/userModel');
jest.mock('bcryptjs');
jest.mock('../../utils/jwt');

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, name: 'Admin User', role: 'admin' },
      params: {},
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully as admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'agent',
        phone: '123456789',
        work_location: 'Office',
        address: '123 Main Street, Beirut'
      };

      userModel.findByEmail.mockResolvedValue(null);
      userModel.generateUniqueUserCode.mockResolvedValue('JD001');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userModel.createUser.mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'agent',
        work_location: 'Office'
      });

      await userController.registerUser(req, res);

      expect(userModel.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(userModel.generateUniqueUserCode).toHaveBeenCalledWith('John Doe');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userModel.createUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        user: expect.objectContaining({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        })
      });
    });

    it('should register a new user successfully as HR', async () => {
      req.user = { id: 1, role: 'hr' };
      req.body = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        role: 'agent',
        phone: '123456789',
        work_location: 'Office',
        address: '456 Oak Avenue, Beirut'
      };

      userModel.findByEmail.mockResolvedValue(null);
      userModel.generateUniqueUserCode.mockResolvedValue('JD002');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userModel.createUser.mockResolvedValue({
        id: 2,
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'agent',
        work_location: 'Office'
      });

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        user: expect.objectContaining({
          id: 2,
          name: 'Jane Doe',
          email: 'jane@example.com'
        })
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = null;
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'agent'
      };

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should return 403 if user is not admin or HR', async () => {
      req.user = { id: 1, role: 'agent' };
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'agent'
      };

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Only admin and HR can create users.'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { name: 'John Doe' };

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields'
      });
    });

    it('should return 409 if user already exists', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'agent'
      };

      userModel.findByEmail.mockResolvedValue({ id: 1, email: 'john@example.com' });

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists'
      });
    });

    it('should handle errors', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'agent'
      };

      userModel.findByEmail.mockRejectedValue(new Error('Database error'));

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error'
      });
    });
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      req.body = { email: 'john@example.com', password: 'password123' };

      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword',
        role: 'agent',
        is_active: true
      };

      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwtUtil.generateToken.mockReturnValue('mockToken');

      await userController.loginUser(req, res);

      expect(userModel.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwtUtil.generateToken).toHaveBeenCalledWith(mockUser);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mockToken',
        user: expect.objectContaining({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        })
      });
    });

    it('should return 401 for invalid credentials (user not found)', async () => {
      req.body = { email: 'john@example.com', password: 'password123' };

      userModel.findByEmail.mockResolvedValue(null);

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid credentials'
      });
    });

    it('should return 403 for disabled account', async () => {
      req.body = { email: 'john@example.com', password: 'password123' };

      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        is_active: false
      };

      userModel.findByEmail.mockResolvedValue(mockUser);

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Your account has been disabled. Please contact an administrator.'
      });
    });

    it('should return 401 for invalid password', async () => {
      req.body = { email: 'john@example.com', password: 'wrongpassword' };

      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        is_active: true
      };

      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid credentials'
      });
    });

    it('should handle errors', async () => {
      req.body = { email: 'john@example.com', password: 'password123' };

      userModel.findByEmail.mockRejectedValue(new Error('Database error'));

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error'
      });
    });
  });

  describe('checkUserExists', () => {
    it('should return true if user exists', async () => {
      req.body = { email: 'john@example.com' };

      userModel.findByEmail.mockResolvedValue({ id: 1, email: 'john@example.com' });

      await userController.checkUserExists(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        exists: true,
        message: 'User found'
      });
    });

    it('should return false if user does not exist', async () => {
      req.body = { email: 'john@example.com' };

      userModel.findByEmail.mockResolvedValue(null);

      await userController.checkUserExists(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        exists: false,
        message: 'User not found'
      });
    });

    it('should return 400 if email is missing', async () => {
      req.body = {};

      await userController.checkUserExists(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required'
      });
    });

    it('should return 400 if request body is missing', async () => {
      req.body = null;

      await userController.checkUserExists(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Request body is missing'
      });
    });

    it('should return 503 for database errors', async () => {
      req.body = { email: 'john@example.com' };

      userModel.findByEmail.mockRejectedValue(new Error('Database connection failed'));

      await userController.checkUserExists(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        exists: false,
        message: 'Database service unavailable. Please try again later.'
      });
    });
  });

  describe('getAllUsers', () => {
    it('should get all users successfully as admin', async () => {
      req.user = { id: 1, role: 'admin' };
      const mockUsers = [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true
        },
        {
          id: 2,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'agent',
          is_active: true
        }
      ];

      userModel.getAllUsers.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res);

      expect(userModel.getAllUsers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Admin User',
            email: 'admin@example.com'
          }),
          expect.objectContaining({
            id: 2,
            name: 'John Doe',
            email: 'john@example.com'
          })
        ])
      });
    });

    it('should get all users successfully as HR', async () => {
      req.user = { id: 1, role: 'hr' };
      const mockUsers = [
        {
          id: 1,
          name: 'HR User',
          email: 'hr@example.com',
          role: 'hr',
          is_active: true
        },
        {
          id: 2,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'agent',
          is_active: true
        }
      ];

      userModel.getAllUsers.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res);

      expect(userModel.getAllUsers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'HR User'
          }),
          expect.objectContaining({
            id: 2,
            name: 'John Doe'
          })
        ])
      });
    });

    it('should return only current user for non-admin/HR users', async () => {
      req.user = { id: 2, role: 'agent' };
      const mockUsers = [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true
        },
        {
          id: 2,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'agent',
          is_active: true
        }
      ];

      userModel.getAllUsers.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res);

      expect(userModel.getAllUsers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: [
          expect.objectContaining({
            id: 2,
            name: 'John Doe',
            email: 'john@example.com'
          })
        ]
      });
      // Should not include admin user
      expect(res.json.mock.calls[0][0].users).not.toContainEqual(
        expect.objectContaining({ id: 1 })
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = null;

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should handle errors', async () => {
      req.user = { id: 1, role: 'admin' };
      userModel.getAllUsers.mockRejectedValue(new Error('Database error'));

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch users'
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully as admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params.id = '2';
      req.body = { name: 'John Updated', email: 'john@example.com', role: 'agent' };

      const mockUser = { id: 2, name: 'John Doe', user_code: 'JD001', role: 'agent' };
      const mockUpdatedUser = { id: 2, name: 'John Updated', email: 'john@example.com' };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.updateUser.mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res);

      expect(userModel.findById).toHaveBeenCalledWith('2');
      expect(userModel.updateUser).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: mockUpdatedUser
      });
    });

    it('should update user successfully as HR', async () => {
      req.user = { id: 1, role: 'hr' };
      req.params.id = '2';
      req.body = { name: 'John Updated', email: 'john@example.com', role: 'agent' };

      const mockUser = { id: 2, name: 'John Doe', user_code: 'JD001', role: 'agent' };
      const mockUpdatedUser = { id: 2, name: 'John Updated', email: 'john@example.com' };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.updateUser.mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: mockUpdatedUser
      });
    });

    it('should allow user to update themselves (restricted fields)', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params.id = '2';
      req.body = { name: 'John Updated', email: 'john@example.com' };

      const mockUser = { id: 2, name: 'John Doe', user_code: 'JD001', role: 'agent', is_active: true };
      const mockUpdatedUser = { id: 2, name: 'John Updated', email: 'john@example.com' };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.updateUser.mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: mockUpdatedUser
      });
    });

    it('should return 403 if non-admin/HR tries to update another user', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params.id = '1';
      req.body = { name: 'Admin Updated' };

      const mockUser = { id: 1, name: 'Admin User', role: 'admin' };

      userModel.findById.mockResolvedValue(mockUser);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Only admin and HR can update other users.'
      });
    });

    it('should return 403 if user tries to change their own role', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params.id = '2';
      req.body = { role: 'admin' };

      const mockUser = { id: 2, name: 'John Doe', role: 'agent', is_active: true };

      userModel.findById.mockResolvedValue(mockUser);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You cannot change your own role.'
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = null;
      req.params.id = '1';
      req.body = { name: 'John Updated' };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should return 404 if user not found', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params.id = '999';
      req.body = { name: 'John Updated' };

      userModel.findById.mockResolvedValue(null);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should return 409 if user code is already taken', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params.id = '1';
      req.body = { user_code: 'JD002' };

      const mockUser = { id: 1, user_code: 'JD001' };
      const mockUserWithCode = { id: 2, user_code: 'JD002' };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByUserCode.mockResolvedValue(mockUserWithCode);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User code already taken'
      });
    });

    it('should hash password if provided', async () => {
      req.params.id = '1';
      req.body = { password: 'newpassword123' };

      const mockUser = { id: 1, user_code: 'JD001' };
      const mockUpdatedUser = { id: 1 };

      userModel.findById.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue('hashedNewPassword');
      userModel.updateUser.mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(userModel.updateUser).toHaveBeenCalledWith('1', expect.objectContaining({
        password: 'hashedNewPassword'
      }));
    });

    it('should handle errors', async () => {
      req.params.id = '1';
      req.body = { name: 'John Updated' };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update user'
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully as admin', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params.id = '2';

      const mockUser = { id: 2, name: 'John Doe', email: 'john@example.com', role: 'agent' };
      const mockDeletedUser = { id: 2, name: 'John Doe', email: 'john@example.com' };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.deleteUser.mockResolvedValue(mockDeletedUser);

      await userController.deleteUser(req, res);

      expect(userModel.findById).toHaveBeenCalledWith('2');
      expect(userModel.deleteUser).toHaveBeenCalledWith('2');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
        user: expect.objectContaining({
          id: 2,
          name: 'John Doe'
        })
      });
    });

    it('should delete user successfully as HR', async () => {
      req.user = { id: 1, role: 'hr' };
      req.params.id = '2';

      const mockUser = { id: 2, name: 'John Doe', email: 'john@example.com', role: 'agent' };
      const mockDeletedUser = { id: 2, name: 'John Doe', email: 'john@example.com' };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.deleteUser.mockResolvedValue(mockDeletedUser);

      await userController.deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
        user: expect.objectContaining({
          id: 2,
          name: 'John Doe'
        })
      });
    });

    it('should return 403 if non-admin/HR tries to delete user', async () => {
      req.user = { id: 2, role: 'agent' };
      req.params.id = '1';

      const mockUser = { id: 1, name: 'Admin User', role: 'admin' };

      userModel.findById.mockResolvedValue(mockUser);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Only admin and HR can delete users.'
      });
    });

    it('should return 403 if user tries to delete themselves', async () => {
      req.user = { id: 1, role: 'admin' };
      req.params.id = '1';

      const mockUser = { id: 1, name: 'Admin User', role: 'admin' };

      userModel.findById.mockResolvedValue(mockUser);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You cannot delete your own account'
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = null;
      req.params.id = '1';

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should return 404 if user not found', async () => {
      req.params.id = '999';

      userModel.findById.mockResolvedValue(null);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should return 403 if trying to delete admin', async () => {
      req.user = { id: 2, role: 'admin' };
      req.params.id = '1';

      const mockUser = { id: 1, name: 'Admin', role: 'admin' };

      userModel.findById.mockResolvedValue(mockUser);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete admin users'
      });
    });

    it('should handle errors', async () => {
      req.params.id = '1';

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete user'
      });
    });
  });

  describe('getAgents', () => {
    it('should get agents and team leaders successfully', async () => {
      const mockAgents = [{ id: 1, name: 'Agent 1', role: 'agent' }];
      const mockTeamLeaders = [{ id: 2, name: 'Team Leader 1', role: 'team_leader' }];

      userModel.getUsersByRole.mockResolvedValueOnce(mockAgents);
      userModel.getUsersByRole.mockResolvedValueOnce(mockTeamLeaders);

      await userController.getAgents(req, res);

      expect(userModel.getUsersByRole).toHaveBeenCalledWith('agent');
      expect(userModel.getUsersByRole).toHaveBeenCalledWith('team_leader');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        agents: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Agent 1' }),
          expect.objectContaining({ id: 2, name: 'Team Leader 1' })
        ])
      });
    });

    it('should handle errors', async () => {
      userModel.getUsersByRole.mockRejectedValue(new Error('Database error'));

      await userController.getAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch agents'
      });
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role successfully', async () => {
      req.params.role = 'agent';
      const mockUsers = [{ id: 1, name: 'Agent 1', role: 'agent' }];

      userModel.getUsersByRole.mockResolvedValue(mockUsers);

      await userController.getUsersByRole(req, res);

      expect(userModel.getUsersByRole).toHaveBeenCalledWith('agent');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Agent 1' })
        ])
      });
    });

    it('should return 400 if role is missing', async () => {
      req.params = {};

      await userController.getUsersByRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role parameter is required'
      });
    });

    it('should get available agents for team leader assignment', async () => {
      req.params.role = 'agent';
      req.query = { forAssignment: 'true', teamLeaderId: '1' };
      const mockAgents = [{ id: 1, name: 'Agent 1', role: 'agent' }];

      userModel.getAvailableAgentsForTeamLeader.mockResolvedValue(mockAgents);

      await userController.getUsersByRole(req, res);

      expect(userModel.getAvailableAgentsForTeamLeader).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Agent 1' })
        ])
      });
    });

    it('should handle errors', async () => {
      req.params.role = 'agent';
      userModel.getUsersByRole.mockRejectedValue(new Error('Database error'));

      await userController.getUsersByRole(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch users by role'
      });
    });
  });

  describe('getTeamLeaders', () => {
    it('should get team leaders successfully', async () => {
      const mockTeamLeaders = [{ id: 1, name: 'Team Leader 1', role: 'team_leader' }];

      userModel.getTeamLeaders.mockResolvedValue(mockTeamLeaders);

      await userController.getTeamLeaders(req, res);

      expect(userModel.getTeamLeaders).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        teamLeaders: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Team Leader 1' })
        ])
      });
    });

    it('should handle errors', async () => {
      userModel.getTeamLeaders.mockRejectedValue(new Error('Database error'));

      await userController.getTeamLeaders(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch team leaders'
      });
    });
  });

  describe('getTeamLeaderAgents', () => {
    it('should get team leader agents successfully', async () => {
      req.params.teamLeaderId = '1';
      const mockAgents = [{ id: 1, name: 'Agent 1', role: 'agent' }];

      userModel.getTeamLeaderAgents.mockResolvedValue(mockAgents);

      await userController.getTeamLeaderAgents(req, res);

      expect(userModel.getTeamLeaderAgents).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        agents: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Agent 1' })
        ])
      });
    });

    it('should return 400 if team leader ID is missing', async () => {
      req.params = {};

      await userController.getTeamLeaderAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team leader ID is required'
      });
    });

    it('should handle errors', async () => {
      req.params.teamLeaderId = '1';
      userModel.getTeamLeaderAgents.mockRejectedValue(new Error('Database error'));

      await userController.getTeamLeaderAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch team leader agents'
      });
    });
  });

  describe('getAgentTeamLeader', () => {
    it('should get agent team leader successfully', async () => {
      req.params.agentId = '1';
      const mockTeamLeader = { id: 1, name: 'Team Leader 1', role: 'team_leader' };

      userModel.getAgentTeamLeader.mockResolvedValue(mockTeamLeader);

      await userController.getAgentTeamLeader(req, res);

      expect(userModel.getAgentTeamLeader).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        teamLeader: expect.objectContaining({
          id: 1,
          name: 'Team Leader 1'
        })
      });
    });

    it('should return null if agent has no team leader', async () => {
      req.params.agentId = '1';

      userModel.getAgentTeamLeader.mockResolvedValue(null);

      await userController.getAgentTeamLeader(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        teamLeader: null,
        message: 'Agent is not assigned to any team leader'
      });
    });

    it('should return 400 if agent ID is missing', async () => {
      req.params = {};

      await userController.getAgentTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Agent ID is required'
      });
    });

    it('should handle errors', async () => {
      req.params.agentId = '1';
      userModel.getAgentTeamLeader.mockRejectedValue(new Error('Database error'));

      await userController.getAgentTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch agent team leader'
      });
    });
  });

  describe('getAvailableAgents', () => {
    it('should get available agents successfully', async () => {
      req.query.teamLeaderId = '1';
      const mockAgents = [{ id: 1, name: 'Agent 1', role: 'agent' }];

      userModel.getAvailableAgentsForTeamLeader.mockResolvedValue(mockAgents);

      await userController.getAvailableAgents(req, res);

      expect(userModel.getAvailableAgentsForTeamLeader).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        agents: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Agent 1' })
        ])
      });
    });

    it('should handle errors', async () => {
      req.query.teamLeaderId = '1';
      userModel.getAvailableAgentsForTeamLeader.mockRejectedValue(new Error('Database error'));

      await userController.getAvailableAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch available agents'
      });
    });
  });

  describe('assignAgentToTeamLeader', () => {
    it('should assign agent to team leader successfully', async () => {
      req.body = { teamLeaderId: 1, agentId: 2 };
      req.user = { id: 1 };

      const mockTeamLeader = { id: 1, role: 'team_leader' };
      const mockAgent = { id: 2, role: 'agent' };
      const mockAssignment = { id: 1, team_leader_id: 1, agent_id: 2, is_active: true };

      userModel.findById.mockResolvedValueOnce(mockTeamLeader);
      userModel.findById.mockResolvedValueOnce(mockAgent);
      userModel.assignAgentToTeamLeader.mockResolvedValue(mockAssignment);

      await userController.assignAgentToTeamLeader(req, res);

      expect(userModel.assignAgentToTeamLeader).toHaveBeenCalledWith(1, 2, 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Agent assigned to team leader successfully',
        assignment: expect.objectContaining({
          id: 1,
          team_leader_id: 1,
          agent_id: 2
        })
      });
    });

    it('should return 400 if team leader ID or agent ID is missing', async () => {
      req.body = { teamLeaderId: 1 };

      await userController.assignAgentToTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team leader ID and agent ID are required'
      });
    });

    it('should return 400 if team leader is invalid', async () => {
      req.body = { teamLeaderId: 1, agentId: 2 };

      userModel.findById.mockResolvedValueOnce(null);

      await userController.assignAgentToTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid team leader'
      });
    });

    it('should return 400 if agent is invalid', async () => {
      req.body = { teamLeaderId: 1, agentId: 2 };

      const mockTeamLeader = { id: 1, role: 'team_leader' };
      userModel.findById.mockResolvedValueOnce(mockTeamLeader);
      userModel.findById.mockResolvedValueOnce(null);

      await userController.assignAgentToTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid agent'
      });
    });

    it('should handle errors', async () => {
      req.body = { teamLeaderId: 1, agentId: 2 };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await userController.assignAgentToTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to assign agent to team leader'
      });
    });
  });

  describe('removeAgentFromTeamLeader', () => {
    it('should remove agent from team leader successfully', async () => {
      req.params = { teamLeaderId: '1', agentId: '2' };

      userModel.removeAgentFromTeamLeader.mockResolvedValue(true);

      await userController.removeAgentFromTeamLeader(req, res);

      expect(userModel.removeAgentFromTeamLeader).toHaveBeenCalledWith('1', '2');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Agent removed from team leader successfully'
      });
    });

    it('should return 400 if IDs are missing', async () => {
      req.params = {};

      await userController.removeAgentFromTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team leader ID and agent ID are required'
      });
    });

    it('should return 404 if assignment not found', async () => {
      req.params = { teamLeaderId: '1', agentId: '2' };

      userModel.removeAgentFromTeamLeader.mockResolvedValue(null);

      await userController.removeAgentFromTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Assignment not found'
      });
    });

    it('should handle errors', async () => {
      req.params = { teamLeaderId: '1', agentId: '2' };

      userModel.removeAgentFromTeamLeader.mockRejectedValue(new Error('Database error'));

      await userController.removeAgentFromTeamLeader(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to remove agent from team leader'
      });
    });
  });

  describe('transferAgent', () => {
    it('should transfer agent successfully', async () => {
      req.body = { currentTeamLeaderId: 1, agentId: 2, newTeamLeaderId: 3 };
      req.user = { id: 1 };

      const mockNewTeamLeader = { id: 3, role: 'team_leader' };
      const mockAgent = { id: 2, role: 'agent' };
      const mockAssignment = { id: 1, team_leader_id: 3, agent_id: 2, is_active: true };

      userModel.findById.mockResolvedValueOnce(mockNewTeamLeader);
      userModel.findById.mockResolvedValueOnce(mockAgent);
      userModel.updateTeamLeaderAgentAssignment.mockResolvedValue(mockAssignment);

      await userController.transferAgent(req, res);

      expect(userModel.updateTeamLeaderAgentAssignment).toHaveBeenCalledWith(1, 2, 3, 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Agent transferred successfully',
        assignment: expect.objectContaining({
          id: 1,
          team_leader_id: 3,
          agent_id: 2
        })
      });
    });

    it('should return 400 if required IDs are missing', async () => {
      req.body = { currentTeamLeaderId: 1 };

      await userController.transferAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current team leader ID, agent ID, and new team leader ID are required'
      });
    });

    it('should return 400 if new team leader is invalid', async () => {
      req.body = { currentTeamLeaderId: 1, agentId: 2, newTeamLeaderId: 3 };

      userModel.findById.mockResolvedValueOnce(null);

      await userController.transferAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid new team leader'
      });
    });

    it('should return 400 if agent is invalid', async () => {
      req.body = { currentTeamLeaderId: 1, agentId: 2, newTeamLeaderId: 3 };

      const mockNewTeamLeader = { id: 3, role: 'team_leader' };
      userModel.findById.mockResolvedValueOnce(mockNewTeamLeader);
      userModel.findById.mockResolvedValueOnce(null);

      await userController.transferAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid agent'
      });
    });

    it('should handle errors', async () => {
      req.body = { currentTeamLeaderId: 1, agentId: 2, newTeamLeaderId: 3 };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await userController.transferAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to transfer agent'
      });
    });
  });
});

