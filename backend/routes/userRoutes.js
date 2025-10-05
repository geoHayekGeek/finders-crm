// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { registerValidator, loginValidator } = require('../middlewares/validators');
const { validationResult } = require('express-validator');

const userController = require('../controllers/userController');
const { authLimiter } = require('../middlewares/rateLimiter');

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

router.post('/register', authLimiter, registerValidator, handleValidation, userController.registerUser);
router.post('/login', authLimiter, loginValidator, handleValidation, userController.loginUser);
router.post('/check-exists', userController.checkUserExists);
router.get('/all', userController.getAllUsers);
router.get('/agents', userController.getAgents);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Team Leader Routes
router.get('/team-leaders', userController.getTeamLeaders);
router.get('/team-leaders/:teamLeaderId/agents', userController.getTeamLeaderAgents);
router.get('/agents/:agentId/team-leader', userController.getAgentTeamLeader);
router.get('/available-agents', userController.getAvailableAgents);
router.post('/assign-agent', userController.assignAgentToTeamLeader);
router.delete('/team-leaders/:teamLeaderId/agents/:agentId', userController.removeAgentFromTeamLeader);
router.post('/transfer-agent', userController.transferAgent);

module.exports = router;
