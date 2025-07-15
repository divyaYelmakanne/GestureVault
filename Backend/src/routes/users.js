const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password')
    .populate('gesturePassword', 'name complexity sequenceLength');

  res.json({
    success: true,
    data: { user }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('avatar').optional().isURL()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { firstName, lastName, avatar } = req.body;
  const updateData = {};

  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (avatar) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  logger.info(`Profile updated for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', [
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('language').optional().isString(),
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
  body('accessibility.voiceAssistant').optional().isBoolean(),
  body('accessibility.highContrast').optional().isBoolean(),
  body('accessibility.screenReader').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { theme, language, notifications, accessibility } = req.body;
  const updateData = {};

  if (theme) updateData['preferences.theme'] = theme;
  if (language) updateData['preferences.language'] = language;
  
  if (notifications) {
    if (notifications.email !== undefined) updateData['preferences.notifications.email'] = notifications.email;
    if (notifications.push !== undefined) updateData['preferences.notifications.push'] = notifications.push;
    if (notifications.sms !== undefined) updateData['preferences.notifications.sms'] = notifications.sms;
  }
  
  if (accessibility) {
    if (accessibility.voiceAssistant !== undefined) updateData['preferences.accessibility.voiceAssistant'] = accessibility.voiceAssistant;
    if (accessibility.highContrast !== undefined) updateData['preferences.accessibility.highContrast'] = accessibility.highContrast;
    if (accessibility.screenReader !== undefined) updateData['preferences.accessibility.screenReader'] = accessibility.screenReader;
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: { user }
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('stats achievements');

  res.json({
    success: true,
    data: {
      stats: user.stats,
      achievements: user.achievements
    }
  });
}));

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // Soft delete
  user.isActive = false;
  await user.save();

  logger.info(`Account deleted for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

module.exports = router; 