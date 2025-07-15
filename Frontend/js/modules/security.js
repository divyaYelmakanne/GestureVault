/**
 * Security Module
 * Handles encryption, anti-spoofing, threat detection, and security monitoring
 */

class SecurityManager {
    constructor() {
        this.encryptionKey = null;
        this.iv = null;
        this.threatLevel = 'low';
        this.suspiciousActivities = [];
        this.securityEvents = [];
        this.antiSpoofingEnabled = true;
        this.threatDetectionEnabled = true;
        this.encryptionEnabled = true;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.failedAttempts = new Map();
        
        this.init();
    }

    /**
     * Initialize security manager
     */
    init() {
        this.generateEncryptionKey();
        this.setupEventListeners();
        this.loadSettings();
        this.startSecurityMonitoring();
    }

    /**
     * Generate encryption key
     */
    async generateEncryptionKey() {
        try {
            // Generate a random encryption key
            this.encryptionKey = await crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );

            // Generate initialization vector
            this.iv = crypto.getRandomValues(new Uint8Array(12));
        } catch (error) {
            console.error('Error generating encryption key:', error);
            this.encryptionEnabled = false;
        }
    }

    /**
     * Setup security event listeners
     */
    setupEventListeners() {
        // Monitor authentication attempts
        document.addEventListener('auth:loginAttempt', (event) => {
            this.monitorLoginAttempt(event.detail);
        });

        // Monitor gesture validation
        document.addEventListener('gesture:validationAttempt', (event) => {
            this.monitorGestureValidation(event.detail);
        });

        // Monitor suspicious activities
        document.addEventListener('security:suspiciousActivity', (event) => {
            this.handleSuspiciousActivity(event.detail);
        });

        // Monitor failed attempts
        document.addEventListener('auth:loginFailed', (event) => {
            this.recordFailedAttempt(event.detail);
        });
    }

    /**
     * Encrypt data
     */
    async encrypt(data) {
        if (!this.encryptionEnabled || !this.encryptionKey) {
            return data;
        }

        try {
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(JSON.stringify(data));

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: this.iv
                },
                this.encryptionKey,
                encodedData
            );

            return {
                encrypted: true,
                data: Array.from(new Uint8Array(encryptedData)),
                iv: Array.from(this.iv)
            };
        } catch (error) {
            console.error('Encryption error:', error);
            this.recordSecurityEvent('encryption_failed', { error: error.message });
            return data;
        }
    }

    /**
     * Decrypt data
     */
    async decrypt(encryptedData) {
        if (!encryptedData.encrypted || !this.encryptionEnabled || !this.encryptionKey) {
            return encryptedData;
        }

        try {
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(encryptedData.iv)
                },
                this.encryptionKey,
                new Uint8Array(encryptedData.data)
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedData));
        } catch (error) {
            console.error('Decryption error:', error);
            this.recordSecurityEvent('decryption_failed', { error: error.message });
            return null;
        }
    }

    /**
     * Hash data
     */
    async hash(data) {
        try {
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(data);
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex;
        } catch (error) {
            console.error('Hashing error:', error);
            return null;
        }
    }

    /**
     * Monitor login attempts
     */
    monitorLoginAttempt(attemptData) {
        const { userId, ip, userAgent, timestamp } = attemptData;
        
        // Check for rapid login attempts
        const recentAttempts = this.getRecentAttempts(userId, 5 * 60 * 1000); // 5 minutes
        if (recentAttempts.length > 10) {
            this.raiseThreatLevel('medium');
            this.recordSecurityEvent('rapid_login_attempts', {
                userId,
                attemptCount: recentAttempts.length,
                timeWindow: '5 minutes'
            });
        }

        // Check for suspicious IP patterns
        this.detectSuspiciousIP(ip, userId);

        // Check for user agent anomalies
        this.detectUserAgentAnomaly(userAgent, userId);
    }

    /**
     * Monitor gesture validation
     */
    monitorGestureValidation(validationData) {
        const { userId, confidence, similarity, timestamp } = validationData;
        
        // Check for low confidence patterns
        if (confidence < 0.7) {
            this.recordSecurityEvent('low_gesture_confidence', {
                userId,
                confidence,
                threshold: 0.7
            });
        }

        // Check for unusual similarity patterns
        if (similarity < 0.6) {
            this.recordSecurityEvent('low_gesture_similarity', {
                userId,
                similarity,
                threshold: 0.6
            });
        }

        // Check for rapid validation attempts
        const recentValidations = this.getRecentValidations(userId, 60 * 1000); // 1 minute
        if (recentValidations.length > 5) {
            this.raiseThreatLevel('medium');
            this.recordSecurityEvent('rapid_gesture_validation', {
                userId,
                validationCount: recentValidations.length,
                timeWindow: '1 minute'
            });
        }
    }

    /**
     * Detect suspicious IP patterns
     */
    detectSuspiciousIP(ip, userId) {
        // Check for known malicious IPs (simplified)
        const maliciousIPs = this.getMaliciousIPs();
        if (maliciousIPs.includes(ip)) {
            this.raiseThreatLevel('high');
            this.recordSecurityEvent('malicious_ip_detected', {
                ip,
                userId,
                severity: 'high'
            });
        }

        // Check for geographic anomalies
        this.checkGeographicAnomaly(ip, userId);
    }

    /**
     * Detect user agent anomalies
     */
    detectUserAgentAnomaly(userAgent, userId) {
        // Check for missing or suspicious user agents
        if (!userAgent || userAgent.length < 10) {
            this.recordSecurityEvent('suspicious_user_agent', {
                userAgent,
                userId,
                reason: 'too_short'
            });
        }

        // Check for known bot user agents
        const botPatterns = [
            'bot', 'crawler', 'spider', 'scraper', 'headless'
        ];

        const isBot = botPatterns.some(pattern => 
            userAgent.toLowerCase().includes(pattern)
        );

        if (isBot) {
            this.raiseThreatLevel('medium');
            this.recordSecurityEvent('bot_detected', {
                userAgent,
                userId,
                severity: 'medium'
            });
        }
    }

    /**
     * Check geographic anomaly
     */
    async checkGeographicAnomaly(ip, userId) {
        try {
            // This would typically call a geolocation service
            // For now, we'll simulate the check
            const userLocation = await this.getUserLocation(userId);
            const ipLocation = await this.getIPLocation(ip);

            if (userLocation && ipLocation) {
                const distance = this.calculateDistance(userLocation, ipLocation);
                
                // If distance is greater than 1000km, flag as suspicious
                if (distance > 1000) {
                    this.recordSecurityEvent('geographic_anomaly', {
                        userId,
                        ip,
                        userLocation,
                        ipLocation,
                        distance: Math.round(distance)
                    });
                }
            }
        } catch (error) {
            console.error('Geographic anomaly check failed:', error);
        }
    }

    /**
     * Anti-spoofing measures
     */
    async performAntiSpoofingCheck(gestureData) {
        if (!this.antiSpoofingEnabled) return true;

        try {
            // Check for depth consistency (if available)
            if (gestureData.depthData) {
                const depthConsistency = this.checkDepthConsistency(gestureData.depthData);
                if (!depthConsistency) {
                    this.recordSecurityEvent('depth_inconsistency_detected', {
                        severity: 'high',
                        reason: 'possible_spoofing'
                    });
                    return false;
                }
            }

            // Check for motion patterns
            const motionAnalysis = this.analyzeMotionPatterns(gestureData.motionData);
            if (motionAnalysis.suspicious) {
                this.recordSecurityEvent('suspicious_motion_pattern', {
                    severity: motionAnalysis.severity,
                    reason: motionAnalysis.reason
                });
                return false;
            }

            // Check for timing patterns
            const timingAnalysis = this.analyzeTimingPatterns(gestureData.timingData);
            if (timingAnalysis.suspicious) {
                this.recordSecurityEvent('suspicious_timing_pattern', {
                    severity: timingAnalysis.severity,
                    reason: timingAnalysis.reason
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Anti-spoofing check failed:', error);
            return true; // Fail open for now
        }
    }

    /**
     * Check depth consistency
     */
    checkDepthConsistency(depthData) {
        // Simplified depth consistency check
        // In a real implementation, this would analyze depth variations
        const variations = depthData.map((depth, index) => {
            if (index === 0) return 0;
            return Math.abs(depth - depthData[index - 1]);
        });

        const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
        return avgVariation > 0.1; // Minimum expected variation
    }

    /**
     * Analyze motion patterns
     */
    analyzeMotionPatterns(motionData) {
        // Check for unnatural motion patterns
        const velocities = motionData.map((position, index) => {
            if (index === 0) return 0;
            const prevPosition = motionData[index - 1];
            return Math.sqrt(
                Math.pow(position.x - prevPosition.x, 2) +
                Math.pow(position.y - prevPosition.y, 2) +
                Math.pow(position.z - prevPosition.z, 2)
            );
        });

        // Check for sudden velocity changes
        const accelerationChanges = velocities.map((velocity, index) => {
            if (index === 0) return 0;
            return Math.abs(velocity - velocities[index - 1]);
        });

        const maxAcceleration = Math.max(...accelerationChanges);
        
        if (maxAcceleration > 100) { // Threshold for suspicious acceleration
            return {
                suspicious: true,
                severity: 'medium',
                reason: 'unnatural_acceleration'
            };
        }

        return { suspicious: false };
    }

    /**
     * Analyze timing patterns
     */
    analyzeTimingPatterns(timingData) {
        // Check for too-perfect timing (indicating automation)
        const intervals = timingData.map((time, index) => {
            if (index === 0) return 0;
            return time - timingData[index - 1];
        });

        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => 
            sum + Math.pow(interval - avgInterval, 2), 0
        ) / intervals.length;

        // Too low variance might indicate automation
        if (variance < 0.01) {
            return {
                suspicious: true,
                severity: 'high',
                reason: 'too_perfect_timing'
            };
        }

        return { suspicious: false };
    }

    /**
     * Record failed attempt
     */
    recordFailedAttempt(attemptData) {
        const { userId, ip, timestamp } = attemptData;
        
        if (!this.failedAttempts.has(userId)) {
            this.failedAttempts.set(userId, []);
        }

        const attempts = this.failedAttempts.get(userId);
        attempts.push({ ip, timestamp });

        // Remove old attempts
        const cutoffTime = Date.now() - this.lockoutDuration;
        const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoffTime);
        this.failedAttempts.set(userId, recentAttempts);

        // Check if account should be locked
        if (recentAttempts.length >= this.maxLoginAttempts) {
            this.lockAccount(userId);
        }
    }

    /**
     * Lock account
     */
    lockAccount(userId) {
        this.recordSecurityEvent('account_locked', {
            userId,
            reason: 'too_many_failed_attempts',
            lockoutDuration: this.lockoutDuration
        });

        // Set lockout timer
        setTimeout(() => {
            this.unlockAccount(userId);
        }, this.lockoutDuration);
    }

    /**
     * Unlock account
     */
    unlockAccount(userId) {
        this.failedAttempts.delete(userId);
        this.recordSecurityEvent('account_unlocked', { userId });
    }

    /**
     * Check if account is locked
     */
    isAccountLocked(userId) {
        const attempts = this.failedAttempts.get(userId) || [];
        const cutoffTime = Date.now() - this.lockoutDuration;
        const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoffTime);
        
        return recentAttempts.length >= this.maxLoginAttempts;
    }

    /**
     * Handle suspicious activity
     */
    handleSuspiciousActivity(activity) {
        this.suspiciousActivities.push({
            ...activity,
            timestamp: Date.now()
        });

        // Update threat level based on activity severity
        if (activity.severity === 'high') {
            this.raiseThreatLevel('high');
        } else if (activity.severity === 'medium') {
            this.raiseThreatLevel('medium');
        }

        // Trigger security alert
        this.triggerSecurityAlert(activity);
    }

    /**
     * Raise threat level
     */
    raiseThreatLevel(level) {
        const levels = ['low', 'medium', 'high', 'critical'];
        const currentIndex = levels.indexOf(this.threatLevel);
        const newIndex = levels.indexOf(level);
        
        if (newIndex > currentIndex) {
            this.threatLevel = level;
            this.recordSecurityEvent('threat_level_raised', {
                from: levels[currentIndex],
                to: level
            });
        }
    }

    /**
     * Record security event
     */
    recordSecurityEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            data,
            timestamp: Date.now(),
            threatLevel: this.threatLevel
        };

        this.securityEvents.push(event);

        // Keep only last 1000 events
        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(-1000);
        }

        // Send to analytics
        if (window.analyticsManager) {
            window.analyticsManager.trackSecurityEvent(eventType, data);
        }
    }

    /**
     * Trigger security alert
     */
    triggerSecurityAlert(activity) {
        // Send alert to server
        apiService.security.reportThreat(activity).catch(error => {
            console.error('Failed to report threat:', error);
        });

        // Show user notification
        if (window.uiManager) {
            window.uiManager.showToast(
                `Security alert: ${activity.type}`,
                'warning',
                10000
            );
        }
    }

    /**
     * Start security monitoring
     */
    startSecurityMonitoring() {
        // Monitor for unusual patterns
        setInterval(() => {
            this.analyzeSecurityPatterns();
        }, 60000); // Every minute

        // Clean up old data
        setInterval(() => {
            this.cleanupOldData();
        }, 300000); // Every 5 minutes
    }

    /**
     * Analyze security patterns
     */
    analyzeSecurityPatterns() {
        const recentEvents = this.securityEvents.filter(
            event => event.timestamp > Date.now() - 3600000 // Last hour
        );

        // Check for unusual event frequency
        if (recentEvents.length > 50) {
            this.raiseThreatLevel('medium');
        }

        // Check for specific threat patterns
        const threatPatterns = this.detectThreatPatterns(recentEvents);
        if (threatPatterns.length > 0) {
            this.handleThreatPatterns(threatPatterns);
        }
    }

    /**
     * Detect threat patterns
     */
    detectThreatPatterns(events) {
        const patterns = [];

        // Pattern: Multiple failed logins from different IPs
        const failedLogins = events.filter(e => e.type === 'login_failed');
        const uniqueIPs = new Set(failedLogins.map(e => e.data.ip));
        
        if (failedLogins.length > 10 && uniqueIPs.size > 3) {
            patterns.push({
                type: 'distributed_attack',
                severity: 'high',
                evidence: {
                    failedAttempts: failedLogins.length,
                    uniqueIPs: uniqueIPs.size
                }
            });
        }

        return patterns;
    }

    /**
     * Handle threat patterns
     */
    handleThreatPatterns(patterns) {
        patterns.forEach(pattern => {
            this.recordSecurityEvent('threat_pattern_detected', pattern);
            this.raiseThreatLevel(pattern.severity);
        });
    }

    /**
     * Cleanup old data
     */
    cleanupOldData() {
        const cutoffTime = Date.now() - 86400000; // 24 hours

        // Clean up security events
        this.securityEvents = this.securityEvents.filter(
            event => event.timestamp > cutoffTime
        );

        // Clean up suspicious activities
        this.suspiciousActivities = this.suspiciousActivities.filter(
            activity => activity.timestamp > cutoffTime
        );

        // Clean up failed attempts
        for (const [userId, attempts] of this.failedAttempts) {
            const recentAttempts = attempts.filter(
                attempt => attempt.timestamp > cutoffTime
            );
            if (recentAttempts.length === 0) {
                this.failedAttempts.delete(userId);
            } else {
                this.failedAttempts.set(userId, recentAttempts);
            }
        }
    }

    /**
     * Get recent attempts
     */
    getRecentAttempts(userId, timeWindow) {
        const attempts = this.failedAttempts.get(userId) || [];
        const cutoffTime = Date.now() - timeWindow;
        return attempts.filter(attempt => attempt.timestamp > cutoffTime);
    }

    /**
     * Get recent validations
     */
    getRecentValidations(userId, timeWindow) {
        // This would be implemented based on your validation tracking
        return [];
    }

    /**
     * Get malicious IPs
     */
    getMaliciousIPs() {
        // This would typically come from a threat intelligence service
        return [];
    }

    /**
     * Get user location
     */
    async getUserLocation(userId) {
        // This would typically come from user profile or previous sessions
        return null;
    }

    /**
     * Get IP location
     */
    async getIPLocation(ip) {
        // This would typically call a geolocation service
        return null;
    }

    /**
     * Calculate distance between coordinates
     */
    calculateDistance(loc1, loc2) {
        // Haversine formula for calculating distance between coordinates
        const R = 6371; // Earth's radius in km
        const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
        const dLon = (loc2.lon - loc1.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Load security settings
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('gestureVault_security_settings');
            if (settings) {
                const savedSettings = JSON.parse(settings);
                this.antiSpoofingEnabled = savedSettings.antiSpoofingEnabled !== false;
                this.threatDetectionEnabled = savedSettings.threatDetectionEnabled !== false;
                this.encryptionEnabled = savedSettings.encryptionEnabled !== false;
                this.maxLoginAttempts = savedSettings.maxLoginAttempts || this.maxLoginAttempts;
                this.lockoutDuration = savedSettings.lockoutDuration || this.lockoutDuration;
            }
        } catch (error) {
            console.error('Error loading security settings:', error);
        }
    }

    /**
     * Save security settings
     */
    saveSettings() {
        try {
            const settings = {
                antiSpoofingEnabled: this.antiSpoofingEnabled,
                threatDetectionEnabled: this.threatDetectionEnabled,
                encryptionEnabled: this.encryptionEnabled,
                maxLoginAttempts: this.maxLoginAttempts,
                lockoutDuration: this.lockoutDuration
            };
            localStorage.setItem('gestureVault_security_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving security settings:', error);
        }
    }

    /**
     * Get security status
     */
    getStatus() {
        return {
            threatLevel: this.threatLevel,
            antiSpoofingEnabled: this.antiSpoofingEnabled,
            threatDetectionEnabled: this.threatDetectionEnabled,
            encryptionEnabled: this.encryptionEnabled,
            securityEventsCount: this.securityEvents.length,
            suspiciousActivitiesCount: this.suspiciousActivities.length,
            lockedAccountsCount: this.failedAttempts.size
        };
    }

    /**
     * Get security report
     */
    getSecurityReport() {
        const recentEvents = this.securityEvents.filter(
            event => event.timestamp > Date.now() - 86400000 // Last 24 hours
        );

        return {
            threatLevel: this.threatLevel,
            events24h: recentEvents.length,
            suspiciousActivities: this.suspiciousActivities.length,
            lockedAccounts: this.failedAttempts.size,
            recentEvents: recentEvents.slice(-10) // Last 10 events
        };
    }
}

// Initialize security manager
const securityManager = new SecurityManager();

// Export for use in other modules
window.securityManager = securityManager; 