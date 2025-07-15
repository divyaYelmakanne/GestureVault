/**
 * GestureVault Main Entry Point
 * Initializes all modules and bootstraps the app
 */

// Ensure all modules are loaded
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Hide loading screen after initialization
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');

        // Initialize UI
        if (window.uiManager && typeof window.uiManager.init === 'function') {
            window.uiManager.init();
        }

        // Initialize Auth
        if (window.authManager && typeof window.authManager.init === 'function') {
            window.authManager.init();
        }

        // Initialize Voice Assistant
        if (window.voiceAssistant && typeof window.voiceAssistant.init === 'function') {
            window.voiceAssistant.init();
        }

        // Initialize Analytics
        if (window.analyticsManager && typeof window.analyticsManager.init === 'function') {
            window.analyticsManager.init();
        }

        // Initialize Security
        if (window.securityManager && typeof window.securityManager.init === 'function') {
            window.securityManager.init();
        }

        // Initialize Gesture Recognition
        if (window.GestureRecognition && typeof window.GestureRecognition.initialize === 'function') {
            await window.GestureRecognition.initialize();
        }

        // Set up navigation based on hash
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && window.uiManager) {
                window.uiManager.navigateTo(hash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        // Global error handler
        window.addEventListener('error', (e) => {
            if (window.uiManager) {
                window.uiManager.showError('Error', e.message);
            }
        });

        // Show welcome toast
        if (window.uiManager) {
            window.uiManager.showToast('Welcome to GestureVault!', 'info', 4000);
        }

        // Expose app status for debugging
        window.GestureVaultApp = {
            getStatus: () => ({
                auth: window.authManager?.isAuthenticated,
                user: window.authManager?.getCurrentUser(),
                gesture: window.GestureRecognition?.getStatus(),
                analytics: window.analyticsManager?.getStatus(),
                security: window.securityManager?.getStatus(),
                voice: window.voiceAssistant?.getStatus(),
                ui: window.uiManager?.getCurrentPage()
            })
        };
    } catch (error) {
        console.error('App initialization error:', error);
        if (window.uiManager) {
            window.uiManager.showError('Initialization Error', error.message);
        }
    }
}); 