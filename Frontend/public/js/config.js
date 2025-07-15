// GestureVault Configuration
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:5000/api',
        ENDPOINTS: {
            AUTH: {
                REGISTER: '/auth/register',
                LOGIN: '/auth/login',
                LOGOUT: '/auth/logout',
                PROFILE: '/auth/profile',
                REFRESH: '/auth/refresh',
                FORGOT_PASSWORD: '/auth/forgot-password',
                RESET_PASSWORD: '/auth/reset-password',
                VERIFY_EMAIL: '/auth/verify-email'
            },
            GESTURES: {
                REGISTER: '/gestures/register',
                VALIDATE: '/gestures/validate',
                UPDATE: '/gestures/update',
                PROFILE: '/gestures/profile',
                HISTORY: '/gestures/history',
                ANALYZE: '/gestures/analyze',
                DELETE: '/gestures'
            },
            USERS: {
                PROFILE: '/users/profile',
                PREFERENCES: '/users/preferences',
                STATS: '/users/stats',
                ACCOUNT: '/users/account'
            },
            ANALYTICS: {
                DASHBOARD: '/analytics/dashboard',
                SECURITY: '/analytics/security',
                PERFORMANCE: '/analytics/performance',
                TRACK: '/analytics/track'
            },
            SOCIAL: {
                LEADERBOARD: '/social/leaderboard',
                CHALLENGE: '/social/challenge',
                CHALLENGES: '/social/challenges',
                SHARE: '/social/share',
                SHARED: '/social/shared',
                FRIENDS: '/social/friends',
                ADD_FRIEND: '/social/friends/add'
            }
        },
        TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3
    },

    // MediaPipe Configuration
    MEDIAPIPE: {
        HANDS: {
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        },
        CAMERA: {
            width: 640,
            height: 480,
            fps: 30
        },
        LANDMARKS: {
            WRIST: 0,
            THUMB_TIP: 4,
            INDEX_TIP: 8,
            MIDDLE_TIP: 12,
            RING_TIP: 16,
            PINKY_TIP: 20
        }
    },

    // Gesture Recognition Configuration
    GESTURE: {
        MIN_POSITIONS: 3,
        MAX_POSITIONS: 10,
        MIN_DURATION: 1000, // milliseconds
        MAX_DURATION: 10000, // milliseconds
        POSITION_TOLERANCE: 0.15,
        TIMING_TOLERANCE: 0.2,
        CONFIDENCE_THRESHOLD: 0.7,
        SAMPLING_RATE: 30 // fps
    },

    // UI Configuration
    UI: {
        ANIMATION_DURATION: 250,
        TOAST_DURATION: 5000,
        MODAL_BACKDROP_CLOSE: true,
        THEME_STORAGE_KEY: 'gesturevault_theme',
        LANGUAGE_STORAGE_KEY: 'gesturevault_language',
        USER_STORAGE_KEY: 'gesturevault_user',
        TOKEN_STORAGE_KEY: 'gesturevault_token'
    },

    // Audio Configuration
    AUDIO: {
        ENABLED: true,
        VOLUME: 0.5,
        SOUNDS: {
            SUCCESS: 'assets/sounds/success.mp3',
            ERROR: 'assets/sounds/error.mp3',
            GESTURE_START: 'assets/sounds/gesture-start.mp3',
            GESTURE_END: 'assets/sounds/gesture-end.mp3',
            VOICE_WAKE: 'assets/sounds/voice-wake.mp3'
        }
    },

    // Voice Assistant Configuration
    VOICE: {
        ENABLED: true,
        LANGUAGE: 'en-US',
        COMMANDS: {
            'start gesture': 'startGestureRecording',
            'stop gesture': 'stopGestureRecording',
            'login': 'performLogin',
            'register': 'performRegister',
            'tutorial': 'openTutorial',
            'dashboard': 'openDashboard',
            'settings': 'openSettings',
            'help': 'showHelp'
        }
    },

    // Security Configuration
    SECURITY: {
        TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
        PASSWORD_MIN_LENGTH: 8,
        GESTURE_MIN_COMPLEXITY: 3
    },

    // Analytics Configuration
    ANALYTICS: {
        ENABLED: true,
        TRACK_EVENTS: [
            'gesture_recorded',
            'gesture_validated',
            'login_attempt',
            'registration_completed',
            'tutorial_completed',
            'settings_changed'
        ]
    },

    // Feature Flags
    FEATURES: {
        VOICE_RECOGNITION: true,
        FACE_RECOGNITION: false,
        GAMIFICATION: true,
        SOCIAL_FEATURES: true,
        ANALYTICS: true,
        TUTORIAL_MODE: true,
        PRACTICE_MODE: true,
        ACCESSIBILITY: true
    },

    // Error Messages
    ERRORS: {
        NETWORK: 'Network error. Please check your connection.',
        UNAUTHORIZED: 'Please log in to continue.',
        FORBIDDEN: 'You don\'t have permission to perform this action.',
        NOT_FOUND: 'The requested resource was not found.',
        VALIDATION: 'Please check your input and try again.',
        GESTURE_TOO_SIMPLE: 'Gesture is too simple. Please make it more complex.',
        GESTURE_TOO_FAST: 'Gesture was performed too quickly. Please slow down.',
        GESTURE_TOO_SLOW: 'Gesture was performed too slowly. Please speed up.',
        CAMERA_ACCESS: 'Camera access is required for gesture recognition.',
        MICROPHONE_ACCESS: 'Microphone access is required for voice commands.',
        BROWSER_NOT_SUPPORTED: 'Your browser doesn\'t support required features.',
        MEDIAPIPE_LOAD_ERROR: 'Failed to load gesture recognition model.'
    },

    // Success Messages
    SUCCESS: {
        LOGIN: 'Login successful!',
        REGISTRATION: 'Account created successfully!',
        GESTURE_RECORDED: 'Gesture recorded successfully!',
        GESTURE_VALIDATED: 'Gesture validated successfully!',
        SETTINGS_UPDATED: 'Settings updated successfully!',
        PROFILE_UPDATED: 'Profile updated successfully!',
        TUTORIAL_COMPLETED: 'Tutorial completed!'
    },

    // Validation Rules
    VALIDATION: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
        PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
        NAME: /^[a-zA-Z\s]{1,50}$/
    },

    // Localization
    LANGUAGES: {
        en: {
            name: 'English',
            flag: '🇺🇸'
        },
        es: {
            name: 'Español',
            flag: '🇪🇸'
        },
        fr: {
            name: 'Français',
            flag: '🇫🇷'
        },
        de: {
            name: 'Deutsch',
            flag: '🇩🇪'
        }
    },

    // Default Settings
    DEFAULTS: {
        THEME: 'auto',
        LANGUAGE: 'en',
        NOTIFICATIONS: {
            email: true,
            push: true,
            sms: false
        },
        ACCESSIBILITY: {
            voiceAssistant: false,
            highContrast: false,
            screenReader: false
        }
    }
};

// Environment-specific overrides
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development environment
    CONFIG.API.BASE_URL = 'http://localhost:5000/api';
    CONFIG.ANALYTICS.ENABLED = false;
} else {
    // Production environment
    CONFIG.API.BASE_URL = 'https://api.gesturevault.com/api';
    CONFIG.ANALYTICS.ENABLED = true;
}

// Export for use in other modules
window.CONFIG = CONFIG; 