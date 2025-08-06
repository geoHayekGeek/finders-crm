// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { registerValidator, loginValidator } = require('../middlewares/validators');
const { validationResult } = require('express-validator');

const userController = require('../controllers/userController');
const authLimiter = require('../middlewares/rateLimiter');

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

module.exports = router;
