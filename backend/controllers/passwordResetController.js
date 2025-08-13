const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/userModel');
const PasswordReset = require('../models/passwordResetModel');
const emailService = require('../utils/email');

class PasswordResetController {
  // Request password reset
  static async requestReset(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'If an account with this email exists, a password reset code will be sent.'
        });
      }

      // Generate 6-digit reset code
      const resetCode = crypto.randomInt(100000, 999999).toString();
      
      // Set expiration (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Save reset token to database
      await PasswordReset.createToken(email, resetCode, expiresAt);

      // Try to send email, but don't fail if it doesn't work
      let emailSent = false;
      try {
        await emailService.sendPasswordResetEmail(email, resetCode);
        emailSent = true;
      } catch (emailError) {
        console.log('Email service not configured, but token saved to database');
        // Continue without failing the request
      }

      res.status(200).json({
        success: true,
        message: emailSent 
          ? 'If an account with this email exists, a password reset code will be sent.'
          : 'Password reset code generated. Check your email or contact support.',
        email: email,
        resetCode: emailSent ? undefined : resetCode // Only return code if email failed
      });

    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Verify reset code
  static async verifyResetCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { email, code } = req.body;

      // Find valid token
      const resetToken = await PasswordReset.findValidToken(email, code);
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset code'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Reset code verified successfully'
      });

    } catch (error) {
      console.error('Error verifying reset code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Reset password
  static async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { email, code, newPassword } = req.body;
      
      console.log('🔍 Password reset attempt:', { email, code, newPasswordLength: newPassword?.length });

      // Verify token again
      const resetToken = await PasswordReset.findValidToken(email, code);
      if (!resetToken) {
        console.log('❌ Invalid or expired reset code');
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset code'
        });
      }
      
      console.log('✅ Reset token verified');

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      console.log('🔐 Password hashed, length:', hashedPassword.length);

      // Update user password
      const updateResult = await User.updatePassword(email, hashedPassword);
      console.log('📝 Password update result:', updateResult ? 'Success' : 'Failed');
      
      if (!updateResult) {
        console.log('❌ Password update failed - no rows affected');
        return res.status(500).json({
          success: false,
          message: 'Failed to update password'
        });
      }

      // Delete used token
      await PasswordReset.deleteToken(email);
      console.log('🗑️ Reset token deleted');

      // Try to send confirmation email, but don't fail if it doesn't work
      try {
        await emailService.sendPasswordChangedEmail(email);
        console.log('📧 Confirmation email sent');
      } catch (emailError) {
        console.log('Email service not configured, but password reset completed successfully');
        // Continue without failing the request
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Resend reset code
  static async resendResetCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'If an account with this email exists, a password reset code will be sent.'
        });
      }

      // Generate new 6-digit reset code
      const resetCode = crypto.randomInt(100000, 999999).toString();
      
      // Set expiration (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Save new reset token to database
      await PasswordReset.createToken(email, resetCode, expiresAt);

      // Try to send email, but don't fail if it doesn't work
      let emailSent = false;
      try {
        await emailService.sendPasswordResetEmail(email, resetCode);
        emailSent = true;
      } catch (emailError) {
        console.log('Email service not configured, but new token saved to database');
        // Continue without failing the request
      }

      res.status(200).json({
        success: true,
        message: emailSent 
          ? 'New password reset code sent successfully'
          : 'New password reset code generated. Check your email or contact support.',
        email: email,
        resetCode: emailSent ? undefined : resetCode // Only return code if email failed
      });

    } catch (error) {
      console.error('Error resending reset code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = PasswordResetController;
