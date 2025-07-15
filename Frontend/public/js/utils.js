// GestureVault Utility Functions

const Utils = {
    // Storage Utilities
    storage: {
        // Local Storage
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        },

        // Session Storage
        setSession: (key, value) => {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Session storage set error:', error);
                return false;
            }
        },

        getSession: (key, defaultValue = null) => {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Session storage get error:', error);
                return defaultValue;
            }
        },

        removeSession: (key) => {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Session storage remove error:', error);
                return false;
            }
        }
    },

    // Validation Utilities
    validation: {
        // Email validation
        isValidEmail: (email) => {
            return CONFIG.VALIDATION.EMAIL.test(email);
        },

        // Username validation
        isValidUsername: (username) => {
            return CONFIG.VALIDATION.USERNAME.test(username);
        },

        // Password validation
        isValidPassword: (password) => {
            return CONFIG.VALIDATION.PASSWORD.test(password);
        },

        // Name validation
        isValidName: (name) => {
            return CONFIG.VALIDATION.NAME.test(name);
        },

        // Gesture validation
        isValidGesture: (gestureData) => {
            if (!gestureData || !gestureData.positions || !gestureData.timing) {
                return false;
            }

            const { positions, timing } = gestureData;
            
            if (positions.length < CONFIG.GESTURE.MIN_POSITIONS || 
                positions.length > CONFIG.GESTURE.MAX_POSITIONS) {
                return false;
            }

            if (timing.length !== positions.length) {
                return false;
            }

            const duration = timing[timing.length - 1] - timing[0];
            if (duration < CONFIG.GESTURE.MIN_DURATION || 
                duration > CONFIG.GESTURE.MAX_DURATION) {
                return false;
            }

            return true;
        },

        // Form validation
        validateForm: (formData, rules) => {
            const errors = {};

            for (const [field, value] of Object.entries(formData)) {
                if (rules[field]) {
                    const fieldRules = rules[field];
                    
                    // Required validation
                    if (fieldRules.required && !value) {
                        errors[field] = `${field} is required`;
                        continue;
                    }

                    // Min length validation
                    if (fieldRules.minLength && value.length < fieldRules.minLength) {
                        errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
                        continue;
                    }

                    // Max length validation
                    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                        errors[field] = `${field} must be no more than ${fieldRules.maxLength} characters`;
                        continue;
                    }

                    // Pattern validation
                    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
                        errors[field] = fieldRules.message || `${field} format is invalid`;
                        continue;
                    }

                    // Custom validation
                    if (fieldRules.custom && typeof fieldRules.custom === 'function') {
                        const customError = fieldRules.custom(value);
                        if (customError) {
                            errors[field] = customError;
                        }
                    }
                }
            }

            return {
                isValid: Object.keys(errors).length === 0,
                errors
            };
        }
    },

    // Formatting Utilities
    format: {
        // Date formatting
        formatDate: (date, options = {}) => {
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };

            return new Date(date).toLocaleDateString('en-US', {
                ...defaultOptions,
                ...options
            });
        },

        // Time formatting
        formatTime: (date) => {
            return new Date(date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Duration formatting
        formatDuration: (milliseconds) => {
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (hours > 0) {
                return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },

        // File size formatting
        formatFileSize: (bytes) => {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // Number formatting
        formatNumber: (number, decimals = 0) => {
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(number);
        },

        // Percentage formatting
        formatPercentage: (value, total, decimals = 1) => {
            const percentage = (value / total) * 100;
            return `${percentage.toFixed(decimals)}%`;
        }
    },

    // Math Utilities
    math: {
        // Calculate distance between two points
        distance: (point1, point2) => {
            const dx = point2.x - point1.x;
            const dy = point2.y - point1.y;
            const dz = point2.z - point1.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        },

        // Calculate angle between three points
        angle: (point1, point2, point3) => {
            const v1 = {
                x: point2.x - point1.x,
                y: point2.y - point1.y,
                z: point2.z - point1.z
            };
            const v2 = {
                x: point3.x - point2.x,
                y: point3.y - point2.y,
                z: point3.z - point2.z
            };

            const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
            const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
            const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

            return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
        },

        // Clamp value between min and max
        clamp: (value, min, max) => {
            return Math.min(Math.max(value, min), max);
        },

        // Linear interpolation
        lerp: (start, end, factor) => {
            return start + (end - start) * factor;
        },

        // Smooth step interpolation
        smoothStep: (edge0, edge1, x) => {
            const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
            return t * t * (3.0 - 2.0 * t);
        }
    },

    // Array Utilities
    array: {
        // Shuffle array
        shuffle: (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        // Remove duplicates
        unique: (array) => {
            return [...new Set(array)];
        },

        // Group array by key
        groupBy: (array, key) => {
            return array.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },

        // Chunk array into smaller arrays
        chunk: (array, size) => {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }
    },

    // String Utilities
    string: {
        // Capitalize first letter
        capitalize: (str) => {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Convert to camelCase
        toCamelCase: (str) => {
            return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        },

        // Convert to kebab-case
        toKebabCase: (str) => {
            return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        },

        // Generate random string
        random: (length = 8) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        // Truncate string
        truncate: (str, length = 50, suffix = '...') => {
            if (str.length <= length) return str;
            return str.substring(0, length - suffix.length) + suffix;
        }
    },

    // DOM Utilities
    dom: {
        // Create element with attributes
        createElement: (tag, attributes = {}, children = []) => {
            const element = document.createElement(tag);
            
            // Set attributes
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });

            // Append children
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });

            return element;
        },

        // Get element by selector
        get: (selector) => {
            return document.querySelector(selector);
        },

        // Get all elements by selector
        getAll: (selector) => {
            return document.querySelectorAll(selector);
        },

        // Add event listener with options
        on: (element, event, handler, options = {}) => {
            element.addEventListener(event, handler, options);
        },

        // Remove event listener
        off: (element, event, handler, options = {}) => {
            element.removeEventListener(event, handler, options);
        },

        // Toggle class
        toggleClass: (element, className) => {
            element.classList.toggle(className);
        },

        // Add class
        addClass: (element, className) => {
            element.classList.add(className);
        },

        // Remove class
        removeClass: (element, className) => {
            element.classList.remove(className);
        },

        // Check if element has class
        hasClass: (element, className) => {
            return element.classList.contains(className);
        }
    },

    // Async Utilities
    async: {
        // Delay execution
        delay: (ms) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // Retry function with exponential backoff
        retry: async (fn, maxAttempts = 3, delay = 1000) => {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await fn();
                } catch (error) {
                    if (attempt === maxAttempts) {
                        throw error;
                    }
                    await Utils.async.delay(delay * Math.pow(2, attempt - 1));
                }
            }
        },

        // Debounce function
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function
        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    },

    // Browser Utilities
    browser: {
        // Check if browser supports feature
        supports: (feature) => {
            const features = {
                webgl: () => {
                    const canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && 
                        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                },
                webcam: () => {
                    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
                },
                microphone: () => {
                    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
                },
                webworkers: () => {
                    return typeof Worker !== 'undefined';
                },
                serviceworkers: () => {
                    return 'serviceWorker' in navigator;
                },
                push: () => {
                    return 'PushManager' in window;
                }
            };

            return features[feature] ? features[feature]() : false;
        },

        // Get browser info
        getInfo: () => {
            const userAgent = navigator.userAgent;
            const browser = {
                name: 'Unknown',
                version: 'Unknown',
                os: 'Unknown'
            };

            // Detect browser
            if (userAgent.includes('Chrome')) {
                browser.name = 'Chrome';
            } else if (userAgent.includes('Firefox')) {
                browser.name = 'Firefox';
            } else if (userAgent.includes('Safari')) {
                browser.name = 'Safari';
            } else if (userAgent.includes('Edge')) {
                browser.name = 'Edge';
            }

            // Detect OS
            if (userAgent.includes('Windows')) {
                browser.os = 'Windows';
            } else if (userAgent.includes('Mac')) {
                browser.os = 'macOS';
            } else if (userAgent.includes('Linux')) {
                browser.os = 'Linux';
            } else if (userAgent.includes('Android')) {
                browser.os = 'Android';
            } else if (userAgent.includes('iOS')) {
                browser.os = 'iOS';
            }

            return browser;
        },

        // Check if device is mobile
        isMobile: () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        // Check if device is touch
        isTouch: () => {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
    }
};

// Export for use in other modules
window.Utils = Utils; 