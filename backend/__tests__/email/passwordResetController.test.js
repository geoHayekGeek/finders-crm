// __tests__/email/passwordResetController.test.js
const PasswordResetController = require('../../controllers/passwordResetController');
const User = require('../../models/userModel');
const PasswordReset = require('../../models/passwordResetModel');
const emailService = require('../../utils/email');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// Mock all dependencies
jest.mock('../../models/userModel');
jest.mock('../../models/passwordResetModel');
jest.mock('../../utils/email');
jest.mock('express-validator');
jest.mock('bcryptjs');

describe('Password Reset Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  describe('requestReset', () => {
    it('should request password reset successfully', async () => {
      req.body = { email: 'user@example.com' };

      const mockUser = { id: 1, email: 'user@example.com' };
      User.findByEmail.mockResolvedValue(mockUser);
      PasswordReset.createToken.mockResolvedValue(true);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      await PasswordResetController.requestReset(req, res);

      expect(User.findByEmail).toHaveBeenCalledWith('user@example.com');
      expect(PasswordReset.createToken).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with this email exists, a password reset code will be sent.',
        email: 'user@example.com'
      });
    });

    it('should return 400 for validation errors', async () => {
      req.body = { email: 'invalid-email' };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid email' }]
      });

      await PasswordResetController.requestReset(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ msg: 'Invalid email' }]
      });
    });

    it('should return 404 if user does not exist', async () => {
      req.body = { email: 'nonexistent@example.com' };
      User.findByEmail.mockResolvedValue(null);

      await PasswordResetController.requestReset(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'If an account with this email exists, a password reset code will be sent.'
      });
    });

    it('should continue even if email sending fails', async () => {
      req.body = { email: 'user@example.com' };

      const mockUser = { id: 1, email: 'user@example.com' };
      User.findByEmail.mockResolvedValue(mockUser);
      PasswordReset.createToken.mockResolvedValue(true);
      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

      await PasswordResetController.requestReset(req, res);

      expect(PasswordReset.createToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset code generated. Check your email or contact support.',
        email: 'user@example.com'
      });
    });

    it('should handle errors', async () => {
      req.body = { email: 'user@example.com' };
      User.findByEmail.mockRejectedValue(new Error('Database error'));

      await PasswordResetController.requestReset(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('verifyResetCode', () => {
    it('should verify reset code successfully', async () => {
      req.body = { email: 'user@example.com', code: '123456' };

      const mockToken = { id: 1, email: 'user@example.com', code: '123456', expires_at: new Date(Date.now() + 600000) };
      PasswordReset.findValidToken.mockResolvedValue(mockToken);

      await PasswordResetController.verifyResetCode(req, res);

      expect(PasswordReset.findValidToken).toHaveBeenCalledWith('user@example.com', '123456');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Reset code verified successfully'
      });
    });

    it('should return 400 for validation errors', async () => {
      req.body = { email: 'user@example.com' };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Code is required' }]
      });

      await PasswordResetController.verifyResetCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ msg: 'Code is required' }]
      });
    });

    it('should return 400 for invalid or expired code', async () => {
      req.body = { email: 'user@example.com', code: '123456' };
      PasswordReset.findValidToken.mockResolvedValue(null);

      await PasswordResetController.verifyResetCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset code'
      });
    });

    it('should handle errors', async () => {
      req.body = { email: 'user@example.com', code: '123456' };
      PasswordReset.findValidToken.mockRejectedValue(new Error('Database error'));

      await PasswordResetController.verifyResetCode(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      req.body = { email: 'user@example.com', code: '123456', newPassword: 'newPassword123' };

      const mockToken = { id: 1, email: 'user@example.com', code: '123456', expires_at: new Date(Date.now() + 600000) };
      PasswordReset.findValidToken.mockResolvedValue(mockToken);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.updatePassword.mockResolvedValue(true);
      PasswordReset.deleteToken.mockResolvedValue(true);
      emailService.sendPasswordChangedEmail.mockResolvedValue(true);

      await PasswordResetController.resetPassword(req, res);

      expect(PasswordReset.findValidToken).toHaveBeenCalledWith('user@example.com', '123456');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
      expect(User.updatePassword).toHaveBeenCalledWith('user@example.com', 'hashedPassword');
      expect(PasswordReset.deleteToken).toHaveBeenCalledWith('user@example.com');
      expect(emailService.sendPasswordChangedEmail).toHaveBeenCalledWith('user@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully'
      });
    });

    it('should return 400 for validation errors', async () => {
      req.body = { email: 'user@example.com' };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'New password is required' }]
      });

      await PasswordResetController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ msg: 'New password is required' }]
      });
    });

    it('should return 400 for invalid or expired code', async () => {
      req.body = { email: 'user@example.com', code: '123456', newPassword: 'newPassword123' };
      PasswordReset.findValidToken.mockResolvedValue(null);

      await PasswordResetController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset code'
      });
    });

    it('should return 500 if password update fails', async () => {
      req.body = { email: 'user@example.com', code: '123456', newPassword: 'newPassword123' };

      const mockToken = { id: 1, email: 'user@example.com', code: '123456', expires_at: new Date(Date.now() + 600000) };
      PasswordReset.findValidToken.mockResolvedValue(mockToken);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.updatePassword.mockResolvedValue(false);

      await PasswordResetController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update password'
      });
    });

    it('should continue even if confirmation email fails', async () => {
      req.body = { email: 'user@example.com', code: '123456', newPassword: 'newPassword123' };

      const mockToken = { id: 1, email: 'user@example.com', code: '123456', expires_at: new Date(Date.now() + 600000) };
      PasswordReset.findValidToken.mockResolvedValue(mockToken);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.updatePassword.mockResolvedValue(true);
      PasswordReset.deleteToken.mockResolvedValue(true);
      emailService.sendPasswordChangedEmail.mockRejectedValue(new Error('Email service error'));

      await PasswordResetController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully'
      });
    });

    it('should handle errors', async () => {
      req.body = { email: 'user@example.com', code: '123456', newPassword: 'newPassword123' };
      PasswordReset.findValidToken.mockRejectedValue(new Error('Database error'));

      await PasswordResetController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('resendResetCode', () => {
    it('should resend reset code successfully', async () => {
      req.body = { email: 'user@example.com' };

      const mockUser = { id: 1, email: 'user@example.com' };
      User.findByEmail.mockResolvedValue(mockUser);
      PasswordReset.createToken.mockResolvedValue(true);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      await PasswordResetController.resendResetCode(req, res);

      expect(User.findByEmail).toHaveBeenCalledWith('user@example.com');
      expect(PasswordReset.createToken).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'New password reset code sent successfully',
        email: 'user@example.com'
      });
    });

    it('should return 400 for validation errors', async () => {
      req.body = { email: 'invalid-email' };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid email' }]
      });

      await PasswordResetController.resendResetCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ msg: 'Invalid email' }]
      });
    });

    it('should return 404 if user does not exist', async () => {
      req.body = { email: 'nonexistent@example.com' };
      User.findByEmail.mockResolvedValue(null);

      await PasswordResetController.resendResetCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'If an account with this email exists, a password reset code will be sent.'
      });
    });

    it('should continue even if email sending fails', async () => {
      req.body = { email: 'user@example.com' };

      const mockUser = { id: 1, email: 'user@example.com' };
      User.findByEmail.mockResolvedValue(mockUser);
      PasswordReset.createToken.mockResolvedValue(true);
      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

      await PasswordResetController.resendResetCode(req, res);

      expect(PasswordReset.createToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'New password reset code generated. Check your email or contact support.',
        email: 'user@example.com'
      });
    });

    it('should handle errors', async () => {
      req.body = { email: 'user@example.com' };
      User.findByEmail.mockRejectedValue(new Error('Database error'));

      await PasswordResetController.resendResetCode(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});

