// GestureVault API Service

const API = {
    // Base configuration
    baseURL: CONFIG.API.BASE_URL,
    timeout: CONFIG.API.TIMEOUT,
    retryAttempts: CONFIG.API.RETRY_ATTEMPTS,

    // Request headers
    getHeaders: () => {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Add authentication token if available
        const token = Utils.storage.get(CONFIG.UI.TOKEN_STORAGE_KEY);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    },

    // Make HTTP request with retry logic
    request: async (endpoint, options = {}) => {
        const url = `${API.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: API.getHeaders(),
            timeout: API.timeout,
            ...options
        };

        // Add body for POST/PUT requests
        if (options.body && (config.method === 'POST' || config.method === 'PUT')) {
            config.body = JSON.stringify(options.body);
        }

        const makeRequest = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);

            try {
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Handle different response status codes
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data };
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}`);
                }
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                
                throw error;
            }
        };

        // Retry logic with exponential backoff
        return Utils.async.retry(makeRequest, API.retryAttempts, 1000);
    },

    // Authentication API
    auth: {
        // Register new user
        register: async (userData) => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                body: userData
            });
        },

        // Login user
        login: async (credentials) => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                body: credentials
            });
        },

        // Logout user
        logout: async () => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.LOGOUT, {
                method: 'POST'
            });
        },

        // Get user profile
        getProfile: async () => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.PROFILE);
        },

        // Refresh token
        refreshToken: async () => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.REFRESH, {
                method: 'POST'
            });
        },

        // Forgot password
        forgotPassword: async (email) => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.FORGOT_PASSWORD, {
                method: 'POST',
                body: { email }
            });
        },

        // Reset password
        resetPassword: async (token, password) => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.RESET_PASSWORD, {
                method: 'POST',
                body: { token, password }
            });
        },

        // Verify email
        verifyEmail: async (token) => {
            return API.request(CONFIG.API.ENDPOINTS.AUTH.VERIFY_EMAIL, {
                method: 'POST',
                body: { token }
            });
        }
    },

    // Gesture API
    gestures: {
        // Register new gesture
        register: async (gestureData) => {
            return API.request(CONFIG.API.ENDPOINTS.GESTURES.REGISTER, {
                method: 'POST',
                body: gestureData
            });
        },

        // Validate gesture
        validate: async (gestureData) => {
            return API.request(CONFIG.API.ENDPOINTS.GESTURES.VALIDATE, {
                method: 'POST',
                body: gestureData
            });
        },

        // Update gesture
        update: async (gestureData) => {
            return API.request(CONFIG.API.ENDPOINTS.GESTURES.UPDATE, {
                method: 'PUT',
                body: gestureData
            });
        },

        // Get gesture profile
        getProfile: async () => {
            return API.request(CONFIG.API.ENDPOINTS.GESTURES.PROFILE);
        },

        // Get gesture history
        getHistory: async (page = 1, limit = 20) => {
            return API.request(`${CONFIG.API.ENDPOINTS.GESTURES.HISTORY}?page=${page}&limit=${limit}`);
        },

        // Analyze gesture
        analyze: async (gestureData) => {
            return API.request(CONFIG.API.ENDPOINTS.GESTURES.ANALYZE, {
                method: 'POST',
                body: gestureData
            });
        },

        // Delete gesture
        delete: async () => {
            return API.request(CONFIG.API.ENDPOINTS.GESTURES.DELETE, {
                method: 'DELETE'
            });
        }
    },

    // User API
    users: {
        // Get user profile
        getProfile: async () => {
            return API.request(CONFIG.API.ENDPOINTS.USERS.PROFILE);
        },

        // Update user profile
        updateProfile: async (profileData) => {
            return API.request(CONFIG.API.ENDPOINTS.USERS.PROFILE, {
                method: 'PUT',
                body: profileData
            });
        },

        // Update user preferences
        updatePreferences: async (preferences) => {
            return API.request(CONFIG.API.ENDPOINTS.USERS.PREFERENCES, {
                method: 'PUT',
                body: preferences
            });
        },

        // Get user stats
        getStats: async () => {
            return API.request(CONFIG.API.ENDPOINTS.USERS.STATS);
        },

        // Delete user account
        deleteAccount: async () => {
            return API.request(CONFIG.API.ENDPOINTS.USERS.ACCOUNT, {
                method: 'DELETE'
            });
        }
    },

    // Analytics API
    analytics: {
        // Get dashboard data
        getDashboard: async () => {
            return API.request(CONFIG.API.ENDPOINTS.ANALYTICS.DASHBOARD);
        },

        // Get security insights
        getSecurity: async () => {
            return API.request(CONFIG.API.ENDPOINTS.ANALYTICS.SECURITY);
        },

        // Get performance data
        getPerformance: async () => {
            return API.request(CONFIG.API.ENDPOINTS.ANALYTICS.PERFORMANCE);
        },

        // Track event
        trackEvent: async (event, data = {}) => {
            return API.request(CONFIG.API.ENDPOINTS.ANALYTICS.TRACK, {
                method: 'POST',
                body: { event, data }
            });
        }
    },

    // Social API
    social: {
        // Get leaderboard
        getLeaderboard: async (page = 1, limit = 20) => {
            return API.request(`${CONFIG.API.ENDPOINTS.SOCIAL.LEADERBOARD}?page=${page}&limit=${limit}`);
        },

        // Create challenge
        createChallenge: async (challengeData) => {
            return API.request(CONFIG.API.ENDPOINTS.SOCIAL.CHALLENGE, {
                method: 'POST',
                body: challengeData
            });
        },

        // Get challenges
        getChallenges: async (status = 'all') => {
            return API.request(`${CONFIG.API.ENDPOINTS.SOCIAL.CHALLENGES}?status=${status}`);
        },

        // Respond to challenge
        respondToChallenge: async (challengeId, response) => {
            return API.request(`${CONFIG.API.ENDPOINTS.SOCIAL.CHALLENGES}/${challengeId}/respond`, {
                method: 'PUT',
                body: response
            });
        },

        // Share gesture
        shareGesture: async (shareData) => {
            return API.request(CONFIG.API.ENDPOINTS.SOCIAL.SHARE, {
                method: 'POST',
                body: shareData
            });
        },

        // Get shared gestures
        getSharedGestures: async () => {
            return API.request(CONFIG.API.ENDPOINTS.SOCIAL.SHARED);
        },

        // Get friends
        getFriends: async () => {
            return API.request(CONFIG.API.ENDPOINTS.SOCIAL.FRIENDS);
        },

        // Add friend
        addFriend: async (friendId) => {
            return API.request(CONFIG.API.ENDPOINTS.SOCIAL.ADD_FRIEND, {
                method: 'POST',
                body: { friendId }
            });
        },

        // Remove friend
        removeFriend: async (friendId) => {
            return API.request(`${CONFIG.API.ENDPOINTS.SOCIAL.FRIENDS}/${friendId}`, {
                method: 'DELETE'
            });
        }
    },

    // Error handling
    handleError: (error) => {
        console.error('API Error:', error);

        // Handle specific error types
        if (error.message.includes('401')) {
            // Unauthorized - clear token and redirect to login
            Utils.storage.remove(CONFIG.UI.TOKEN_STORAGE_KEY);
            Utils.storage.remove(CONFIG.UI.USER_STORAGE_KEY);
            window.location.href = '/#auth';
            return { success: false, message: CONFIG.ERRORS.UNAUTHORIZED };
        }

        if (error.message.includes('403')) {
            return { success: false, message: CONFIG.ERRORS.FORBIDDEN };
        }

        if (error.message.includes('404')) {
            return { success: false, message: CONFIG.ERRORS.NOT_FOUND };
        }

        if (error.message.includes('422')) {
            return { success: false, message: CONFIG.ERRORS.VALIDATION };
        }

        if (error.message.includes('timeout')) {
            return { success: false, message: 'Request timeout. Please try again.' };
        }

        // Network errors
        if (!navigator.onLine) {
            return { success: false, message: 'No internet connection. Please check your network.' };
        }

        // Default error
        return { success: false, message: error.message || CONFIG.ERRORS.NETWORK };
    },

    // Token management
    tokenManager: {
        // Check if token is expired
        isTokenExpired: () => {
            const token = Utils.storage.get(CONFIG.UI.TOKEN_STORAGE_KEY);
            if (!token) return true;

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Date.now() / 1000;
                return payload.exp < currentTime;
            } catch (error) {
                return true;
            }
        },

        // Check if token needs refresh
        needsRefresh: () => {
            const token = Utils.storage.get(CONFIG.UI.TOKEN_STORAGE_KEY);
            if (!token) return false;

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Date.now() / 1000;
                const refreshThreshold = CONFIG.SECURITY.TOKEN_REFRESH_THRESHOLD / 1000;
                return payload.exp - currentTime < refreshThreshold;
            } catch (error) {
                return false;
            }
        },

        // Refresh token
        refresh: async () => {
            try {
                const response = await API.auth.refreshToken();
                if (response.success && response.data.token) {
                    Utils.storage.set(CONFIG.UI.TOKEN_STORAGE_KEY, response.data.token);
                    return true;
                }
                return false;
            } catch (error) {
                return false;
            }
        }
    },

    // Request interceptor
    interceptor: {
        // Before request
        beforeRequest: async (config) => {
            // Check if token needs refresh
            if (API.tokenManager.needsRefresh()) {
                await API.tokenManager.refresh();
            }

            // Update headers with fresh token
            config.headers = API.getHeaders();
            return config;
        },

        // After response
        afterResponse: async (response) => {
            // Track analytics if enabled
            if (CONFIG.ANALYTICS.ENABLED && response.success) {
                try {
                    await API.analytics.trackEvent('api_request_success', {
                        endpoint: response.config?.url,
                        method: response.config?.method
                    });
                } catch (error) {
                    console.warn('Analytics tracking failed:', error);
                }
            }

            return response;
        }
    }
};

// Export for use in other modules
window.API = API; 