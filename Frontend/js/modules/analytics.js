/**
 * Analytics Module
 * Tracks user behavior, gesture performance, security events, and generates insights
 */

class AnalyticsManager {
    constructor() {
        this.events = [];
        this.metrics = new Map();
        this.session = null;
        this.userId = null;
        this.isEnabled = true;
        this.batchSize = 10;
        this.flushInterval = 30000; // 30 seconds
        this.flushTimer = null;
        
        this.init();
    }

    /**
     * Initialize analytics manager
     */
    init() {
        this.createSession();
        this.setupEventListeners();
        this.startFlushTimer();
        this.loadSettings();
    }

    /**
     * Create analytics session
     */
    createSession() {
        this.session = {
            id: this.generateId(),
            startTime: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
        };
    }

    /**
     * Setup event listeners for automatic tracking
     */
    setupEventListeners() {
        // Page view tracking
        document.addEventListener('ui:pageChanged', (event) => {
            this.trackPageView(event.detail.page);
        });

        // Authentication events
        document.addEventListener('auth:loggedIn', (event) => {
            this.trackEvent('user_login', {
                method: 'password',
                success: true
            });
        });

        document.addEventListener('auth:loggedOut', () => {
            this.trackEvent('user_logout');
        });

        document.addEventListener('auth:registered', (event) => {
            this.trackEvent('user_registration', {
                method: 'email'
            });
        });

        // Gesture events
        document.addEventListener('gesture:recordingStarted', () => {
            this.trackEvent('gesture_recording_started');
        });

        document.addEventListener('gesture:recordingStopped', (event) => {
            this.trackEvent('gesture_recording_stopped', {
                duration: event.detail.duration,
                frameCount: event.detail.frameCount
            });
        });

        document.addEventListener('gesture:validated', (event) => {
            this.trackEvent('gesture_validation', {
                success: event.detail.success,
                confidence: event.detail.confidence,
                similarity: event.detail.similarity
            });
        });

        document.addEventListener('gesture:registered', (event) => {
            this.trackEvent('gesture_registered', {
                complexity: event.detail.complexity,
                duration: event.detail.duration
            });
        });

        // Voice assistant events
        document.addEventListener('voice:listeningStarted', () => {
            this.trackEvent('voice_listening_started');
        });

        document.addEventListener('voice:listeningEnded', () => {
            this.trackEvent('voice_listening_ended');
        });

        document.addEventListener('voice:speakingStarted', (event) => {
            this.trackEvent('voice_speaking_started', {
                textLength: event.detail.text.length
            });
        });

        // Error tracking
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Performance tracking
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.trackPerformance();
                }, 1000);
            });
        }

        // User interaction tracking
        document.addEventListener('click', (event) => {
            this.trackInteraction('click', event.target);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                this.trackInteraction('keyboard', event.target);
            }
        });
    }

    /**
     * Track page view
     */
    trackPageView(page) {
        this.trackEvent('page_view', {
            page,
            url: window.location.href,
            referrer: document.referrer
        });
    }

    /**
     * Track custom event
     */
    trackEvent(eventName, properties = {}) {
        if (!this.isEnabled) return;

        const event = {
            id: this.generateId(),
            name: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
                sessionId: this.session.id,
                userId: this.userId
            }
        };

        this.events.push(event);
        this.updateMetrics(eventName, properties);

        // Flush if batch size reached
        if (this.events.length >= this.batchSize) {
            this.flush();
        }
    }

    /**
     * Track error
     */
    trackError(errorType, properties = {}) {
        this.trackEvent('error', {
            type: errorType,
            ...properties
        });
    }

    /**
     * Track user interaction
     */
    trackInteraction(type, element) {
        const properties = {
            type,
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.substring(0, 50)
        };

        this.trackEvent('user_interaction', properties);
    }

    /**
     * Track performance metrics
     */
    trackPerformance() {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
            this.trackEvent('performance', {
                loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
            });
        }
    }

    /**
     * Track gesture performance
     */
    trackGesturePerformance(gestureData) {
        this.trackEvent('gesture_performance', {
            accuracy: gestureData.accuracy,
            speed: gestureData.speed,
            complexity: gestureData.complexity,
            confidence: gestureData.confidence,
            duration: gestureData.duration
        });
    }

    /**
     * Track security event
     */
    trackSecurityEvent(eventType, properties = {}) {
        this.trackEvent('security_event', {
            type: eventType,
            severity: properties.severity || 'medium',
            ...properties
        });
    }

    /**
     * Update metrics
     */
    updateMetrics(eventName, properties) {
        if (!this.metrics.has(eventName)) {
            this.metrics.set(eventName, {
                count: 0,
                lastOccurrence: null,
                properties: {}
            });
        }

        const metric = this.metrics.get(eventName);
        metric.count++;
        metric.lastOccurrence = Date.now();

        // Track property values
        Object.entries(properties).forEach(([key, value]) => {
            if (typeof value === 'number') {
                if (!metric.properties[key]) {
                    metric.properties[key] = {
                        sum: 0,
                        count: 0,
                        min: Infinity,
                        max: -Infinity
                    };
                }
                const prop = metric.properties[key];
                prop.sum += value;
                prop.count++;
                prop.min = Math.min(prop.min, value);
                prop.max = Math.max(prop.max, value);
            }
        });
    }

    /**
     * Flush events to server
     */
    async flush() {
        if (this.events.length === 0) return;

        const eventsToSend = [...this.events];
        this.events = [];

        try {
            const response = await apiService.analytics.trackEvents(eventsToSend);
            
            if (response.success) {
                console.log(`Analytics: Sent ${eventsToSend.length} events`);
            } else {
                console.error('Analytics flush failed:', response.error);
                // Re-add events to queue for retry
                this.events.unshift(...eventsToSend);
            }
        } catch (error) {
            console.error('Analytics flush error:', error);
            // Re-add events to queue for retry
            this.events.unshift(...eventsToSend);
        }
    }

    /**
     * Start flush timer
     */
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    /**
     * Stop flush timer
     */
    stopFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Set user ID for tracking
     */
    setUserId(userId) {
        this.userId = userId;
    }

    /**
     * Enable analytics
     */
    enable() {
        this.isEnabled = true;
        this.saveSettings();
    }

    /**
     * Disable analytics
     */
    disable() {
        this.isEnabled = false;
        this.saveSettings();
    }

    /**
     * Get analytics metrics
     */
    getMetrics() {
        const metrics = {};
        for (const [eventName, metric] of this.metrics) {
            metrics[eventName] = {
                count: metric.count,
                lastOccurrence: metric.lastOccurrence,
                properties: {}
            };

            // Calculate averages for numeric properties
            Object.entries(metric.properties).forEach(([key, prop]) => {
                metrics[eventName].properties[key] = {
                    average: prop.sum / prop.count,
                    min: prop.min,
                    max: prop.max,
                    count: prop.count
                };
            });
        }
        return metrics;
    }

    /**
     * Get session data
     */
    getSessionData() {
        return {
            ...this.session,
            duration: Date.now() - this.session.startTime,
            eventCount: this.events.length
        };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Load analytics settings
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('gestureVault_analytics_settings');
            if (settings) {
                const savedSettings = JSON.parse(settings);
                this.isEnabled = savedSettings.enabled !== false;
            }
        } catch (error) {
            console.error('Error loading analytics settings:', error);
        }
    }

    /**
     * Save analytics settings
     */
    saveSettings() {
        try {
            const settings = {
                enabled: this.isEnabled
            };
            localStorage.setItem('gestureVault_analytics_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving analytics settings:', error);
        }
    }

    /**
     * Get analytics dashboard data
     */
    async getDashboardData() {
        try {
            const response = await apiService.analytics.getDashboard();
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return null;
        }
    }

    /**
     * Get security analytics
     */
    async getSecurityAnalytics() {
        try {
            const response = await apiService.analytics.getSecurityAnalytics();
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Error fetching security analytics:', error);
            return null;
        }
    }

    /**
     * Get performance analytics
     */
    async getPerformanceAnalytics() {
        try {
            const response = await apiService.analytics.getPerformanceAnalytics();
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Error fetching performance analytics:', error);
            return null;
        }
    }

    /**
     * Export analytics data
     */
    async exportData(format = 'json') {
        try {
            const response = await apiService.analytics.exportData(format);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Error exporting analytics data:', error);
            return null;
        }
    }

    /**
     * Create analytics report
     */
    async createReport(reportType, dateRange) {
        try {
            const response = await apiService.analytics.createReport(reportType, dateRange);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Error creating analytics report:', error);
            return null;
        }
    }

    /**
     * Track custom metric
     */
    trackMetric(name, value, tags = {}) {
        this.trackEvent('custom_metric', {
            metric_name: name,
            value,
            tags
        });
    }

    /**
     * Track user journey
     */
    trackUserJourney(step, properties = {}) {
        this.trackEvent('user_journey', {
            step,
            ...properties
        });
    }

    /**
     * Track feature usage
     */
    trackFeatureUsage(feature, properties = {}) {
        this.trackEvent('feature_usage', {
            feature,
            ...properties
        });
    }

    /**
     * Track conversion
     */
    trackConversion(conversionType, value = 1, properties = {}) {
        this.trackEvent('conversion', {
            type: conversionType,
            value,
            ...properties
        });
    }

    /**
     * Cleanup analytics
     */
    cleanup() {
        this.stopFlushTimer();
        this.flush();
    }

    /**
     * Get analytics status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            sessionId: this.session.id,
            userId: this.userId,
            eventCount: this.events.length,
            metricsCount: this.metrics.size
        };
    }
}

// Initialize analytics manager
const analyticsManager = new AnalyticsManager();

// Export for use in other modules
window.analyticsManager = analyticsManager;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    analyticsManager.cleanup();
}); 