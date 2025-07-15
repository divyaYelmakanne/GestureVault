const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/social/leaderboard
// @desc    Get gesture complexity leaderboard
// @access  Private
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Get users with their gesture complexity scores
  const users = await User.find({ isActive: true })
    .populate('gesturePassword', 'complexity name')
    .select('username firstName lastName stats achievements')
    .sort({ 'gesturePassword.complexity': -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments({ isActive: true });

  const leaderboard = users.map((user, index) => ({
    rank: skip + index + 1,
    username: user.username,
    fullName: user.fullName,
    complexity: user.gesturePassword?.complexity || 0,
    gestureName: user.gesturePassword?.name || 'Unknown',
    achievements: user.achievements.length,
    streakDays: user.stats.streakDays
  }));

  res.json({
    success: true,
    data: {
      leaderboard,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   POST /api/social/challenge
// @desc    Create a gesture challenge
// @access  Private
router.post('/challenge', [
  body('targetUserId').isMongoId(),
  body('message').optional().isString().trim(),
  body('gestureData').isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { targetUserId, message, gestureData } = req.body;
  const challengerId = req.user.id;

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found'
    });
  }

  // Check if user is challenging themselves
  if (challengerId === targetUserId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot challenge yourself'
    });
  }

  // Create challenge
  const challenge = {
    challengerId,
    targetUserId,
    message: message || 'I challenge you to beat my gesture!',
    gestureData,
    status: 'pending',
    createdAt: new Date()
  };

  // Add challenge to target user's challenges
  targetUser.gestureChallenges.push(challenge);
  await targetUser.save();

  logger.info(`Gesture challenge created: ${req.user.username} -> ${targetUser.username}`);

  res.status(201).json({
    success: true,
    message: 'Challenge sent successfully',
    data: { challenge }
  });
}));

// @route   GET /api/social/challenges
// @desc    Get user's gesture challenges
// @access  Private
router.get('/challenges', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status = 'all' } = req.query;

  const user = await User.findById(userId)
    .populate('gestureChallenges.challengerId', 'username firstName lastName');

  let challenges = user.gestureChallenges;

  // Filter by status if specified
  if (status !== 'all') {
    challenges = challenges.filter(challenge => challenge.status === status);
  }

  // Sort by creation date
  challenges.sort((a, b) => b.createdAt - a.createdAt);

  res.json({
    success: true,
    data: { challenges }
  });
}));

// @route   PUT /api/social/challenges/:challengeId/respond
// @desc    Respond to a gesture challenge
// @access  Private
router.put('/challenges/:challengeId/respond', [
  body('response').isIn(['accept', 'decline']),
  body('gestureData').optional().isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { challengeId } = req.params;
  const { response, gestureData } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  const challenge = user.gestureChallenges.id(challengeId);

  if (!challenge) {
    return res.status(404).json({
      success: false,
      message: 'Challenge not found'
    });
  }

  if (challenge.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Challenge has already been responded to'
    });
  }

  // Update challenge status
  challenge.status = response === 'accept' ? 'accepted' : 'declined';
  challenge.respondedAt = new Date();

  if (response === 'accept' && gestureData) {
    // Compare gestures and determine winner
    const winner = compareGestures(challenge.gestureData, gestureData);
    challenge.winner = winner;
    challenge.completedAt = new Date();
    challenge.status = 'completed';
  }

  await user.save();

  logger.info(`Challenge response: ${req.user.username} ${response}ed challenge`);

  res.json({
    success: true,
    message: `Challenge ${response}ed successfully`,
    data: { challenge }
  });
}));

// @route   POST /api/social/share
// @desc    Share gesture with another user
// @access  Private
router.post('/share', [
  body('targetUserId').isMongoId(),
  body('message').optional().isString().trim(),
  body('allowCopying').optional().isBoolean(),
  body('expirationDate').optional().isISO8601()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { targetUserId, message, allowCopying, expirationDate } = req.body;
  const sharerId = req.user.id;

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found'
    });
  }

  // Get sharer's gesture
  const sharer = await User.findById(sharerId).populate('gesturePassword');
  if (!sharer.gesturePassword) {
    return res.status(400).json({
      success: false,
      message: 'No gesture to share'
    });
  }

  // Create share record
  const share = {
    sharerId,
    targetUserId,
    message: message || 'Check out my gesture!',
    gestureId: sharer.gesturePassword._id,
    allowCopying: allowCopying || false,
    expirationDate: expirationDate ? new Date(expirationDate) : null,
    createdAt: new Date()
  };

  // Add to target user's shared gestures
  if (!targetUser.sharedGestures) {
    targetUser.sharedGestures = [];
  }
  targetUser.sharedGestures.push(share);
  await targetUser.save();

  logger.info(`Gesture shared: ${req.user.username} -> ${targetUser.username}`);

  res.status(201).json({
    success: true,
    message: 'Gesture shared successfully',
    data: { share }
  });
}));

// @route   GET /api/social/shared
// @desc    Get gestures shared with user
// @access  Private
router.get('/shared', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId)
    .populate('sharedGestures.sharerId', 'username firstName lastName')
    .populate('sharedGestures.gestureId', 'name complexity');

  const sharedGestures = user.sharedGestures || [];

  // Filter out expired shares
  const activeShares = sharedGestures.filter(share => 
    !share.expirationDate || share.expirationDate > new Date()
  );

  res.json({
    success: true,
    data: { sharedGestures: activeShares }
  });
}));

// @route   GET /api/social/friends
// @desc    Get user's friends
// @access  Private
router.get('/friends', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId)
    .populate('friends', 'username firstName lastName stats achievements');

  const friends = user.friends || [];

  res.json({
    success: true,
    data: { friends }
  });
}));

// @route   POST /api/social/friends/add
// @desc    Add a friend
// @access  Private
router.post('/friends/add', [
  body('friendId').isMongoId()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { friendId } = req.body;
  const userId = req.user.id;

  if (userId === friendId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot add yourself as a friend'
    });
  }

  // Check if friend exists
  const friend = await User.findById(friendId);
  if (!friend) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Add friend to both users
  await User.findByIdAndUpdate(userId, {
    $addToSet: { friends: friendId }
  });

  await User.findByIdAndUpdate(friendId, {
    $addToSet: { friends: userId }
  });

  logger.info(`Friend added: ${req.user.username} + ${friend.username}`);

  res.json({
    success: true,
    message: 'Friend added successfully'
  });
}));

// @route   DELETE /api/social/friends/:friendId
// @desc    Remove a friend
// @access  Private
router.delete('/friends/:friendId', asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;

  // Remove friend from both users
  await User.findByIdAndUpdate(userId, {
    $pull: { friends: friendId }
  });

  await User.findByIdAndUpdate(friendId, {
    $pull: { friends: userId }
  });

  logger.info(`Friend removed: ${req.user.username} - ${friendId}`);

  res.json({
    success: true,
    message: 'Friend removed successfully'
  });
}));

// Helper function to compare gestures
function compareGestures(gesture1, gesture2) {
  // Simplified gesture comparison
  // In a real implementation, this would use more sophisticated algorithms
  
  const complexity1 = calculateComplexity(gesture1);
  const complexity2 = calculateComplexity(gesture2);
  
  if (complexity1 > complexity2) return 'challenger';
  if (complexity2 > complexity1) return 'target';
  return 'tie';
}

// Helper function to calculate complexity (simplified)
function calculateComplexity(gestureData) {
  const { positions } = gestureData;
  return positions.length * 0.5;
}

module.exports = router; 