const mongoose = require('mongoose');
const crypto = require('crypto');

const gestureSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  gestureData: {
    type: String,
    required: true
  },
  
  name: {
    type: String,
    default: 'My Gesture'
  },
  
  complexity: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  
  sequenceLength: {
    type: Number,
    required: true,
    min: 3,
    max: 10
  },
  
  biometricData: {
    handSize: String,
    fingerLengths: String,
    gestureSpeed: String,
    fluidityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  
  encryptionKey: {
    type: String,
    required: true
  },
  
  iv: {
    type: String,
    required: true
  },
  
  salt: {
    type: String,
    required: true
  },
  
  tolerance: {
    position: {
      type: Number,
      default: 0.15,
      min: 0.05,
      max: 0.5
    },
    timing: {
      type: Number,
      default: 0.2,
      min: 0.1,
      max: 0.5
    }
  },
  
  usageStats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    successfulAttempts: {
      type: Number,
      default: 0
    },
    failedAttempts: {
      type: Number,
      default: 0
    },
    averageConfidence: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

gestureSchema.index({ userId: 1 });
gestureSchema.index({ isActive: 1 });

gestureSchema.pre('save', function(next) {
  if (this.isNew) {
    this.salt = crypto.randomBytes(32).toString('hex');
    this.iv = crypto.randomBytes(16).toString('hex');
    this.encryptionKey = crypto.pbkdf2Sync(
      process.env.JWT_SECRET || 'default-secret',
      this.salt,
      100000,
      32,
      'sha512'
    ).toString('hex');
  }
  next();
});

gestureSchema.methods.encryptGestureData = function(data) {
  const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

gestureSchema.methods.decryptGestureData = function() {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(this.gestureData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt gesture data');
  }
};

gestureSchema.methods.validateGesture = function(inputGesture) {
  try {
    const storedGesture = this.decryptGestureData();
    
    const positionMatch = this.comparePositions(storedGesture.positions, inputGesture.positions);
    const timingMatch = this.compareTiming(storedGesture.timing, inputGesture.timing);
    
    const success = positionMatch && timingMatch;
    const confidence = this.calculateConfidence(storedGesture, inputGesture);
    
    this.usageStats.totalAttempts += 1;
    if (success) {
      this.usageStats.successfulAttempts += 1;
    } else {
      this.usageStats.failedAttempts += 1;
    }
    
    this.usageStats.lastUsed = new Date();
    this.save();
    
    return { success, confidence };
  } catch (error) {
    throw new Error('Gesture validation failed');
  }
};

gestureSchema.methods.comparePositions = function(stored, input) {
  const tolerance = this.tolerance.position;
  
  for (let i = 0; i < Math.min(stored.length, input.length); i++) {
    const storedPos = stored[i];
    const inputPos = input[i];
    
    const distance = Math.sqrt(
      Math.pow(storedPos.x - inputPos.x, 2) +
      Math.pow(storedPos.y - inputPos.y, 2) +
      Math.pow(storedPos.z - inputPos.z, 2)
    );
    
    if (distance > tolerance) {
      return false;
    }
  }
  
  return true;
};

gestureSchema.methods.compareTiming = function(stored, input) {
  const tolerance = this.tolerance.timing;
  
  for (let i = 0; i < Math.min(stored.length, input.length); i++) {
    const timeDiff = Math.abs(stored[i] - input[i]);
    const relativeDiff = timeDiff / stored[i];
    
    if (relativeDiff > tolerance) {
      return false;
    }
  }
  
  return true;
};

gestureSchema.methods.calculateConfidence = function(stored, input) {
  let confidence = 0;
  
  const positionConfidence = this.calculatePositionConfidence(stored.positions, input.positions);
  const timingConfidence = this.calculateTimingConfidence(stored.timing, input.timing);
  
  confidence = (positionConfidence + timingConfidence) / 2;
  
  return Math.max(0, Math.min(1, confidence));
};

gestureSchema.statics.findByUser = function(userId) {
  return this.findOne({ userId, isActive: true });
};

module.exports = mongoose.model('Gesture', gestureSchema); 