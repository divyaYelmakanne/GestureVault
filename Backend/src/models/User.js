const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic user information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  
  // Profile information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  // Gesture authentication
  gesturePassword: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gesture',
    required: true
  },
  
  // Security settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: {
    type: String,
    default: null
  },
  
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Session management
  lastLogin: {
    type: Date,
    default: null
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date,
    default: null
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    accessibility: {
      voiceAssistant: {
        type: Boolean,
        default: false
      },
      highContrast: {
        type: Boolean,
        default: false
      },
      screenReader: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Gamification
  achievements: [{
    type: {
      type: String,
      enum: ['first_gesture', 'complex_gesture', 'streak', 'security_master', 'social_butterfly']
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  
  stats: {
    totalLogins: {
      type: Number,
      default: 0
    },
    successfulLogins: {
      type: Number,
      default: 0
    },
    failedLogins: {
      type: Number,
      default: 0
    },
    gestureChanges: {
      type: Number,
      default: 0
    },
    lastGestureChange: {
      type: Date,
      default: null
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastLoginDate: {
      type: Date,
      default: null
    }
  },
  
  // Social features
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  gestureChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GestureChallenge'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'declined'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Device management
  devices: [{
    deviceId: String,
    deviceName: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'vr']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    isTrusted: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'devices.deviceId': 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema); 