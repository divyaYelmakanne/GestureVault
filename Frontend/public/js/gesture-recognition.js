// GestureVault Gesture Recognition Module

const GestureRecognition = {
    // MediaPipe components
    hands: null,
    camera: null,
    canvas: null,
    ctx: null,
    video: null,

    // Gesture recording state
    isRecording: false,
    isProcessing: false,
    recordingStartTime: 0,
    gestureData: {
        positions: [],
        timing: [],
        landmarks: []
    },

    // Configuration
    config: {
        ...CONFIG.MEDIAPIPE,
        recordingTimeout: 10000, // 10 seconds max recording
        minPositions: CONFIG.GESTURE.MIN_POSITIONS,
        maxPositions: CONFIG.GESTURE.MAX_POSITIONS,
        samplingRate: CONFIG.GESTURE.SAMPLING_RATE,
        confidenceThreshold: CONFIG.GESTURE.CONFIDENCE_THRESHOLD
    },

    // Event callbacks
    callbacks: {
        onGestureStart: null,
        onGestureProgress: null,
        onGestureComplete: null,
        onGestureError: null,
        onHandDetected: null,
        onHandLost: null
    },

    // Initialize MediaPipe Hands
    async initialize() {
        try {
            // Check browser support
            if (!Utils.browser.supports('webcam')) {
                throw new Error(CONFIG.ERRORS.CAMERA_ACCESS);
            }

            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            // Configure hands detection
            this.hands.setOptions({
                maxNumHands: this.config.HANDS.maxNumHands,
                modelComplexity: this.config.HANDS.modelComplexity,
                minDetectionConfidence: this.config.HANDS.minDetectionConfidence,
                minTrackingConfidence: this.config.HANDS.minTrackingConfidence
            });

            // Set up results callback
            this.hands.onResults(this.onResults.bind(this));

            console.log('MediaPipe Hands initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize MediaPipe Hands:', error);
            throw new Error(CONFIG.ERRORS.MEDIAPIPE_LOAD_ERROR);
        }
    },

    // Initialize camera and canvas
    async initializeCamera(videoElement, canvasElement) {
        try {
            this.video = videoElement;
            this.canvas = canvasElement;
            this.ctx = this.canvas.getContext('2d');

            // Set canvas size
            this.canvas.width = this.config.CAMERA.width;
            this.canvas.height = this.config.CAMERA.height;

            // Get camera stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: this.config.CAMERA.width,
                    height: this.config.CAMERA.height,
                    frameRate: { ideal: this.config.CAMERA.fps }
                }
            });

            // Set video source
            this.video.srcObject = stream;
            this.video.width = this.config.CAMERA.width;
            this.video.height = this.config.CAMERA.height;

            // Wait for video to load
            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });

            // Start camera
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.hands) {
                        await this.hands.send({ image: this.video });
                    }
                },
                width: this.config.CAMERA.width,
                height: this.config.CAMERA.height
            });

            await this.camera.start();
            console.log('Camera initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            throw new Error(CONFIG.ERRORS.CAMERA_ACCESS);
        }
    },

    // Handle MediaPipe results
    onResults(results) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw video frame
        this.ctx.save();
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Process hand landmarks
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.processHandLandmarks(landmarks);
            this.drawHandLandmarks(landmarks);
            
            if (this.callbacks.onHandDetected) {
                this.callbacks.onHandDetected(landmarks);
            }
        } else {
            if (this.callbacks.onHandLost) {
                this.callbacks.onHandLost();
            }
        }
    },

    // Process hand landmarks
    processHandLandmarks(landmarks) {
        if (!this.isRecording) return;

        const currentTime = Date.now() - this.recordingStartTime;
        
        // Sample at specified rate
        if (currentTime % (1000 / this.config.samplingRate) < 16) { // ~60fps check
            // Extract key landmarks
            const keyLandmarks = this.extractKeyLandmarks(landmarks);
            
            // Calculate hand position (center of palm)
            const palmPosition = this.calculatePalmPosition(landmarks);
            
            // Add to gesture data
            this.gestureData.positions.push(palmPosition);
            this.gestureData.timing.push(currentTime);
            this.gestureData.landmarks.push(keyLandmarks);

            // Check recording limits
            if (this.gestureData.positions.length >= this.config.maxPositions) {
                this.stopRecording();
                return;
            }

            // Update progress
            if (this.callbacks.onGestureProgress) {
                const progress = this.gestureData.positions.length / this.config.maxPositions;
                this.callbacks.onGestureProgress(progress, palmPosition);
            }
        }
    },

    // Extract key landmarks for gesture analysis
    extractKeyLandmarks(landmarks) {
        const keyPoints = [
            CONFIG.MEDIAPIPE.LANDMARKS.WRIST,
            CONFIG.MEDIAPIPE.LANDMARKS.THUMB_TIP,
            CONFIG.MEDIAPIPE.LANDMARKS.INDEX_TIP,
            CONFIG.MEDIAPIPE.LANDMARKS.MIDDLE_TIP,
            CONFIG.MEDIAPIPE.LANDMARKS.RING_TIP,
            CONFIG.MEDIAPIPE.LANDMARKS.PINKY_TIP
        ];

        return keyPoints.map(index => ({
            x: landmarks[index].x,
            y: landmarks[index].y,
            z: landmarks[index].z
        }));
    },

    // Calculate palm position (center of hand)
    calculatePalmPosition(landmarks) {
        // Use wrist as palm center
        const wrist = landmarks[CONFIG.MEDIAPIPE.LANDMARKS.WRIST];
        return {
            x: wrist.x,
            y: wrist.y,
            z: wrist.z
        };
    },

    // Draw hand landmarks on canvas
    drawHandLandmarks(landmarks) {
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;

        // Draw connections
        this.drawConnections(landmarks);

        // Draw landmarks
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;

            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    },

    // Draw hand connections
    drawConnections(landmarks) {
        const connections = [
            [0, 1, 2, 3, 4], // Thumb
            [0, 5, 6, 7, 8], // Index finger
            [0, 9, 10, 11, 12], // Middle finger
            [0, 13, 14, 15, 16], // Ring finger
            [0, 17, 18, 19, 20], // Pinky
            [5, 9, 13, 17] // Palm
        ];

        connections.forEach(connection => {
            for (let i = 0; i < connection.length - 1; i++) {
                const start = landmarks[connection[i]];
                const end = landmarks[connection[i + 1]];

                const startX = start.x * this.canvas.width;
                const startY = start.y * this.canvas.height;
                const endX = end.x * this.canvas.width;
                const endY = end.y * this.canvas.height;

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        });
    },

    // Start gesture recording
    startRecording() {
        if (this.isRecording) {
            console.warn('Already recording gesture');
            return false;
        }

        try {
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.gestureData = {
                positions: [],
                timing: [],
                landmarks: []
            };

            // Set recording timeout
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, this.config.recordingTimeout);

            if (this.callbacks.onGestureStart) {
                this.callbacks.onGestureStart();
            }

            console.log('Started gesture recording');
            return true;
        } catch (error) {
            console.error('Failed to start gesture recording:', error);
            this.isRecording = false;
            return false;
        }
    },

    // Stop gesture recording
    stopRecording() {
        if (!this.isRecording) {
            console.warn('Not currently recording');
            return null;
        }

        try {
            this.isRecording = false;
            clearTimeout(this.recordingTimeout);

            // Validate gesture data
            if (!this.validateGestureData()) {
                if (this.callbacks.onGestureError) {
                    this.callbacks.onGestureError('Invalid gesture data');
                }
                return null;
            }

            const gestureData = { ...this.gestureData };

            // Reset data
            this.gestureData = {
                positions: [],
                timing: [],
                landmarks: []
            };

            if (this.callbacks.onGestureComplete) {
                this.callbacks.onGestureComplete(gestureData);
            }

            console.log('Stopped gesture recording');
            return gestureData;
        } catch (error) {
            console.error('Failed to stop gesture recording:', error);
            this.isRecording = false;
            return null;
        }
    },

    // Validate gesture data
    validateGestureData() {
        const { positions, timing } = this.gestureData;

        // Check minimum positions
        if (positions.length < this.config.minPositions) {
            console.warn(`Gesture too short: ${positions.length} positions (min: ${this.config.minPositions})`);
            return false;
        }

        // Check timing consistency
        if (timing.length !== positions.length) {
            console.warn('Position and timing arrays have different lengths');
            return false;
        }

        // Check duration
        const duration = timing[timing.length - 1] - timing[0];
        if (duration < CONFIG.GESTURE.MIN_DURATION) {
            console.warn(`Gesture too fast: ${duration}ms (min: ${CONFIG.GESTURE.MIN_DURATION}ms)`);
            return false;
        }

        if (duration > CONFIG.GESTURE.MAX_DURATION) {
            console.warn(`Gesture too slow: ${duration}ms (max: ${CONFIG.GESTURE.MAX_DURATION}ms)`);
            return false;
        }

        return true;
    },

    // Analyze gesture complexity
    analyzeGestureComplexity(gestureData) {
        const { positions, timing } = gestureData;
        let complexity = 1;

        // Factor 1: Number of positions
        complexity += positions.length * 0.5;

        // Factor 2: Distance between positions
        let totalDistance = 0;
        for (let i = 1; i < positions.length; i++) {
            const distance = Utils.math.distance(positions[i - 1], positions[i]);
            totalDistance += distance;
        }
        complexity += totalDistance * 0.1;

        // Factor 3: Timing variation
        const avgTime = timing.reduce((sum, t) => sum + t, 0) / timing.length;
        const timeVariance = timing.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / timing.length;
        complexity += timeVariance * 0.01;

        return Math.min(10, Math.max(1, Math.round(complexity)));
    },

    // Compare two gestures
    compareGestures(gesture1, gesture2) {
        const { positions: pos1, timing: time1 } = gesture1;
        const { positions: pos2, timing: time2 } = gesture2;

        // Normalize timing
        const normalizedTime1 = this.normalizeTiming(time1);
        const normalizedTime2 = this.normalizeTiming(time2);

        // Calculate position similarity
        const positionSimilarity = this.calculatePositionSimilarity(pos1, pos2);
        
        // Calculate timing similarity
        const timingSimilarity = this.calculateTimingSimilarity(normalizedTime1, normalizedTime2);

        // Combined similarity score
        const similarity = (positionSimilarity + timingSimilarity) / 2;

        return {
            similarity,
            positionSimilarity,
            timingSimilarity,
            isMatch: similarity >= this.config.confidenceThreshold
        };
    },

    // Normalize timing array
    normalizeTiming(timing) {
        const min = Math.min(...timing);
        const max = Math.max(...timing);
        const range = max - min;

        return timing.map(t => (t - min) / range);
    },

    // Calculate position similarity
    calculatePositionSimilarity(positions1, positions2) {
        const minLength = Math.min(positions1.length, positions2.length);
        let totalSimilarity = 0;

        for (let i = 0; i < minLength; i++) {
            const distance = Utils.math.distance(positions1[i], positions2[i]);
            const similarity = Math.max(0, 1 - distance);
            totalSimilarity += similarity;
        }

        return totalSimilarity / minLength;
    },

    // Calculate timing similarity
    calculateTimingSimilarity(timing1, timing2) {
        const minLength = Math.min(timing1.length, timing2.length);
        let totalSimilarity = 0;

        for (let i = 0; i < minLength; i++) {
            const timeDiff = Math.abs(timing1[i] - timing2[i]);
            const similarity = Math.max(0, 1 - timeDiff);
            totalSimilarity += similarity;
        }

        return totalSimilarity / minLength;
    },

    // Set event callbacks
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    },

    // Clean up resources
    cleanup() {
        try {
            if (this.camera) {
                this.camera.stop();
            }
            if (this.hands) {
                this.hands.close();
            }
            if (this.video && this.video.srcObject) {
                const tracks = this.video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            
            this.isRecording = false;
            this.isProcessing = false;
            
            console.log('Gesture recognition cleaned up');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    },

    // Get current status
    getStatus() {
        return {
            isRecording: this.isRecording,
            isProcessing: this.isProcessing,
            hasCamera: !!this.camera,
            hasHands: !!this.hands,
            recordingDuration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
            positionsCount: this.gestureData.positions.length
        };
    }
};

// Export for use in other modules
window.GestureRecognition = GestureRecognition; 