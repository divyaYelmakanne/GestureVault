const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Gesture = require('../models/Gesture');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user with gesture
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).trim(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('gestureData').isObject(),
  body('gestureData.positions').isArray({ min: 3, max: 10 }),
  body('gestureData.timing').isArray({ min: 3, max: 10 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    email,
    username,
    password,
    firstName,
    lastName,
    gestureData
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email or username already exists'
    });
  }

  // Create gesture first
  const gesture = new Gesture({
    gestureData: JSON.stringify(gestureData),
    sequenceLength: gestureData.positions.length,
    averageDuration: gestureData.timing[gestureData.timing.length - 1] || 0
  });

  await gesture.save();

  // Create user
  const user = new User({
    email,
    username,
    password,
    firstName,
    lastName,
    gesturePassword: gesture._id
  });

  await user.save();

  // Generate token
  const token = generateToken(user._id);

  logger.auth(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
      },
      token
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login with gesture authentication
// @access  Public
router.post('/login', [
  body('identifier').notEmpty(), // email or username
  body('gestureData').isObject(),
  body('gestureData.positions').isArray({ min: 3, max: 10 }),
  body('gestureData.timing').isArray({ min: 3, max: 10 })
], rateLimitByUser(5, 15 * 60 * 1000), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { identifier, gestureData } = req.body;

  // Find user by email or username
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() }
    ]
  }).populate('gesturePassword');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    return res.status(401).json({
      success: false,
      message: 'Account is temporarily locked. Please try again later.'
    });
  }

  // Validate gesture
  const gestureValidation = user.gesturePassword.validateGesture(gestureData);
  
  if (!gestureValidation.success) {
    // Increment failed login attempts
    await user.incLoginAttempts();
    
    logger.security(`Failed login attempt for user: ${user.email}`);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid gesture. Please try again.',
      attemptsRemaining: Math.max(0, 5 - user.loginAttempts - 1)
    });
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update user stats
  user.stats.totalLogins += 1;
  user.stats.successfulLogins += 1;
  user.stats.lastLoginDate = new Date();
  
  // Check for login streak
  const lastLogin = user.stats.lastLoginDate;
  const today = new Date();
  const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) {
    user.stats.streakDays += 1;
  } else if (daysDiff > 1) {
    user.stats.streakDays = 1;
  }

  await user.save();

  // Generate token
  const token = generateToken(user._id);

  logger.auth(`User logged in successfully: ${user.email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        stats: user.stats,
        achievements: user.achievements
      },
      token,
      confidence: gestureValidation.confidence
    }
  });
}));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return a success response
  
  logger.auth(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   GET /api/auth/profile
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

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', asyncHandler(async (req, res) => {
  const token = generateToken(req.user.id);

  res.json({
    success: true,
    data: { token }
  });
}));

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  const { email } = req.body;
  const user = await User.findByEmail(email);

  if (!user) {
    // Don't reveal if user exists or not
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // TODO: Send email with reset link
  // For now, just return the token (in production, send via email)
  
  logger.auth(`Password reset requested for: ${email}`);

  res.json({
    success: true,
    message: 'Password reset link sent to your email'
  });
}));

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  logger.auth(`Password reset completed for: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successful'
  });
}));

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post('/verify-email', [
  body('token').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification token'
    });
  }

  const { token } = req.body;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token'
    });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  logger.auth(`Email verified for: ${user.email}`);

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

module.exports = router; 