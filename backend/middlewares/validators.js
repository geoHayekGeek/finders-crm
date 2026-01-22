// middlewares/validators.js
const { body } = require('express-validator');

// Phone number validation regex (international format, accepts spaces, dashes, parentheses)
const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{6,19}$/;

const registerValidator = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character'),
  body('role')
    .isIn(['agent', 'agent manager', 'operations', 'operations manager', 'admin', 'accountant', 'team_leader'])
    .withMessage('Invalid role. Must be one of: agent, agent manager, operations, operations manager, admin, accountant, team_leader'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format. Use international format (e.g., +961 03 985 423)'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').exists().withMessage('Password is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
};
