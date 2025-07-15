/**
 * Authentication Module
 * Handles user authentication, registration, and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.token = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.biometricEnabled = false;
        this.mfaEnabled = false;
        
        this.init();
    }

    /**
     * Initialize authentication manager
     */
    init() {
        this.loadStoredAuth();
        this.setupTokenRefresh();
        this.checkBiometricSupport();
        this.setupEventListeners();
    }

    /**
     * Load stored authentication data
     */
    loadStoredAuth() {
        try {
            const storedAuth = localStorage.getItem('gestureVault_auth');
            if (storedAuth) {
                const authData = JSON.parse(storedAuth);
                this.token = authData.token;
                this.refreshToken = authData.refreshToken;
                this.tokenExpiry = authData.tokenExpiry;
                this.currentUser = authData.user;
                this.isAuthenticated = !!this.token && this.tokenExpiry > Date.now();
                
                if (this.isAuthenticated) {
                    this.setupAutoRefresh();
                }
            }
        } catch (error) {
            console.error('Error loading stored auth:', error);
            this.clearAuth();
        }
    }

    /**
     * Save authentication data to localStorage
     */
    saveAuth() {
        try {
            const authData = {
                token: this.token,
                refreshToken: this.refreshToken,
                tokenExpiry: this.tokenExpiry,
                user: this.currentUser
            };
            localStorage.setItem('gestureVault_auth', JSON.stringify(authData));
        } catch (error) {
            console.error('Error saving auth data:', error);
        }
    }

    /**
     * Clear authentication data
     */
    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('gestureVault_auth');
        sessionStorage.removeItem('gestureVault_temp_auth');
    }

    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await apiService.auth.register(userData);
            
            if (response.success) {
                this.setAuthData(response.data);
                this.triggerEvent('auth:registered', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Login user
     */
    async login(credentials) {
        try {
            const response = await apiService.auth.login(credentials);
            
            if (response.success) {
                this.setAuthData(response.data);
                this.triggerEvent('auth:loggedIn', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Biometric login
     */
    async biometricLogin() {
        try {
            if (!this.biometricEnabled) {
                throw new Error('Biometric authentication not available');
            }

            const biometricData = await this.getBiometricData();
            const response = await apiService.auth.biometricLogin(biometricData);
            
            if (response.success) {
                this.setAuthData(response.data);
                this.triggerEvent('auth:biometricLogin', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Biometric login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Gesture-based login
     */
    async gestureLogin(gestureData) {
        try {
            const response = await apiService.auth.gestureLogin(gestureData);
            
            if (response.success) {
                this.setAuthData(response.data);
                this.triggerEvent('auth:gestureLogin', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Gesture login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            if (this.token) {
                await apiService.auth.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            this.triggerEvent('auth:loggedOut');
        }
    }

    /**
     * Set authentication data after successful login/register
     */
    setAuthData(authData) {
        this.token = authData.token;
        this.refreshToken = authData.refreshToken;
        this.tokenExpiry = authData.tokenExpiry;
        this.currentUser = authData.user;
        this.isAuthenticated = true;
        
        this.saveAuth();
        this.setupAutoRefresh();
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await apiService.auth.refreshToken(this.refreshToken);
            
            if (response.success) {
                this.token = response.data.token;
                this.tokenExpiry = response.data.tokenExpiry;
                this.saveAuth();
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearAuth();
            return false;
        }
    }

    /**
     * Setup automatic token refresh
     */
    setupAutoRefresh() {
        if (this.tokenExpiry) {
            const timeUntilRefresh = this.tokenExpiry - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry
            if (timeUntilRefresh > 0) {
                setTimeout(() => {
                    this.refreshAccessToken();
                }, timeUntilRefresh);
            }
        }
    }

    /**
     * Check if user is authenticated
     */
    checkAuth() {
        if (!this.token || !this.tokenExpiry) {
            this.isAuthenticated = false;
            return false;
        }

        if (this.tokenExpiry <= Date.now()) {
            this.isAuthenticated = false;
            return false;
        }

        this.isAuthenticated = true;
        return true;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get authentication token
     */
    getToken() {
        return this.token;
    }

    /**
     * Check biometric support
     */
    async checkBiometricSupport() {
        try {
            if ('credentials' in navigator && 'preventSilentAccess' in navigator.credentials) {
                this.biometricEnabled = true;
            } else if (window.PublicKeyCredential) {
                this.biometricEnabled = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            }
        } catch (error) {
            console.error('Biometric support check error:', error);
            this.biometricEnabled = false;
        }
    }

    /**
     * Get biometric data
     */
    async getBiometricData() {
        // Implementation would depend on the specific biometric API being used
        // This is a placeholder for the actual biometric data collection
        return {
            type: 'fingerprint',
            data: 'biometric_data_placeholder'
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for storage changes (other tabs)
        window.addEventListener('storage', (event) => {
            if (event.key === 'gestureVault_auth') {
                this.loadStoredAuth();
            }
        });

        // Listen for visibility changes to refresh token if needed
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated) {
                this.checkAuth();
            }
        });
    }

    /**
     * Trigger custom events
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Enable MFA
     */
    async enableMFA(mfaData) {
        try {
            const response = await apiService.auth.enableMFA(mfaData);
            
            if (response.success) {
                this.mfaEnabled = true;
                this.triggerEvent('auth:mfaEnabled');
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Enable MFA error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Disable MFA
     */
    async disableMFA() {
        try {
            const response = await apiService.auth.disableMFA();
            
            if (response.success) {
                this.mfaEnabled = false;
                this.triggerEvent('auth:mfaDisabled');
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Disable MFA error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify MFA code
     */
    async verifyMFA(code) {
        try {
            const response = await apiService.auth.verifyMFA(code);
            
            if (response.success) {
                this.triggerEvent('auth:mfaVerified');
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('MFA verification error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        try {
            const response = await apiService.auth.requestPasswordReset(email);
            return { success: response.success, error: response.error };
        } catch (error) {
            console.error('Password reset request error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await apiService.auth.resetPassword(token, newPassword);
            return { success: response.success, error: response.error };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(profileData) {
        try {
            const response = await apiService.users.updateProfile(profileData);
            
            if (response.success) {
                this.currentUser = { ...this.currentUser, ...response.data };
                this.saveAuth();
                this.triggerEvent('auth:profileUpdated', { user: this.currentUser });
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await apiService.auth.changePassword(currentPassword, newPassword);
            return { success: response.success, error: response.error };
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete account
     */
    async deleteAccount(password) {
        try {
            const response = await apiService.users.deleteAccount(password);
            
            if (response.success) {
                this.clearAuth();
                this.triggerEvent('auth:accountDeleted');
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Account deletion error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize authentication manager
const authManager = new AuthManager();

// Export for use in other modules
window.authManager = authManager; 