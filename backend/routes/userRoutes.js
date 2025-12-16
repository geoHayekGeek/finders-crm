// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { registerValidator, loginValidator } = require('../middlewares/validators');
const { validationResult } = require('express-validator');

const userController = require('../controllers/userController');
const { authLimiter } = require('../middlewares/rateLimiter');
const { authenticateToken, canManageUsers, canViewAllUsers } = require('../middlewares/permissions');

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
router.post('/register', authenticateToken, authLimiter, registerValidator, handleValidation, userController.registerUser);

// Protected routes (authentication required)
router.get('/all', authenticateToken, userController.getAllUsers);
router.get('/agents', authenticateToken, userController.getAgents);
router.get('/role/:role', authenticateToken, userController.getUsersByRole);
router.put('/:id', authenticateToken, userController.updateUser);
router.delete('/:id', authenticateToken, canManageUsers, userController.deleteUser);

// Team Leader Routes (all require authentication)
router.get('/team-leaders', authenticateToken, userController.getTeamLeaders);
router.get('/team-leaders/:teamLeaderId/agents', authenticateToken, userController.getTeamLeaderAgents);
router.get('/agents/:agentId/team-leader', authenticateToken, userController.getAgentTeamLeader);
router.get('/available-agents', authenticateToken, userController.getAvailableAgents);
router.post('/assign-agent', authenticateToken, userController.assignAgentToTeamLeader);
router.delete('/team-leaders/:teamLeaderId/agents/:agentId', authenticateToken, userController.removeAgentFromTeamLeader);
router.post('/transfer-agent', authenticateToken, userController.transferAgent);

module.exports = router;
