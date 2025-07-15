/**
 * Voice Assistant Module
 * Handles voice commands, speech recognition, and text-to-speech
 */

class VoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.utterance = null;
        this.commands = new Map();
        this.context = 'general';
        this.language = 'en-US';
        this.voice = null;
        this.volume = 0.8;
        this.rate = 1.0;
        this.pitch = 1.0;
        
        this.init();
    }

    /**
     * Initialize voice assistant
     */
    init() {
        this.setupSpeechRecognition();
        this.setupSpeechSynthesis();
        this.registerDefaultCommands();
        this.setupEventListeners();
        this.loadSettings();
    }

    /**
     * Setup speech recognition
     */
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = this.language;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.triggerEvent('voice:listeningStarted');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processCommand(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.triggerEvent('voice:error', { error: event.error });
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.triggerEvent('voice:listeningEnded');
            };
        } else {
            console.warn('Speech recognition not supported');
        }
    }

    /**
     * Setup speech synthesis
     */
    setupSpeechSynthesis() {
        if (this.synthesis) {
            // Wait for voices to load
            this.synthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
            
            this.loadVoices();
        } else {
            console.warn('Speech synthesis not supported');
        }
    }

    /**
     * Load available voices
     */
    loadVoices() {
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.lang === this.language && voice.default
        ) || voices.find(voice => 
            voice.lang.startsWith(this.language.split('-')[0])
        ) || voices[0];
        
        this.voice = preferredVoice;
    }

    /**
     * Register default voice commands
     */
    registerDefaultCommands() {
        // Navigation commands
        this.registerCommand('go to home', () => {
            uiManager.navigateTo('home');
            this.speak('Navigating to home page');
        });
        
        this.registerCommand('go to dashboard', () => {
            uiManager.navigateTo('dashboard');
            this.speak('Navigating to dashboard');
        });
        
        this.registerCommand('go to settings', () => {
            uiManager.navigateTo('settings');
            this.speak('Navigating to settings');
        });
        
        this.registerCommand('go to tutorial', () => {
            uiManager.navigateTo('tutorial');
            this.speak('Opening tutorial');
        });
        
        this.registerCommand('go to social', () => {
            uiManager.navigateTo('social');
            this.speak('Navigating to social page');
        });

        // Authentication commands
        this.registerCommand('login', () => {
            uiManager.navigateTo('auth');
            this.speak('Opening login page');
        });
        
        this.registerCommand('register', () => {
            uiManager.navigateTo('auth');
            this.speak('Opening registration page');
        });
        
        this.registerCommand('logout', async () => {
            await authManager.logout();
            this.speak('Logged out successfully');
        });

        // Gesture commands
        this.registerCommand('start gesture recording', () => {
            if (window.gestureRecognition) {
                window.gestureRecognition.startRecording();
                this.speak('Started gesture recording');
            }
        });
        
        this.registerCommand('stop gesture recording', () => {
            if (window.gestureRecognition) {
                window.gestureRecognition.stopRecording();
                this.speak('Stopped gesture recording');
            }
        });
        
        this.registerCommand('validate gesture', () => {
            if (window.gestureRecognition) {
                window.gestureRecognition.validateGesture();
                this.speak('Validating gesture');
            }
        });

        // UI commands
        this.registerCommand('toggle theme', () => {
            uiManager.toggleTheme();
            this.speak('Theme toggled');
        });
        
        this.registerCommand('toggle sidebar', () => {
            uiManager.toggleSidebar();
            this.speak('Sidebar toggled');
        });
        
        this.registerCommand('close modal', () => {
            uiManager.closeModal();
            this.speak('Modal closed');
        });
        
        this.registerCommand('show help', () => {
            this.speak('Here are some voice commands you can use: navigate to different pages, start or stop gesture recording, toggle theme, and more. Say "help" for a full list.');
        });

        // System commands
        this.registerCommand('what time is it', () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            this.speak(`The current time is ${timeString}`);
        });
        
        this.registerCommand('what day is it', () => {
            const now = new Date();
            const dayString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            this.speak(`Today is ${dayString}`);
        });
        
        this.registerCommand('stop speaking', () => {
            this.stopSpeaking();
        });
        
        this.registerCommand('mute', () => {
            this.mute();
        });
        
        this.registerCommand('unmute', () => {
            this.unmute();
        });
    }

    /**
     * Register a voice command
     */
    registerCommand(phrase, callback, context = 'general') {
        this.commands.set(phrase.toLowerCase(), {
            callback,
            context,
            phrase
        });
    }

    /**
     * Process voice command
     */
    processCommand(transcript) {
        console.log('Processing command:', transcript);
        
        // Check for exact matches first
        if (this.commands.has(transcript)) {
            const command = this.commands.get(transcript);
            if (command.context === this.context || command.context === 'general') {
                command.callback();
                return;
            }
        }
        
        // Check for partial matches
        for (const [phrase, command] of this.commands) {
            if (transcript.includes(phrase) && (command.context === this.context || command.context === 'general')) {
                command.callback();
                return;
            }
        }
        
        // No command found
        this.speak("I didn't understand that command. Say 'help' for available commands.");
    }

    /**
     * Start listening for voice commands
     */
    startListening() {
        if (!this.recognition) {
            this.speak('Speech recognition is not supported in this browser');
            return false;
        }
        
        if (this.isListening) {
            this.stopListening();
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            return false;
        }
    }

    /**
     * Stop listening for voice commands
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    /**
     * Speak text
     */
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.warn('Speech synthesis not supported');
            return;
        }
        
        // Stop any current speech
        this.stopSpeaking();
        
        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.voice = options.voice || this.voice;
        this.utterance.volume = options.volume || this.volume;
        this.utterance.rate = options.rate || this.rate;
        this.utterance.pitch = options.pitch || this.pitch;
        this.utterance.lang = options.lang || this.language;
        
        this.utterance.onstart = () => {
            this.isSpeaking = true;
            this.triggerEvent('voice:speakingStarted', { text });
        };
        
        this.utterance.onend = () => {
            this.isSpeaking = false;
            this.triggerEvent('voice:speakingEnded', { text });
        };
        
        this.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isSpeaking = false;
            this.triggerEvent('voice:error', { error: event.error });
        };
        
        this.synthesis.speak(this.utterance);
    }

    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }

    /**
     * Mute voice assistant
     */
    mute() {
        this.volume = 0;
        this.triggerEvent('voice:muted');
    }

    /**
     * Unmute voice assistant
     */
    unmute() {
        this.volume = 0.8;
        this.triggerEvent('voice:unmuted');
    }

    /**
     * Set voice assistant context
     */
    setContext(context) {
        this.context = context;
        this.triggerEvent('voice:contextChanged', { context });
    }

    /**
     * Get available voices
     */
    getVoices() {
        return this.synthesis ? this.synthesis.getVoices() : [];
    }

    /**
     * Set voice
     */
    setVoice(voice) {
        this.voice = voice;
        this.saveSettings();
    }

    /**
     * Set language
     */
    setLanguage(language) {
        this.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        this.loadVoices();
        this.saveSettings();
    }

    /**
     * Set volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * Set speech rate
     */
    setRate(rate) {
        this.rate = Math.max(0.1, Math.min(10, rate));
        this.saveSettings();
    }

    /**
     * Set pitch
     */
    setPitch(pitch) {
        this.pitch = Math.max(0, Math.min(2, pitch));
        this.saveSettings();
    }

    /**
     * Load voice assistant settings
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('gestureVault_voice_settings');
            if (settings) {
                const savedSettings = JSON.parse(settings);
                this.language = savedSettings.language || this.language;
                this.volume = savedSettings.volume || this.volume;
                this.rate = savedSettings.rate || this.rate;
                this.pitch = savedSettings.pitch || this.pitch;
                
                if (savedSettings.voice) {
                    const voices = this.getVoices();
                    this.voice = voices.find(v => v.name === savedSettings.voice) || this.voice;
                }
            }
        } catch (error) {
            console.error('Error loading voice settings:', error);
        }
    }

    /**
     * Save voice assistant settings
     */
    saveSettings() {
        try {
            const settings = {
                language: this.language,
                voice: this.voice ? this.voice.name : null,
                volume: this.volume,
                rate: this.rate,
                pitch: this.pitch
            };
            localStorage.setItem('gestureVault_voice_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving voice settings:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for page changes to update context
        document.addEventListener('ui:pageChanged', (event) => {
            this.setContext(event.detail.page);
        });
        
        // Listen for authentication events
        document.addEventListener('auth:loggedIn', () => {
            this.speak('Welcome back! You are now logged in.');
        });
        
        document.addEventListener('auth:loggedOut', () => {
            this.speak('You have been logged out.');
        });
        
        // Listen for gesture events
        document.addEventListener('gesture:recordingStarted', () => {
            this.speak('Gesture recording started. Perform your gesture now.');
        });
        
        document.addEventListener('gesture:recordingStopped', () => {
            this.speak('Gesture recording stopped.');
        });
        
        document.addEventListener('gesture:validated', (event) => {
            if (event.detail.success) {
                this.speak('Gesture validated successfully!');
            } else {
                this.speak('Gesture validation failed. Please try again.');
            }
        });
        
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + V - toggle voice assistant
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    /**
     * Toggle voice listening
     */
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    /**
     * Get voice assistant status
     */
    getStatus() {
        return {
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            context: this.context,
            language: this.language,
            volume: this.volume,
            rate: this.rate,
            pitch: this.pitch,
            voice: this.voice ? this.voice.name : null
        };
    }

    /**
     * Get available commands for current context
     */
    getAvailableCommands() {
        const commands = [];
        for (const [phrase, command] of this.commands) {
            if (command.context === this.context || command.context === 'general') {
                commands.push({
                    phrase: command.phrase,
                    context: command.context
                });
            }
        }
        return commands;
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
     * Check if speech recognition is supported
     */
    isSpeechRecognitionSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    /**
     * Check if speech synthesis is supported
     */
    isSpeechSynthesisSupported() {
        return !!window.speechSynthesis;
    }

    /**
     * Get microphone permission status
     */
    async getMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return 'granted';
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                return 'denied';
            } else if (error.name === 'NotFoundError') {
                return 'no-microphone';
            } else {
                return 'error';
            }
        }
    }

    /**
     * Request microphone permission
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            return false;
        }
    }
}

// Initialize voice assistant
const voiceAssistant = new VoiceAssistant();

// Export for use in other modules
window.voiceAssistant = voiceAssistant; 