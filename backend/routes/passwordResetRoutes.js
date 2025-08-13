const express = require('express');
const { body } = require('express-validator');
const PasswordResetController = require('../controllers/passwordResetController');
const rateLimiter = require('../middlewares/rateLimiter');

const router = express.Router();

// Validation rules
const emailValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
];

const codeValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Reset code must be 6 digits')
    .isNumeric()
    .withMessage('Reset code must contain only numbers')
];

const passwordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Reset code must be 6 digits')
    .isNumeric()
    .withMessage('Reset code must contain only numbers'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Routes
router.post('/request', 
  rateLimiter(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  emailValidation,
  PasswordResetController.requestReset
);

router.post('/verify', 
  rateLimiter(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  codeValidation,
  PasswordResetController.verifyResetCode
);

router.post('/reset', 
  rateLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  passwordValidation,
  PasswordResetController.resetPassword
);

router.post('/resend', 
  rateLimiter(3, 60 * 1000), // 3 resend requests per minute
  emailValidation,
  PasswordResetController.resendResetCode
);

module.exports = router;
