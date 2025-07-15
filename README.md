# 🥇 GestureVault – Gesture-Based Invisible Password System

A revolutionary touchless authentication system that uses hand gestures as invisible passwords for secure, futuristic login experiences.

## ✨ Features

### 🔐 Core Authentication
- **Gesture Registration**: Create custom gesture passwords with real-time hand tracking
- **Secure Login**: Authenticate using your registered gesture sequence
- **Biometric Analysis**: AI-powered gesture analysis for enhanced security
- **Multi-factor Support**: Combine gestures with voice recognition

### 🎯 User Experience
- **Real-time Hand Tracking**: Live webcam feed with MediaPipe integration
- **Visual Feedback**: Particle effects and animations during gestures
- **Audio Feedback**: Voice assistant prompts and sound effects
- **Tutorial Mode**: Interactive learning with gesture replay
- **Accessibility**: Voice commands and screen reader support

### 🛡️ Security Features
- **Anti-spoofing**: Detection of mimicry and shoulder surfing attempts
- **Encrypted Storage**: Secure gesture data storage with encryption
- **Session Management**: Robust user session handling
- **Cross-device Sync**: Secure gesture sharing across devices

### 🎮 Gamification
- **Achievement System**: Badges for creative gestures and security milestones
- **Leaderboards**: Compare gesture complexity with other users
- **Gesture Challenges**: Social features for gesture sharing and competitions

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Modern web browser with webcam access
- MongoDB (for local development) or Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GestureVault
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd Backend
   npm install

   # Install frontend dependencies
   cd ../Frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend environment variables
   cd Backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application**
   ```bash
   # Start backend server (from Backend directory)
   npm run dev

   # Start frontend (from Frontend directory)
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🛠️ Tech Stack

### Frontend
- **HTML5/CSS3/JavaScript**: Core web technologies
- **MediaPipe Hands**: Real-time hand tracking and gesture recognition
- **TensorFlow.js**: Machine learning for gesture analysis
- **Web Audio API**: Audio feedback and voice processing
- **WebRTC**: Webcam access and real-time communication

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **MongoDB**: Database for user profiles and gesture data
- **JWT**: Authentication and session management
- **bcrypt**: Password and gesture data encryption
- **Socket.io**: Real-time communication

### AI/ML Integration
- **TensorFlow.js**: Client-side gesture analysis
- **MediaPipe**: Hand landmark detection
- **Custom ML Models**: Biometric gesture analysis

## 📁 Project Structure

```
GestureVault/
├── Frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── assets/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── utils/
│   │   └── styles/
│   └── package.json
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
│   ├── config/
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the Backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/gesturevault
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gesturevault

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# MediaPipe Configuration
MEDIAPIPE_MODEL_PATH=./models/hand_landmarker.task

# AI/ML Configuration
TENSORFLOW_MODEL_PATH=./models/gesture_classifier
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user with gesture
- `POST /api/auth/login` - Login with gesture authentication
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile

### Gesture Management

- `POST /api/gestures/register` - Register new gesture sequence
- `POST /api/gestures/validate` - Validate gesture for login
- `PUT /api/gestures/update` - Update user's gesture
- `GET /api/gestures/history` - Get gesture usage history

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

## 🎯 Usage Guide

### First Time Setup

1. **Create Account**: Register with email and create your first gesture password
2. **Gesture Registration**: Follow the tutorial to record your gesture sequence
3. **Practice Mode**: Use the tutorial to perfect your gesture
4. **Login**: Use your gesture to access your account

### Gesture Tips

- **Complexity**: Use 3-5 hand positions for better security
- **Speed**: Maintain consistent timing between gestures
- **Practice**: Use tutorial mode to perfect your gesture
- **Privacy**: Ensure no one can see your gesture sequence

## 🔒 Security Considerations

- Gesture data is encrypted before storage
- Real-time anti-spoofing detection
- Session timeout and automatic logout
- Secure API endpoints with JWT authentication
- HTTPS enforcement in production

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

```bash
cd Frontend
npm run build
# Deploy the build folder to your hosting platform
```

### Backend Deployment (Heroku/Railway)

```bash
cd Backend
# Set environment variables in your hosting platform
git push heroku main
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🔮 Future Roadmap

- [ ] AR/VR gesture support
- [ ] Advanced biometric analysis
- [ ] Enterprise features
- [ ] Mobile app development
- [ ] IoT device integration
- [ ] Blockchain-based gesture verification

---

**Built with ❤️ for the future of secure authentication** 