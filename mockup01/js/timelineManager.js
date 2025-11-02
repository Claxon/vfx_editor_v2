// Timeline Manager - Handles timeline visualization and track editing
// *** UPDATED with hierarchical tracks, lock/hide, and duration handle ***
export class TimelineManager {
    constructor() {
        this.container = document.getElementById('timeline-container');
        this.duration = 5; // seconds
        this.pixelsPerSecond = 200; // Base pixels per second
        this.zoom = 1;
        this.tracks = [];
        this.flags = [];
    }

    init() {
        console.log('⏱️ Initializing Timeline Manager');
    }

    /**
     * Loads the entire effect hierarchy (root + children) into the timeline.
     * @param {object} rootEffect - The root effect node.
     */
    loadEffectHierarchy(rootEffect) {
        // Build tracks from the effect hierarchy
        this.tracks = [];
        this.buildTracksRecursive(rootEffect, 0);
        
        // Find the max duration from tracks, default to 5 if no tracks
        const maxTrackDuration = this.tracks.reduce((max, track) => Math.max(max, track.start + track.duration), 0);
        this.duration = maxTrackDuration > 0 ? maxTrackDuration : 5.0;

        this.flags = [
            { time: 1.0, label: 'Burst', color: '#4ecdc4' },
            { time: 3.5, label: 'Fade', color: '#ff6b35' }
        ];

        this.render();
    }

    /**
     * Recursively builds a flat list of tracks from the effect tree.
     * @param {object} effect - The current effect node.
     * @param {number} level - The current hierarchy level for indentation.
     */
    buildTracksRecursive(effect, level) {
        if (effect.type !== 'effect') return;

        // Add this effect as a track
        this.tracks.push({
            id: effect.name,
            name: effect.name,
            start: effect.timeline?.start || 0,
            duration: effect.timeline?.duration || 2.0,
            color: effect.timeline?.color || this.getColorForLevel(level),
            level: level,
            isLocked: effect.isLocked || false,
            isVisible: effect.isVisible !== false // Default to true
        });

        // Recurse for children
        if (effect.items) {
            effect.items.forEach(child => this.buildTracksRecursive(child, level + 1));
        }
    }

    getColorForLevel(level) {
        const colors = ['#ff6b35', '#4ecdc4', '#f7b731', '#a855f7', '#3b82f6'];
        return colors[level % colors.length];
    }

    render() {
        if (!this.container) return;

        // Calculate total width based on duration and zoom
        const totalWidth = this.pixelsPerSecond * this.duration * this.zoom;
        
        const content = document.createElement('div');
        content.className = 'timeline-content';
        content.style.width = `${totalWidth}px`; // Set explicit width

        // Create header with controls
        const header = document.createElement('div');
        header.className = 'timeline-header';
        header.innerHTML = `
            <span>Track Name</span>
            <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
                <button class="timeline-control-btn" title="Add Flag Point">🚩</button>
                <button class="timeline-control-btn" id="timeline-zoom-in" title="Zoom In">🔍+</button>
                <button class="timeline-control-btn" id="timeline-zoom-out" title="Zoom Out">🔍-</button>
                <span style="margin-left: 8px;">Duration: ${this.duration.toFixed(1)}s</span>
            </div>
        `;

        // Setup zoom controls
        header.querySelector('#timeline-zoom-in')?.addEventListener('click', () => {
            this.zoom = Math.min(5, this.zoom * 1.5);
            this.render();
        });

        header.querySelector('#timeline-zoom-out')?.addEventListener('click', () => {
            this.zoom = Math.max(0.2, this.zoom / 1.5);
            this.render();
        });

        // Setup add flag
        header.querySelector('.timeline-control-btn[title="Add Flag Point"]')?.addEventListener('click', () => {
            this.addFlag(this.duration / 2); // Add at middle
        });

        // Create ruler
        const ruler = this.createRuler(totalWidth);

        // Create tracks
        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'timeline-tracks';

        this.tracks.forEach(track => {
            tracksContainer.appendChild(this.createTrack(track, totalWidth));
        });

        content.appendChild(header);
        content.appendChild(ruler);
        content.appendChild(tracksContainer);

        this.container.innerHTML = '';
        this.container.appendChild(content);

        // Render flags after tracks
        this.renderFlags(totalWidth);

        // --- NEW: Setup duration handle ---
        const durationHandle = ruler.querySelector('.timeline-duration-handle');
        this.setupDurationHandle(durationHandle, ruler);
    }

    createRuler(totalWidth) {
        const ruler = document.createElement('div');
        ruler.className = 'timeline-ruler';
        // Note: width is implicitly 100% of its parent, which is `totalWidth`

        const steps = Math.ceil(this.duration * this.zoom);
        const step = this.duration / steps;
        
        const timeStep = Math.max(0.1, 1 / this.zoom); // Dynamic step size

        for (let i = 0; i <= this.duration; i += timeStep) {
            const time = i;
            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.style.left = `${(time / this.duration) * 100}%`;

            const label = document.createElement('div');
            label.className = 'timeline-marker-label';
            label.textContent = `${time.toFixed(1)}s`;
            label.style.left = `${(time / this.duration) * 100}%`;

            ruler.appendChild(marker);
            ruler.appendChild(label);
        }

        // --- NEW: Add duration handle ---
        const durationHandle = document.createElement('div');
        durationHandle.className = 'timeline-duration-handle';
        durationHandle.title = 'Drag to change total duration';
        ruler.appendChild(durationHandle);
        // --- END NEW ---

        // Make ruler clickable to add flags
        ruler.addEventListener('dblclick', (e) => {
            const rect = ruler.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = (x / ruler.offsetWidth) * this.duration;
            this.addFlag(time);
        });

        return ruler;
    }

    createTrack(track, totalWidth) {
        const trackEl = document.createElement('div');
        trackEl.className = 'timeline-track';
        // Note: width is implicitly 100% of its parent, `tracksContainer`
        
        // Apply hierarchy indentation
        trackEl.style.paddingLeft = `${track.level * 20}px`;

        // Apply visual state
        if (track.isLocked) trackEl.classList.add('locked');
        if (!track.isVisible) trackEl.classList.add('hidden');

        const label = document.createElement('span');
        label.className = 'track-label';
        label.textContent = track.name;
        trackEl.appendChild(label);

        // Create track bar
        const bar = document.createElement('div');
        bar.className = 'track-bar';
        bar.style.left = `${(track.start / this.duration) * 100}%`;
        bar.style.width = `${(track.duration / this.duration) * 100}%`;
        bar.style.background = track.color;
        
        const minDuration = 0.1; // 0.1s minimum duration
        const minWidthPercent = (minDuration / this.duration) * 100;

        bar.innerHTML = `
            <span class="bar-label">${track.duration.toFixed(1)}s</span>
            <div class="bar-handle bar-handle-start" title="Adjust Start Time"></div>
            <div class="bar-handle bar-handle-end" title="Adjust Duration"></div>
        `;

        if (!track.isLocked) {
            // Make bar draggable (move position)
            this.setupBarDrag(bar, track, trackEl, minWidthPercent, totalWidth);
            // Make handles draggable (adjust start/duration)
            this.setupHandleDrag(bar, track, trackEl, minWidthPercent, totalWidth);
        }

        trackEl.appendChild(bar);

        return trackEl;
    }

    setupBarDrag(bar, track, trackEl, minWidthPercent, totalWidth) {
        const barLabel = bar.querySelector('.bar-label');

        bar.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('bar-handle')) return;

            e.stopPropagation();
            const startX = e.clientX;
            const startLeftPercent = parseFloat(bar.style.left) || 0;
            const barWidthPercent = parseFloat(bar.style.width) || 0;
            const visualPixelsPerSecond = this.pixelsPerSecond * this.zoom;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                // --- FIX: Calculate delta time based on pixelsPerSecond and zoom ---
                const deltaTime = deltaX / visualPixelsPerSecond;
                const originalStartTime = (startLeftPercent / 100) * this.duration;
                
                const newStartTime = Math.max(0, Math.min(this.duration - track.duration, originalStartTime + deltaTime));
                const newLeft = (newStartTime / this.duration) * 100;
                // --- END FIX ---
                
                bar.style.left = `${newLeft}%`;
                track.start = newStartTime;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s @ ${track.start.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
                this.dispatchTrackChange(track);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    setupHandleDrag(bar, track, trackEl, minWidthPercent, totalWidth) {
        const startHandle = bar.querySelector('.bar-handle-start');
        const endHandle = bar.querySelector('.bar-handle-end');
        const barLabel = bar.querySelector('.bar-label');

        // Start handle - adjust start time and duration
        startHandle?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const originalStartPercent = parseFloat(bar.style.left) || 0;
            const originalWidthPercent = parseFloat(bar.style.width) || 0;
            const visualPixelsPerSecond = this.pixelsPerSecond * this.zoom;
            
            const originalStartTime = (originalStartPercent / 100) * this.duration;
            const originalDuration = (originalWidthPercent / 100) * this.duration;
            const minDuration = 0.1;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                // --- FIX: Calculate delta time based on pixelsPerSecond and zoom ---
                const deltaTime = deltaX / visualPixelsPerSecond;
                
                let newStartTime = Math.max(0, originalStartTime + deltaTime);
                let newDuration = (originalStartTime + originalDuration) - newStartTime;

                // Enforce minimum duration
                if (newDuration < minDuration) {
                    newDuration = minDuration;
                    newStartTime = (originalStartTime + originalDuration) - minDuration;
                }
                // --- END FIX ---

                const newStartPercent = (newStartTime / this.duration) * 100;
                const newWidthPercent = (newDuration / this.duration) * 100;

                bar.style.left = `${newStartPercent}%`;
                bar.style.width = `${newWidthPercent}%`;
                
                track.start = newStartTime;
                track.duration = newDuration;
                
                // --- FIX: Show start time while dragging ---
                barLabel.textContent = `${track.duration.toFixed(1)}s @ ${track.start.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
                this.dispatchTrackChange(track);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // End handle - adjust duration only
        endHandle?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const originalWidthPercent = parseFloat(bar.style.width) || 0;
            const startPosPercent = parseFloat(bar.style.left) || 0;
            const visualPixelsPerSecond = this.pixelsPerSecond * this.zoom;

            const originalDuration = (originalWidthPercent / 100) * this.duration;
            const startTime = (startPosPercent / 100) * this.duration;
            const minDuration = 0.1;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                // --- FIX: Calculate delta time based on pixelsPerSecond and zoom ---
                const deltaTime = deltaX / visualPixelsPerSecond;
                
                let newDuration = Math.max(minDuration, originalDuration + deltaTime);
                
                // Constrain to end of timeline
                if (startTime + newDuration > this.duration) {
                    newDuration = this.duration - startTime;
                }
                // --- END FIX ---
                
                const newWidthPercent = (newDuration / this.duration) * 100;

                bar.style.width = `${newWidthPercent}%`;
                track.duration = newDuration;
                
                // --- FIX: Show start time while dragging ---
                barLabel.textContent = `${track.duration.toFixed(1)}s @ ${track.start.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
                this.dispatchTrackChange(track);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    dispatchTrackChange(track) {
        // Dispatch event so app can update renderer
        document.dispatchEvent(new CustomEvent('timelineTrackChanged', {
            detail: {
                effectId: track.id,
                start: track.start,
                duration: track.duration
            }
        }));
    }
    
    // --- NEW: Method to handle dragging the total duration ---
    setupDurationHandle(handle, ruler) {
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const rulerRect = ruler.getBoundingClientRect();
            const startX = rulerRect.left;
            const startWidth = rulerRect.width;
            const startDuration = this.duration;

            const onMouseMove = (e) => {
                const currentWidth = e.clientX - startX;
                
                // --- FIX: Don't re-render, just calculate new duration and dispatch ---
                // Calculate new duration based on pixel change, not zoom
                const newDuration = Math.max(1, startDuration * (currentWidth / startWidth));

                if (newDuration.toFixed(1) !== this.duration.toFixed(1)) {
                    this.duration = newDuration;
                    
                    // Update header text immediately
                    const headerSpan = this.container.querySelector('.timeline-header span');
                    if (headerSpan) headerSpan.textContent = `Duration: ${this.duration.toFixed(1)}s`;
                    
                    // Dispatch live update
                    document.dispatchEvent(new CustomEvent('timelineDurationChanged', {
                        detail: { duration: this.duration }
                    }));
                    
                    // We must re-render to update ruler marks and track percentages
                    this.render();
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                // Final render on mouse up
                this.render();
                
                console.log('New timeline duration set to:', this.duration);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    addFlag(time) {
        const flag = {
            time: Math.max(0, Math.min(this.duration, time)),
            label: `Flag ${this.flags.length + 1}`,
            color: '#4ecdc4'
        };

        this.flags.push(flag);
        this.renderFlags(this.container.querySelector('.timeline-content').offsetWidth);
        console.log('Added flag at', time);
    }

    renderFlags(totalWidth) {
        // Remove existing flags
        this.container.querySelectorAll('.timeline-flag').forEach(f => f.remove());

        const ruler = this.container.querySelector('.timeline-ruler');
        if (!ruler) return;

        this.flags.forEach((flag, index) => {
            const flagEl = document.createElement('div');
            flagEl.className = 'timeline-flag';
            flagEl.style.cssText = `
                position: absolute;
                left: ${(flag.time / this.duration) * 100}%;
                top: 0;
                bottom: -40px;
                width: 2px;
                background: ${flag.color};
                cursor: pointer;
                z-index: 10;
                box-shadow: 0 0 4px ${flag.color};
            `;

            const flagLabel = document.createElement('div');
            flagLabel.className = 'timeline-flag-label';
            flagLabel.textContent = flag.label;
            flagLabel.style.cssText = `
                position: absolute;
                top: -20px;
                left: 4px;
                background: ${flag.color};
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                white-space: nowrap;
                pointer-events: none;
            `;

            flagEl.appendChild(flagLabel);

            // Make flag draggable
            flagEl.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const rulerRect = ruler.getBoundingClientRect();
                const startTime = flag.time;

                const onMouseMove = (e) => {
                    const deltaX = e.clientX - startX;
                    const deltaTime = (deltaX / rulerRect.width) * this.duration;
                    flag.time = Math.max(0, Math.min(this.duration, startTime + deltaTime));
                    flagEl.style.left = `${(flag.time / this.duration) * 100}%`;
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    console.log('Flag moved to:', flag.time);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Double-click to edit label
            flagEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.editFlagLabel(flag, flagLabel);
            });

            // Right-click to delete
            flagEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.flags.splice(index, 1);
                this.renderFlags(totalWidth);
            });

            ruler.appendChild(flagEl);
        });
    }

    editFlagLabel(flag, labelEl) {
        const originalLabel = flag.label;
        labelEl.contentEditable = 'true';
        labelEl.focus();
        labelEl.style.pointerEvents = 'auto';

        const range = document.createRange();
        range.selectNodeContents(labelEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishEdit = () => {
            labelEl.contentEditable = 'false';
            labelEl.style.pointerEvents = 'none';
            flag.label = labelEl.textContent.trim() || originalLabel;
            labelEl.textContent = flag.label;
        };

        labelEl.addEventListener('blur', finishEdit, { once: true });
        labelEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                labelEl.textContent = originalLabel;
                finishEdit();
            }
        });
    }
}

// Add timeline control styles
const style = document.createElement('style');
style.textContent = `
    .timeline-control-btn {
        padding: 4px 8px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: 4px;
        font-size: 11px;
        transition: 0.15s ease;
    }
    .timeline-control-btn:hover {
        background: var(--bg-panel);
        border-color: var(--border-light);
        color: var(--text-primary);
    }
    .bar-label {
        font-size: 11px;
        white-space: nowrap;
        pointer-events: none;
    }
    .bar-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 8px;
        background: rgba(255, 255, 255, 0.3);
        cursor: ew-resize;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 10;
    }
    .bar-handle-start {
        left: 0;
        border-radius: 3px 0 0 3px;
    }
    .bar-handle-end {
        right: 0;
        border-radius: 0 3px 3px 0;
    }
    .track-bar:hover .bar-handle {
        opacity: 1;
    }
    .bar-handle:hover {
        background: rgba(255, 255, 255, 0.6);
    }
    .timeline-track.locked .track-bar {
        cursor: not-allowed;
        filter: brightness(0.7);
    }
    .timeline-track.hidden {
        opacity: 0.5;
    }
    .timeline-track.hidden .track-bar {
        opacity: 0.6;
    }
    /* --- NEW: Styles for Duration Handle --- */
    .timeline-ruler {
        position: relative;
    }
    .timeline-duration-handle {
        position: absolute;
        right: -4px;
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: ew-resize;
        background: rgba(255, 107, 53, 0.5);
        border-left: 2px solid var(--accent-primary);
        z-index: 20;
    }
    .timeline-duration-handle:hover {
        background: rgba(255, 107, 53, 0.8);
    }
`;
document.head.appendChild(style);


