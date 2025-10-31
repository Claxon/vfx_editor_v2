// Keyboard Shortcuts Manager
export class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.init();
    }

    init() {
        console.log('⌨️ Initializing Keyboard Shortcuts');
        this.registerShortcuts();
        this.setupListener();
    }

    registerShortcuts() {
        // File operations
        this.register('ctrl+s', () => this.save(), 'Save');
        this.register('ctrl+shift+s', () => this.saveAs(), 'Save As');
        this.register('ctrl+o', () => this.open(), 'Open');
        
        // Edit operations
        this.register('ctrl+z', () => this.undo(), 'Undo');
        this.register('ctrl+y', () => this.redo(), 'Redo');
        this.register('ctrl+c', () => this.copy(), 'Copy');
        this.register('ctrl+v', () => this.paste(), 'Paste');
        this.register('ctrl+x', () => this.cut(), 'Cut');
        this.register('ctrl+f', () => this.find(), 'Find');
        
        // View toggles
        this.register('f1', () => this.togglePanel('library'), 'Toggle Library');
        this.register('f2', () => this.togglePanel('timeline'), 'Toggle Timeline');
        this.register('f3', () => this.togglePanel('parameters'), 'Toggle Parameters');
        
        // Playback
        this.register('space', () => this.togglePlayback(), 'Play/Pause');
        this.register('escape', () => this.stop(), 'Stop');
        
        // Selection
        this.register('delete', () => this.deleteSelected(), 'Delete');
        
        // Tab switching
        this.register('alt+1', () => this.switchTab('parameters'), 'Parameters Tab');
        this.register('alt+2', () => this.switchTab('curves'), 'Curves Tab');
        this.register('alt+3', () => this.switchTab('expressions'), 'Expressions Tab');
    }

    register(combo, action, description) {
        this.shortcuts.set(combo, { action, description });
    }

    setupListener() {
        document.addEventListener('keydown', (e) => {
            const combo = this.getCombo(e);
            const shortcut = this.shortcuts.get(combo);
            
            if (shortcut) {
                e.preventDefault();
                shortcut.action();
            }
        });
    }

    getCombo(e) {
        const parts = [];
        
        if (e.ctrlKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        
        const key = e.key.toLowerCase();
        if (key !== 'control' && key !== 'shift' && key !== 'alt') {
            parts.push(key);
        }
        
        return parts.join('+');
    }

    // Action implementations
    save() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'save' }));
    }

    saveAs() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'saveas' }));
    }

    open() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'open' }));
    }

    undo() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'undo' }));
    }

    redo() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'redo' }));
    }

    copy() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'copy' }));
    }

    paste() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'paste' }));
    }

    cut() {
        document.dispatchEvent(new CustomEvent('menuAction', { detail: 'cut' }));
    }

    find() {
        const searchInput = document.getElementById('library-search');
        searchInput?.focus();
    }

    togglePanel(panelName) {
        console.log('Toggle panel:', panelName);
        // Would toggle panel visibility
    }

    togglePlayback() {
        console.log('Toggle playback');
        // Would start/stop particle animation
    }

    stop() {
        console.log('Stop playback');
    }

    deleteSelected() {
        console.log('Delete selected');
    }

    switchTab(tabName) {
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
    }
}

// Initialize
const keyboardShortcuts = new KeyboardShortcuts();
export default keyboardShortcuts;
