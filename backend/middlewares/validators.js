// middlewares/validators.js
const { body } = require('express-validator');

const registerValidator = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['agent', 'manager', 'operations manager', 'accountant', 'admin'])
    .withMessage('Invalid role'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Invalid phone number'),
  body('location')
    .optional()
    .isString().withMessage('Location must be a string'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').exists().withMessage('Password is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
};
