// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { registerValidator, loginValidator } = require('../middlewares/validators');
const { validationResult } = require('express-validator');

const userController = require('../controllers/userController');
const { authLimiter, createRateLimiter } = require('../middlewares/rateLimiter');
const { authenticateToken, canManageUsers, canViewAllUsers } = require('../middlewares/permissions');

// Rate limiter for user management operations (stricter than auth limiter)
const userManagementLimiter = createRateLimiter(20, 15 * 60 * 1000); // 20 requests per 15 minutes

// Ensure JSON body parsing for this route
router.use(express.json());

// Middleware to handle validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes (no authentication required)
router.post('/login', authLimiter, loginValidator, handleValidation, userController.loginUser);
router.post('/check-exists', userController.checkUserExists);

// Protected routes - user registration requires authentication (admin/HR only)
router.post('/register', authenticateToken, canManageUsers, userManagementLimiter, registerValidator, handleValidation, userController.registerUser);

// Protected routes (authentication required)
router.get('/all', authenticateToken, canViewAllUsers, userController.getAllUsers);
router.get('/agents', authenticateToken, userController.getAgents);
router.get('/role/:role', authenticateToken, userController.getUsersByRole);
router.put('/:id', authenticateToken, userManagementLimiter, userController.updateUser);
router.delete('/:id', authenticateToken, canManageUsers, userManagementLimiter, userController.deleteUser);

// Team Leader Routes (all require authentication and permission checks)
router.get('/team-leaders', authenticateToken, userController.getTeamLeaders);
router.get('/team-leaders/:teamLeaderId/agents', authenticateToken, userController.getTeamLeaderAgents);
router.get('/agents/:agentId/team-leader', authenticateToken, userController.getAgentTeamLeader);
router.get('/available-agents', authenticateToken, userController.getAvailableAgents);
router.post('/assign-agent', authenticateToken, canManageUsers, userManagementLimiter, userController.assignAgentToTeamLeader);
router.delete('/team-leaders/:teamLeaderId/agents/:agentId', authenticateToken, canManageUsers, userManagementLimiter, userController.removeAgentFromTeamLeader);
router.post('/transfer-agent', authenticateToken, canManageUsers, userManagementLimiter, userController.transferAgent);

module.exports = router;
