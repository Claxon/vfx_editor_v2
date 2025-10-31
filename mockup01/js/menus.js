// Menu System Handler
export class MenuManager {
    constructor() {
        this.activeMenu = null;
        this.init();
    }

    init() {
        console.log('📋 Initializing Menu Manager');
        this.setupMenus();
        this.setupClickOutside();
    }

    setupMenus() {
        const menuItems = document.querySelectorAll('.menu-item');
        
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu(item);
            });

            // Setup menu options
            const options = item.querySelectorAll('.menu-option');
            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = option.dataset.action;
                    this.handleMenuAction(action);
                    this.closeAllMenus();
                });
            });
        });
    }

    toggleMenu(menuItem) {
        // Close other menus
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item !== menuItem) {
                item.classList.remove('active');
            }
        });

        // Toggle current menu
        menuItem.classList.toggle('active');
        this.activeMenu = menuItem.classList.contains('active') ? menuItem : null;
    }

    closeAllMenus() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        this.activeMenu = null;
    }

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-item')) {
                this.closeAllMenus();
            }
        });
    }

    handleMenuAction(action) {
        console.log('Menu action:', action);
        
        // Dispatch event for app to handle
        document.dispatchEvent(new CustomEvent('menuAction', {
            detail: action
        }));

        // Implement menu actions
        switch(action) {
            case 'new':
                this.showNotification('New Library', 'Creating new library...');
                break;
            case 'open':
                this.showNotification('Open Library', 'Opening library browser...');
                break;
            case 'save':
                // Don't show notification here - let app handle it
                console.log('Save action dispatched to app');
                break;
            case 'saveas':
                this.showNotification('Save As', 'Choose location to save...');
                break;
            case 'import':
                this.showNotification('Import', 'Importing effect...');
                break;
            case 'export':
                // Don't show notification here - let app handle it
                console.log('Export action dispatched to app');
                break;
            case 'exit':
                this.showNotification('Exit', 'Goodbye!');
                break;
            case 'undo':
                this.showNotification('Undo', 'Action undone');
                break;
            case 'redo':
                this.showNotification('Redo', 'Action redone');
                break;
            case 'find':
                document.getElementById('library-search')?.focus();
                break;
            case 'checkpoints':
                document.dispatchEvent(new Event('openCheckpointManager'));
                break;
            case 'docs':
                this.showNotification('Documentation', 'Opening documentation...');
                break;
            case 'shortcuts':
                this.showKeyboardShortcuts();
                break;
            case 'about':
                this.showAbout();
                break;
            default:
                this.showNotification(action, `Executing ${action}...`);
        }
    }

    showNotification(title, message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        `;
        
        // Add to document
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    showKeyboardShortcuts() {
        const shortcuts = `
            <div class="shortcuts-dialog">
                <h4>Keyboard Shortcuts</h4>
                <div class="shortcuts-grid">
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>S</kbd></span>
                        <span class="shortcut-desc">Save</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd></span>
                        <span class="shortcut-desc">Undo</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Y</kbd></span>
                        <span class="shortcut-desc">Redo</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>Space</kbd></span>
                        <span class="shortcut-desc">Play/Pause</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>1</kbd>-<kbd>4</kbd></span>
                        <span class="shortcut-desc">Switch to Checkpoint A-D</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd></span>
                        <span class="shortcut-desc">Create Checkpoint</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>F1</kbd>-<kbd>F3</kbd></span>
                        <span class="shortcut-desc">Toggle Panels</span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-keys"><kbd>Delete</kbd></span>
                        <span class="shortcut-desc">Delete Selected</span>
                    </div>
                </div>
            </div>
        `;
        this.showDialog('Keyboard Shortcuts', shortcuts);
    }

    showAbout() {
        const about = `
            <div class="about-dialog">
                <h2 style="margin-bottom: 16px; color: var(--accent-primary);">VFX Editor v2.0</h2>
                <p style="margin-bottom: 12px; color: var(--text-secondary);">
                    Professional Particle System Editor
                </p>
                <p style="margin-bottom: 12px; color: var(--text-muted); font-size: 12px;">
                    Interactive mockup demonstrating the next generation VFX editing experience
                    for Star Citizen's particle system.
                </p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <p style="font-size: 11px; color: var(--text-muted);">
                        Features: Library Management • Parameter Controls • Curve Editor<br>
                        Timeline • Checkpoints • Expression System • Live Preview
                    </p>
                </div>
            </div>
        `;
        this.showDialog('About', about);
    }

    showDialog(title, content) {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('.modal-close').addEventListener('click', () => {
            dialog.classList.remove('active');
            setTimeout(() => dialog.remove(), 300);
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.classList.remove('active');
                setTimeout(() => dialog.remove(), 300);
            }
        });
    }
}

// Add toast notification styles dynamically
const style = document.createElement('style');
style.textContent = `
    .toast-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--bg-panel);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        z-index: 5000;
        min-width: 250px;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
    }
    .toast-notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    .toast-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--accent-secondary);
    }
    .toast-message {
        font-size: 13px;
        color: var(--text-secondary);
    }
    .shortcuts-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    .shortcut-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: var(--bg-secondary);
        border-radius: 4px;
    }
    .shortcut-keys {
        font-weight: 600;
    }
    .shortcut-keys kbd {
        display: inline-block;
        padding: 2px 6px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 3px;
        font-size: 11px;
        font-family: monospace;
    }
    .shortcut-desc {
        font-size: 12px;
        color: var(--text-secondary);
    }
`;
document.head.appendChild(style);

// Initialize on import
const menuManager = new MenuManager();
export default menuManager;
