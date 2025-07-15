const express = require('express');
const { body, validationResult } = require('express-validator');
const Gesture = require('../models/Gesture');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/gestures/register
// @desc    Register a new gesture for user
// @access  Private
router.post('/register', [
  body('gestureData').isObject(),
  body('gestureData.positions').isArray({ min: 3, max: 10 }),
  body('gestureData.timing').isArray({ min: 3, max: 10 }),
  body('name').optional().isString().trim(),
  body('description').optional().isString().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { gestureData, name, description } = req.body;
  const userId = req.user.id;

  // Check if user already has a gesture
  const existingGesture = await Gesture.findByUser(userId);
  if (existingGesture) {
    return res.status(400).json({
      success: false,
      message: 'User already has a registered gesture'
    });
  }

  // Calculate gesture complexity
  const complexity = calculateComplexity(gestureData);
  
  // Analyze biometric data
  const biometricData = analyzeBiometricData(gestureData);

  // Create new gesture
  const gesture = new Gesture({
    userId,
    gestureData: JSON.stringify(gestureData),
    name: name || 'My Gesture',
    description: description || '',
    complexity,
    sequenceLength: gestureData.positions.length,
    averageDuration: gestureData.timing[gestureData.timing.length - 1] || 0,
    biometricData
  });

  await gesture.save();

  // Update user's gesture reference
  await User.findByIdAndUpdate(userId, {
    gesturePassword: gesture._id
  });

  logger.gesture(`New gesture registered for user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Gesture registered successfully',
    data: {
      gesture: {
        id: gesture._id,
        name: gesture.name,
        complexity: gesture.complexity,
        sequenceLength: gesture.sequenceLength,
        averageDuration: gesture.averageDuration
      }
    }
  });
}));

// @route   POST /api/gestures/validate
// @desc    Validate a gesture for authentication
// @access  Private
router.post('/validate', [
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

  const { gestureData } = req.body;
  const userId = req.user.id;

  // Get user's gesture
  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  // Validate gesture
  const validation = gesture.validateGesture(gestureData);

  logger.gesture(`Gesture validation for user ${req.user.email}: ${validation.success ? 'SUCCESS' : 'FAILED'}`);

  res.json({
    success: true,
    data: {
      isValid: validation.success,
      confidence: validation.confidence,
      message: validation.success ? 'Gesture validated successfully' : 'Gesture validation failed'
    }
  });
}));

// @route   PUT /api/gestures/update
// @desc    Update user's gesture
// @access  Private
router.put('/update', [
  body('gestureData').isObject(),
  body('gestureData.positions').isArray({ min: 3, max: 10 }),
  body('gestureData.timing').isArray({ min: 3, max: 10 }),
  body('name').optional().isString().trim(),
  body('description').optional().isString().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { gestureData, name, description } = req.body;
  const userId = req.user.id;

  // Get user's gesture
  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  // Calculate new complexity and biometric data
  const complexity = calculateComplexity(gestureData);
  const biometricData = analyzeBiometricData(gestureData);

  // Update gesture
  gesture.gestureData = JSON.stringify(gestureData);
  gesture.name = name || gesture.name;
  gesture.description = description || gesture.description;
  gesture.complexity = complexity;
  gesture.sequenceLength = gestureData.positions.length;
  gesture.averageDuration = gestureData.timing[gestureData.timing.length - 1] || 0;
  gesture.biometricData = { ...gesture.biometricData, ...biometricData };

  await gesture.save();

  // Update user stats
  await User.findByIdAndUpdate(userId, {
    $inc: { 'stats.gestureChanges': 1 },
    $set: { 'stats.lastGestureChange': new Date() }
  });

  logger.gesture(`Gesture updated for user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Gesture updated successfully',
    data: {
      gesture: {
        id: gesture._id,
        name: gesture.name,
        complexity: gesture.complexity,
        sequenceLength: gesture.sequenceLength,
        averageDuration: gesture.averageDuration
      }
    }
  });
}));

// @route   GET /api/gestures/profile
// @desc    Get user's gesture profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  res.json({
    success: true,
    data: {
      gesture: {
        id: gesture._id,
        name: gesture.name,
        description: gesture.description,
        complexity: gesture.complexity,
        sequenceLength: gesture.sequenceLength,
        averageDuration: gesture.averageDuration,
        tolerance: gesture.tolerance,
        usageStats: gesture.usageStats,
        createdAt: gesture.createdAt,
        updatedAt: gesture.updatedAt
      }
    }
  });
}));

// @route   GET /api/gestures/history
// @desc    Get gesture usage history
// @access  Private
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  const skip = (page - 1) * limit;
  const history = gesture.history
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    data: {
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: gesture.history.length,
        pages: Math.ceil(gesture.history.length / limit)
      }
    }
  });
}));

// @route   POST /api/gestures/analyze
// @desc    Analyze gesture for security insights
// @access  Private
router.post('/analyze', [
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

  const { gestureData } = req.body;

  // Analyze gesture
  const analysis = analyzeGesture(gestureData);

  res.json({
    success: true,
    data: {
      analysis
    }
  });
}));

// @route   DELETE /api/gestures
// @desc    Delete user's gesture
// @access  Private
router.delete('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  // Soft delete
  gesture.isActive = false;
  await gesture.save();

  logger.gesture(`Gesture deleted for user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Gesture deleted successfully'
  });
}));

// Helper function to calculate gesture complexity
function calculateComplexity(gestureData) {
  const { positions, timing } = gestureData;
  
  let complexity = 1;
  
  // Factor 1: Number of positions
  complexity += positions.length * 0.5;
  
  // Factor 2: Distance between positions
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) +
      Math.pow(curr.y - prev.y, 2) +
      Math.pow(curr.z - prev.z, 2)
    );
    totalDistance += distance;
  }
  complexity += totalDistance * 0.1;
  
  // Factor 3: Timing variation
  const avgTime = timing.reduce((sum, t) => sum + t, 0) / timing.length;
  const timeVariance = timing.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / timing.length;
  complexity += timeVariance * 0.01;
  
  return Math.min(10, Math.max(1, Math.round(complexity)));
}

// Helper function to analyze biometric data
function analyzeBiometricData(gestureData) {
  const { positions, timing } = gestureData;
  
  // Calculate hand size (simplified)
  const handSize = calculateHandSize(positions);
  
  // Calculate finger lengths (simplified)
  const fingerLengths = calculateFingerLengths(positions);
  
  // Calculate gesture speed
  const gestureSpeed = calculateGestureSpeed(positions, timing);
  
  // Calculate fluidity score
  const fluidityScore = calculateFluidityScore(positions, timing);
  
  return {
    handSize: JSON.stringify(handSize),
    fingerLengths: JSON.stringify(fingerLengths),
    gestureSpeed: JSON.stringify(gestureSpeed),
    fluidityScore
  };
}

// Helper function to analyze gesture for security insights
function analyzeGesture(gestureData) {
  const complexity = calculateComplexity(gestureData);
  const biometricData = analyzeBiometricData(gestureData);
  
  return {
    complexity,
    securityScore: Math.min(100, complexity * 10),
    biometricData,
    recommendations: generateRecommendations(complexity, biometricData)
  };
}

// Additional helper functions (simplified implementations)
function calculateHandSize(positions) {
  // Simplified hand size calculation
  return { width: 1.0, height: 1.0 };
}

function calculateFingerLengths(positions) {
  // Simplified finger length calculation
  return { thumb: 1.0, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 };
}

function calculateGestureSpeed(positions, timing) {
  // Calculate average speed between positions
  let totalSpeed = 0;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) +
      Math.pow(curr.y - prev.y, 2) +
      Math.pow(curr.z - prev.z, 2)
    );
    const time = timing[i] - timing[i - 1];
    totalSpeed += distance / time;
  }
  return totalSpeed / (positions.length - 1);
}

function calculateFluidityScore(positions, timing) {
  // Calculate how smooth the gesture is
  let fluidity = 1.0;
  
  for (let i = 2; i < positions.length; i++) {
    const prev = positions[i - 2];
    const curr = positions[i - 1];
    const next = positions[i];
    
    // Check if movement is smooth (no sharp turns)
    const angle = calculateAngle(prev, curr, next);
    if (angle < 90) {
      fluidity -= 0.1;
    }
  }
  
  return Math.max(0, Math.min(1, fluidity));
}

function calculateAngle(p1, p2, p3) {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
  
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
}

function generateRecommendations(complexity, biometricData) {
  const recommendations = [];
  
  if (complexity < 5) {
    recommendations.push('Consider adding more positions to increase security');
  }
  
  if (biometricData.fluidityScore < 0.7) {
    recommendations.push('Practice your gesture to make it more fluid');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Your gesture is well-balanced for security and usability');
  }
  
  return recommendations;
}

module.exports = router; 