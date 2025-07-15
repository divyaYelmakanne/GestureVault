const express = require('express');
const User = require('../models/User');
const Gesture = require('../models/Gesture');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user's gesture
  const gesture = await Gesture.findByUser(userId);
  
  // Calculate success rate
  const successRate = gesture ? 
    (gesture.usageStats.successfulAttempts / Math.max(1, gesture.usageStats.totalAttempts)) * 100 : 0;

  // Get recent activity
  const recentActivity = gesture ? 
    gesture.history.slice(-10).reverse() : [];

  // Calculate average confidence
  const avgConfidence = gesture ? 
    gesture.usageStats.averageConfidence * 100 : 0;

  // Get user stats
  const user = await User.findById(userId).select('stats achievements');

  res.json({
    success: true,
    data: {
      successRate: Math.round(successRate * 100) / 100,
      totalAttempts: gesture ? gesture.usageStats.totalAttempts : 0,
      successfulAttempts: gesture ? gesture.usageStats.successfulAttempts : 0,
      failedAttempts: gesture ? gesture.usageStats.failedAttempts : 0,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      lastUsed: gesture ? gesture.usageStats.lastUsed : null,
      recentActivity,
      userStats: user.stats,
      achievements: user.achievements
    }
  });
}));

// @route   GET /api/analytics/security
// @desc    Get security insights
// @access  Private
router.get('/security', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  // Calculate security metrics
  const securityScore = Math.min(100, gesture.complexity * 10);
  const riskLevel = securityScore < 50 ? 'Low' : securityScore < 80 ? 'Medium' : 'High';
  
  // Analyze recent attempts for suspicious activity
  const recentAttempts = gesture.history.slice(-20);
  const suspiciousAttempts = recentAttempts.filter(attempt => 
    !attempt.success && attempt.confidence < 0.3
  ).length;

  // Calculate time-based patterns
  const hourlyPatterns = analyzeHourlyPatterns(gesture.history);
  const devicePatterns = analyzeDevicePatterns(gesture.history);

  res.json({
    success: true,
    data: {
      securityScore,
      riskLevel,
      complexity: gesture.complexity,
      suspiciousAttempts,
      hourlyPatterns,
      devicePatterns,
      recommendations: generateSecurityRecommendations(gesture)
    }
  });
}));

// @route   GET /api/analytics/performance
// @desc    Get performance analytics
// @access  Private
router.get('/performance', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const gesture = await Gesture.findByUser(userId);
  if (!gesture) {
    return res.status(404).json({
      success: false,
      message: 'No gesture found for user'
    });
  }

  // Calculate performance metrics
  const avgResponseTime = calculateAverageResponseTime(gesture.history);
  const accuracyTrend = calculateAccuracyTrend(gesture.history);
  const speedAnalysis = analyzeGestureSpeed(gesture.history);

  res.json({
    success: true,
    data: {
      averageResponseTime: avgResponseTime,
      accuracyTrend,
      speedAnalysis,
      performanceScore: calculatePerformanceScore(gesture)
    }
  });
}));

// @route   POST /api/analytics/track
// @desc    Track user interaction
// @access  Private
router.post('/track', asyncHandler(async (req, res) => {
  const { event, data } = req.body;
  const userId = req.user.id;

  // Log analytics event
  logger.info(`Analytics event: ${event}`, {
    userId,
    event,
    data,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Event tracked successfully'
  });
}));

// Helper functions
function analyzeHourlyPatterns(history) {
  const hourlyCounts = new Array(24).fill(0);
  
  history.forEach(attempt => {
    const hour = new Date(attempt.timestamp).getHours();
    hourlyCounts[hour]++;
  });

  return hourlyCounts;
}

function analyzeDevicePatterns(history) {
  const deviceCounts = {};
  
  history.forEach(attempt => {
    if (attempt.deviceInfo && attempt.deviceInfo.deviceType) {
      deviceCounts[attempt.deviceInfo.deviceType] = 
        (deviceCounts[attempt.deviceInfo.deviceType] || 0) + 1;
    }
  });

  return deviceCounts;
}

function generateSecurityRecommendations(gesture) {
  const recommendations = [];

  if (gesture.complexity < 5) {
    recommendations.push({
      type: 'complexity',
      priority: 'high',
      message: 'Consider increasing gesture complexity for better security',
      action: 'Add more positions or increase movement distance'
    });
  }

  if (gesture.usageStats.failedAttempts > gesture.usageStats.successfulAttempts * 0.3) {
    recommendations.push({
      type: 'accuracy',
      priority: 'medium',
      message: 'High failure rate detected. Consider practicing your gesture',
      action: 'Use tutorial mode to improve accuracy'
    });
  }

  if (gesture.biometricData.fluidityScore < 0.7) {
    recommendations.push({
      type: 'fluidity',
      priority: 'low',
      message: 'Gesture could be more fluid for better user experience',
      action: 'Practice smooth, continuous movements'
    });
  }

  return recommendations;
}

function calculateAverageResponseTime(history) {
  if (history.length === 0) return 0;
  
  const responseTimes = history
    .filter(attempt => attempt.performance && attempt.performance.responseTime)
    .map(attempt => attempt.performance.responseTime);
  
  if (responseTimes.length === 0) return 0;
  
  return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
}

function calculateAccuracyTrend(history) {
  if (history.length < 10) return 'insufficient_data';
  
  const recent = history.slice(-10);
  const older = history.slice(-20, -10);
  
  const recentAccuracy = recent.filter(attempt => attempt.success).length / recent.length;
  const olderAccuracy = older.filter(attempt => attempt.success).length / older.length;
  
  if (recentAccuracy > olderAccuracy + 0.1) return 'improving';
  if (recentAccuracy < olderAccuracy - 0.1) return 'declining';
  return 'stable';
}

function analyzeGestureSpeed(history) {
  if (history.length === 0) return { average: 0, trend: 'stable' };
  
  const speeds = history
    .filter(attempt => attempt.performance && attempt.performance.speed)
    .map(attempt => attempt.performance.speed);
  
  if (speeds.length === 0) return { average: 0, trend: 'stable' };
  
  const average = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  
  // Simple trend analysis
  const recent = speeds.slice(-5);
  const older = speeds.slice(-10, -5);
  
  const recentAvg = recent.reduce((sum, speed) => sum + speed, 0) / recent.length;
  const olderAvg = older.reduce((sum, speed) => sum + speed, 0) / older.length;
  
  let trend = 'stable';
  if (recentAvg > olderAvg * 1.1) trend = 'increasing';
  else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
  
  return { average, trend };
}

function calculatePerformanceScore(gesture) {
  let score = 0;
  
  // Success rate (40%)
  const successRate = gesture.usageStats.successfulAttempts / Math.max(1, gesture.usageStats.totalAttempts);
  score += successRate * 40;
  
  // Complexity (30%)
  score += (gesture.complexity / 10) * 30;
  
  // Fluidity (20%)
  score += gesture.biometricData.fluidityScore * 20;
  
  // Consistency (10%)
  const consistency = 1 - (gesture.usageStats.failedAttempts / Math.max(1, gesture.usageStats.totalAttempts));
  score += consistency * 10;
  
  return Math.round(score);
}

module.exports = router; 