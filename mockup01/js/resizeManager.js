// Resize Manager - Handle panel resizing
export class ResizeManager {
    constructor() {
        this.isResizing = false;
        this.currentHandle = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.panel = null;
    }

    init() {
        console.log('📐 Initializing Resize Manager');
        this.setupHandles();
    }

    setupHandles() {
        const handles = document.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startResize(e, handle);
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isResizing) {
                this.resize(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.stopResize();
        });
    }

    startResize(e, handle) {
        this.isResizing = true;
        this.currentHandle = handle;
        this.startX = e.clientX;
        this.startY = e.clientY;

        const panelId = handle.dataset.panel;
        this.panel = document.getElementById(panelId);

        if (!this.panel) return;

        const rect = this.panel.getBoundingClientRect();
        this.startWidth = rect.width;
        this.startHeight = rect.height;

        document.body.style.cursor = handle.style.cursor;
        this.panel.style.userSelect = 'none';
        this.panel.style.pointerEvents = 'none';
    }

    resize(e) {
        if (!this.panel || !this.currentHandle) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        if (this.currentHandle.classList.contains('resize-handle-right')) {
            const newWidth = this.startWidth + deltaX;
            const minWidth = parseInt(this.panel.dataset.minWidth) || 200;
            const maxWidth = parseInt(this.panel.dataset.maxWidth) || 800;
            this.panel.style.width = `${Math.max(minWidth, Math.min(maxWidth, newWidth))}px`;
        }

        if (this.currentHandle.classList.contains('resize-handle-left')) {
            const newWidth = this.startWidth - deltaX;
            const minWidth = parseInt(this.panel.dataset.minWidth) || 200;
            const maxWidth = parseInt(this.panel.dataset.maxWidth) || 800;
            this.panel.style.width = `${Math.max(minWidth, Math.min(maxWidth, newWidth))}px`;
        }

        if (this.currentHandle.classList.contains('resize-handle-bottom')) {
            const newHeight = this.startHeight + deltaY;
            const minHeight = 100;
            const maxHeight = window.innerHeight - 150;
            this.panel.style.height = `${Math.max(minHeight, Math.min(maxHeight, newHeight))}px`;
        }

        if (this.currentHandle.classList.contains('resize-handle-top')) {
            const newHeight = this.startHeight - deltaY;
            const minHeight = 100;
            const maxHeight = window.innerHeight - 150;
            this.panel.style.height = `${Math.max(minHeight, Math.min(maxHeight, newHeight))}px`;
        }
    }

    stopResize() {
        if (!this.isResizing) return;

        this.isResizing = false;
        this.currentHandle = null;
        document.body.style.cursor = '';
        
        if (this.panel) {
            this.panel.style.userSelect = '';
            this.panel.style.pointerEvents = '';
        }
        
        this.panel = null;

        // Trigger resize event for canvas elements
        window.dispatchEvent(new Event('resize'));
    }
}

// Initialize
const resizeManager = new ResizeManager();

document.addEventListener('DOMContentLoaded', () => {
    resizeManager.init();
});

export default resizeManager;
