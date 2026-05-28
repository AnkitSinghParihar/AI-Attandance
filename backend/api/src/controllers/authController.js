// backend/api/src/controllers/authController.js
const AuthService = require('../services/authService');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, userType, organizationId } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      role,
      userType: userType || role.toLowerCase(),
      organizationId,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, firebaseToken, deviceType, deviceName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await AuthService.login(email, password);

    // Register device token if provided
    if (firebaseToken) {
      try {
        await NotificationService.registerDeviceToken(
          result.user.id,
          firebaseToken,
          deviceType,
          deviceName
        );
      } catch (tokenError) {
        logger.warn('Failed to register device token:', tokenError.message);
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    await AuthService.changePassword(userId, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password required' });
    }

    await AuthService.resetPassword(email, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Reset password error:', error.message);
    res.status(400).json({ error: error.message });
  }
};
