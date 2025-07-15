/**
 * UI Module
 * Manages user interface, navigation, modals, toasts, and page transitions
 */

class UIManager {
    constructor() {
        this.currentPage = 'home';
        this.modals = new Map();
        this.toasts = [];
        this.isLoading = false;
        this.isDarkMode = false;
        this.isSidebarOpen = false;
        this.isVoiceAssistantOpen = false;
        
        this.init();
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.initializeComponents();
        this.setupKeyboardShortcuts();
    }

    /**
     * Load saved theme preference
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('gestureVault_theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.enableDarkMode();
        } else {
            this.enableLightMode();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-nav]')) {
                e.preventDefault();
                const page = e.target.getAttribute('data-nav');
                this.navigateTo(page);
            }
        });

        // Modal events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal]')) {
                e.preventDefault();
                const modalId = e.target.getAttribute('data-modal');
                this.openModal(modalId);
            }
            
            if (e.target.matches('.modal-overlay') || e.target.matches('.modal-close')) {
                e.preventDefault();
                this.closeModal();
            }
        });

        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme-toggle]')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Sidebar toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-sidebar-toggle]')) {
                e.preventDefault();
                this.toggleSidebar();
            }
        });

        // Voice assistant toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-voice-toggle]')) {
                e.preventDefault();
                this.toggleVoiceAssistant();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Initialize UI components
     */
    initializeComponents() {
        this.initializeModals();
        this.initializeToasts();
        this.initializeTooltips();
        this.initializeProgressBars();
        this.initializeCharts();
    }

    /**
     * Navigate to a specific page
     */
    navigateTo(page) {
        if (this.currentPage === page) return;

        // Hide current page
        const currentPageElement = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
        }

        // Show new page
        const newPageElement = document.querySelector(`[data-page="${page}"]`);
        if (newPageElement) {
            newPageElement.classList.add('active');
            this.currentPage = page;
            
            // Update navigation
            this.updateNavigation(page);
            
            // Trigger page change event
            this.triggerEvent('ui:pageChanged', { page });
            
            // Update URL without page reload
            history.pushState({ page }, '', `#${page}`);
        }
    }

    /**
     * Update navigation state
     */
    updateNavigation(page) {
        // Remove active class from all nav items
        document.querySelectorAll('[data-nav]').forEach(nav => {
            nav.classList.remove('active');
        });

        // Add active class to current nav item
        const activeNav = document.querySelector(`[data-nav="${page}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Update page title
        const pageTitles = {
            home: 'GestureVault - Secure Gesture Authentication',
            auth: 'Authentication - GestureVault',
            tutorial: 'Tutorial - GestureVault',
            dashboard: 'Dashboard - GestureVault',
            social: 'Social - GestureVault',
            settings: 'Settings - GestureVault'
        };
        
        document.title = pageTitles[page] || 'GestureVault';
    }

    /**
     * Open modal
     */
    openModal(modalId, data = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Store modal data
        this.modals.set(modalId, data);

        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // Focus first input if exists
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            firstInput.focus();
        }

        // Trigger modal open event
        this.triggerEvent('ui:modalOpened', { modalId, data });
    }

    /**
     * Close modal
     */
    closeModal() {
        const activeModal = document.querySelector('.modal.active');
        if (!activeModal) return;

        const modalId = activeModal.id;
        
        // Hide modal
        activeModal.classList.remove('active');
        document.body.classList.remove('modal-open');

        // Clear modal data
        this.modals.delete(modalId);

        // Trigger modal close event
        this.triggerEvent('ui:modalClosed', { modalId });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const toast = {
            id: Date.now(),
            message,
            type,
            duration
        };

        this.toasts.push(toast);
        this.renderToast(toast);

        // Auto remove toast
        setTimeout(() => {
            this.removeToast(toast.id);
        }, duration);

        return toast.id;
    }

    /**
     * Remove toast notification
     */
    removeToast(toastId) {
        const toastElement = document.querySelector(`[data-toast-id="${toastId}"]`);
        if (toastElement) {
            toastElement.classList.add('fade-out');
            setTimeout(() => {
                toastElement.remove();
            }, 300);
        }

        this.toasts = this.toasts.filter(toast => toast.id !== toastId);
    }

    /**
     * Render toast notification
     */
    renderToast(toast) {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toastElement = document.createElement('div');
        toastElement.className = `toast toast-${toast.type}`;
        toastElement.setAttribute('data-toast-id', toast.id);
        
        toastElement.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${toast.message}</span>
                <button class="toast-close" onclick="uiManager.removeToast(${toast.id})">×</button>
            </div>
        `;

        toastContainer.appendChild(toastElement);
        
        // Trigger animation
        setTimeout(() => {
            toastElement.classList.add('show');
        }, 10);
    }

    /**
     * Create toast container if it doesn't exist
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Show loading spinner
     */
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        
        const loadingElement = document.createElement('div');
        loadingElement.id = 'loading-overlay';
        loadingElement.className = 'loading-overlay';
        loadingElement.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        
        document.body.appendChild(loadingElement);
        
        // Trigger loading event
        this.triggerEvent('ui:loadingStarted', { message });
    }

    /**
     * Hide loading spinner
     */
    hideLoading() {
        this.isLoading = false;
        
        const loadingElement = document.getElementById('loading-overlay');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Trigger loading event
        this.triggerEvent('ui:loadingEnded');
    }

    /**
     * Toggle dark mode
     */
    toggleTheme() {
        if (this.isDarkMode) {
            this.enableLightMode();
        } else {
            this.enableDarkMode();
        }
    }

    /**
     * Enable dark mode
     */
    enableDarkMode() {
        this.isDarkMode = true;
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('gestureVault_theme', 'dark');
        
        // Update theme toggle button
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        this.triggerEvent('ui:themeChanged', { theme: 'dark' });
    }

    /**
     * Enable light mode
     */
    enableLightMode() {
        this.isDarkMode = false;
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('gestureVault_theme', 'light');
        
        // Update theme toggle button
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        this.triggerEvent('ui:themeChanged', { theme: 'light' });
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open', this.isSidebarOpen);
        }
        
        document.body.classList.toggle('sidebar-open', this.isSidebarOpen);
        
        this.triggerEvent('ui:sidebarToggled', { isOpen: this.isSidebarOpen });
    }

    /**
     * Toggle voice assistant
     */
    toggleVoiceAssistant() {
        this.isVoiceAssistantOpen = !this.isVoiceAssistantOpen;
        
        const voiceAssistant = document.querySelector('.voice-assistant');
        if (voiceAssistant) {
            voiceAssistant.classList.toggle('open', this.isVoiceAssistantOpen);
        }
        
        this.triggerEvent('ui:voiceAssistantToggled', { isOpen: this.isVoiceAssistantOpen });
    }

    /**
     * Initialize modals
     */
    initializeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            // Add close button if not present
            if (!modal.querySelector('.modal-close')) {
                const closeButton = document.createElement('button');
                closeButton.className = 'modal-close';
                closeButton.innerHTML = '×';
                closeButton.setAttribute('aria-label', 'Close modal');
                modal.querySelector('.modal-header')?.appendChild(closeButton);
            }
        });
    }

    /**
     * Initialize toasts
     */
    initializeToasts() {
        // Toast container is created on demand
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target);
            });
            
            element.addEventListener('mouseleave', (e) => {
                this.hideTooltip(e.target);
            });
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(element) {
        const tooltipText = element.getAttribute('data-tooltip');
        if (!tooltipText) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = tooltipText;
        tooltip.setAttribute('data-tooltip-for', element.id || 'temp-id');
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
        
        // Show tooltip
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 10);
    }

    /**
     * Hide tooltip
     */
    hideTooltip(element) {
        const tooltipId = element.id || 'temp-id';
        const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`);
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Initialize progress bars
     */
    initializeProgressBars() {
        const progressBars = document.querySelectorAll('.progress-bar');
        progressBars.forEach(bar => {
            const progress = bar.getAttribute('data-progress') || 0;
            this.updateProgressBar(bar, progress);
        });
    }

    /**
     * Update progress bar
     */
    updateProgressBar(bar, progress) {
        const fill = bar.querySelector('.progress-fill');
        if (fill) {
            fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            bar.setAttribute('data-progress', progress);
        }
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        // Chart initialization would depend on the charting library being used
        // This is a placeholder for chart setup
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Shortcuts are handled in handleKeyboardShortcuts method
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Escape key - close modals
        if (e.key === 'Escape') {
            if (this.isSidebarOpen) {
                this.toggleSidebar();
            } else if (document.querySelector('.modal.active')) {
                this.closeModal();
            }
        }

        // Ctrl/Cmd + K - open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.openModal('search-modal');
        }

        // Ctrl/Cmd + / - toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            this.toggleTheme();
        }

        // Ctrl/Cmd + M - toggle voice assistant
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            this.toggleVoiceAssistant();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Close sidebar on mobile when screen gets larger
        if (window.innerWidth > 768 && this.isSidebarOpen) {
            this.toggleSidebar();
        }
    }

    /**
     * Update user interface based on authentication state
     */
    updateAuthUI(isAuthenticated, user = null) {
        const authElements = document.querySelectorAll('[data-auth]');
        const guestElements = document.querySelectorAll('[data-guest]');
        
        if (isAuthenticated) {
            // Show authenticated elements
            authElements.forEach(element => {
                element.style.display = '';
            });
            
            // Hide guest elements
            guestElements.forEach(element => {
                element.style.display = 'none';
            });
            
            // Update user info
            if (user) {
                const userElements = document.querySelectorAll('[data-user]');
                userElements.forEach(element => {
                    const field = element.getAttribute('data-user');
                    if (user[field]) {
                        element.textContent = user[field];
                    }
                });
            }
        } else {
            // Hide authenticated elements
            authElements.forEach(element => {
                element.style.display = 'none';
            });
            
            // Show guest elements
            guestElements.forEach(element => {
                element.style.display = '';
            });
        }
    }

    /**
     * Show confirmation dialog
     */
    showConfirmation(message, onConfirm, onCancel = null) {
        const modalId = 'confirmation-modal';
        
        // Create modal if it doesn't exist
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Confirm Action</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <p class="confirmation-message"></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button class="btn btn-danger" data-action="confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Update message
        const messageElement = document.querySelector(`#${modalId} .confirmation-message`);
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        // Setup event listeners
        const modal = document.getElementById(modalId);
        const confirmBtn = modal.querySelector('[data-action="confirm"]');
        const cancelBtn = modal.querySelector('[data-action="cancel"]');
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlay);
        };
        
        const handleConfirm = () => {
            cleanup();
            this.closeModal();
            if (onConfirm) onConfirm();
        };
        
        const handleCancel = () => {
            cleanup();
            this.closeModal();
            if (onCancel) onCancel();
        };
        
        const handleOverlay = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                handleCancel();
            }
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleOverlay);
        
        // Open modal
        this.openModal(modalId);
    }

    /**
     * Show error dialog
     */
    showError(title, message) {
        const modalId = 'error-modal';
        
        // Create modal if it doesn't exist
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="error-title"></h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <p class="error-message"></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" data-action="ok">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Update content
        const titleElement = document.querySelector(`#${modalId} .error-title`);
        const messageElement = document.querySelector(`#${modalId} .error-message`);
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // Setup event listener
        const modal = document.getElementById(modalId);
        const okBtn = modal.querySelector('[data-action="ok"]');
        
        const handleOk = () => {
            okBtn.removeEventListener('click', handleOk);
            this.closeModal();
        };
        
        okBtn.addEventListener('click', handleOk);
        
        // Open modal
        this.openModal(modalId);
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
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Check if modal is open
     */
    isModalOpen() {
        return document.querySelector('.modal.active') !== null;
    }

    /**
     * Check if loading
     */
    isLoading() {
        return this.isLoading;
    }

    /**
     * Check if dark mode is enabled
     */
    isDarkModeEnabled() {
        return this.isDarkMode;
    }
}

// Initialize UI manager
const uiManager = new UIManager();

// Export for use in other modules
window.uiManager = uiManager; 