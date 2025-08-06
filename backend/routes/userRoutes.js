// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const authLimiter = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, userController.registerUser);
router.post('/login', authLimiter, userController.loginUser);

module.exports = router;
