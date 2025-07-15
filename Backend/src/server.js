const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import configurations
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const gestureRoutes = require('./routes/gestures');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const socialRoutes = require('./routes/social');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();

// ... all your app.use() for middleware, routes, etc.

// API routes
app.use('/api/auth', authRoutes);
// ... other routes

// Error handling middleware (should be last, after all routes)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

const server = createServer(app);

// Socket.io setup for real-time communication
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Handle gesture validation in real-time
  socket.on('gesture-validation', async (data) => {
    try {
      // Process gesture validation
      const { userId, gestureData } = data;
      // Add gesture validation logic here
      socket.emit('gesture-result', { success: true, message: 'Gesture validated' });
    } catch (error) {
      logger.error('Socket error:', error);
      socket.emit('gesture-result', { success: false, message: 'Validation failed' });
    }
  });

  // Handle voice commands
  socket.on('voice-command', (data) => {
    try {
      const { command, userId } = data;
      // Process voice commands
      socket.emit('voice-response', { success: true, response: `Processed: ${command}` });
    } catch (error) {
      logger.error('Voice command error:', error);
      socket.emit('voice-response', { success: false, message: 'Command failed' });
    }
  });

  // Handle tutorial mode
  socket.on('tutorial-request', (data) => {
    try {
      const { tutorialType, userId } = data;
      // Send tutorial data
      socket.emit('tutorial-data', {
        type: tutorialType,
        steps: ['Step 1', 'Step 2', 'Step 3'],
        success: true
      });
    } catch (error) {
      logger.error('Tutorial error:', error);
      socket.emit('tutorial-data', { success: false, message: 'Tutorial failed' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 GestureVault Backend Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 