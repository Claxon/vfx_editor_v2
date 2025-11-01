// Timeline Manager - Handles timeline visualization and track editing
// *** UPDATED to support effect hierarchies and locking ***
export class TimelineManager {
    constructor() {
        this.container = document.getElementById('timeline-container');
        this.duration = 5; // seconds
        this.tracks = []; // Will store { id, name, start, duration, color, level, isLocked, isVisible }
        this.flags = [];
        this.zoom = 1;
        this.pixelsPerSecond = 200; // Base zoom level
    }

    init() {
        console.log('⏱️ Initializing Timeline Manager');
    }

    loadEffectHierarchy(rootEffect) {
        // Build tracks from the effect hierarchy
        this.tracks = [];
        this.buildTracksRecursive(rootEffect, 0);
        
        // Find the max duration
        this.duration = this.tracks.reduce((max, track) => Math.max(max, track.start + track.duration), 5);

        this.flags = [
            { time: 1.0, label: 'Burst', color: '#4ecdc4' },
            { time: 3.5, label: 'Fade', color: '#ff6b35' }
        ];

        this.render();
    }

    buildTracksRecursive(effect, level) {
        if (effect.type !== 'effect') return;

        // Add track for the current effect
        const trackData = {
            id: effect.name,
            name: effect.name,
            start: effect.timeline?.start || 0,
            duration: effect.timeline?.duration || this.duration,
            color: effect.color || this.getRandomColor(level),
            level: level,
            isLocked: effect.isLocked || false,
            isVisible: effect.isVisible !== false // Default to true
        };
        this.tracks.push(trackData);

        // Recursively add children
        if (effect.items) {
            effect.items.forEach(child => this.buildTracksRecursive(child, level + 1));
        }
    }

    getRandomColor(level) {
        const colors = [
            ['#ff6b35', '#f7b731', '#f94144'], // Level 0
            ['#4ecdc4', '#3b82f6', '#43aa8b'], // Level 1
            ['#a855f7', '#90be6d', '#f8961e']  // Level 2+
        ];
        const set = colors[Math.min(level, colors.length - 1)];
        return set[Math.floor(Math.random() * set.length)];
    }

    render() {
        if (!this.container) return;

        const content = document.createElement('div');
        content.className = 'timeline-content';
        const totalWidth = this.duration * this.pixelsPerSecond * this.zoom;
        content.style.width = `${totalWidth}px`;

        // Create header with controls
        const header = document.createElement('div');
        header.className = 'timeline-header';
        header.innerHTML = `
            <span>Track Name</span>
            <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
                <button class="timeline-control-btn" title="Add Flag Point">🚩</button>
                <button class="timeline-control-btn" id="zoom-in" title="Zoom In">🔍+</button>
                <button class="timeline-control-btn" id="zoom-out" title="Zoom Out">🔍-</button>
                <span style="margin-left: 8px;">Duration: ${this.duration.toFixed(1)}s</span>
            </div>
        `;

        // Setup zoom controls
        header.querySelector('#zoom-in')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoom = Math.min(5, this.zoom * 1.2);
            this.render();
        });

        header.querySelector('#zoom-out')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoom = Math.max(0.2, this.zoom / 1.2);
            this.render();
        });

        // Setup add flag
        header.querySelector('.timeline-control-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addFlag(2.5); // Add at middle
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
    }

    createRuler(totalWidth) {
        const ruler = document.createElement('div');
        ruler.className = 'timeline-ruler';
        ruler.style.width = `${totalWidth}px`;

        const steps = Math.ceil(this.duration);
        const stepSize = (1 / this.duration) * 100; // Percent per second

        // Add time markers
        for (let i = 0; i <= steps; i++) {
            const time = i;
            if (time > this.duration) continue;

            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.style.left = `${(time / this.duration) * 100}%`;

            const label = document.createElement('div');
            label.className = 'timeline-marker-label';
            label.textContent = `${time.toFixed(0)}s`;
            label.style.left = `${(time / this.duration) * 100}%`;

            ruler.appendChild(marker);
            ruler.appendChild(label);
        }

        // Make ruler clickable to add flags
        ruler.addEventListener('dblclick', (e) => {
            const rect = ruler.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = (x / totalWidth) * this.duration;
            this.addFlag(time);
        });

        return ruler;
    }

    createTrack(track, totalWidth) {
        const trackEl = document.createElement('div');
        trackEl.className = 'timeline-track';
        trackEl.dataset.effectId = track.id;
        trackEl.style.width = `${totalWidth}px`;
        trackEl.style.paddingLeft = `${track.level * 20}px`; // Indentation
        if (track.isLocked) trackEl.classList.add('locked');
        if (!track.isVisible) trackEl.classList.add('hidden');

        const label = document.createElement('span');
        label.className = 'track-label';
        label.textContent = track.name;
        trackEl.appendChild(label);

        // Create track bar
        const bar = document.createElement('div');
        bar.className = 'track-bar';
        const barLeft = (track.start / this.duration) * 100;
        const barWidth = (track.duration / this.duration) * 100;
        
        bar.style.left = `${barLeft}%`;
        bar.style.width = `${barWidth}%`;
        bar.style.background = track.color;
        
        bar.innerHTML = `
            <span class="bar-label">${track.duration.toFixed(1)}s</span>
            <div class="bar-handle bar-handle-start" title="Adjust Start Time"></div>
            <div class="bar-handle bar-handle-end" title="Adjust Duration"></div>
        `;

        // Make bar draggable (move position)
        this.setupBarDrag(bar, track, trackEl);

        // Make handles draggable (adjust start/duration)
        this.setupHandleDrag(bar, track, trackEl);

        trackEl.appendChild(bar);

        return trackEl;
    }

    setupBarDrag(bar, track, trackEl) {
        const barLabel = bar.querySelector('.bar-label');

        bar.addEventListener('mousedown', (e) => {
            if (track.isLocked) return; // Check lock
            
            // Don't drag if clicking on handles
            if (e.target.classList.contains('bar-handle')) return;

            e.stopPropagation();
            const startX = e.clientX;
            const startLeftPercent = parseFloat(bar.style.left);
            const barWidthPercent = parseFloat(bar.style.width);
            const trackWidthPixels = trackEl.offsetWidth;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const deltaPercent = (deltaX / trackWidthPixels) * 100;
                const newLeft = Math.max(0, Math.min(100 - barWidthPercent, startLeftPercent + deltaPercent));
                
                bar.style.left = `${newLeft}%`;
                track.start = (newLeft / 100) * this.duration;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s @ ${track.start.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
                // Dispatch change
                this.dispatchTrackChange(track);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    setupHandleDrag(bar, track, trackEl) {
        const startHandle = bar.querySelector('.bar-handle-start');
        const endHandle = bar.querySelector('.bar-handle-end');
        const barLabel = bar.querySelector('.bar-label');
        const trackWidthPixels = trackEl.offsetWidth;

        // Start handle - adjust start time and duration
        startHandle?.addEventListener('mousedown', (e) => {
            if (track.isLocked) return; // Check lock
            e.stopPropagation();
            
            const startX = e.clientX;
            const originalStartPercent = parseFloat(bar.style.left);
            const originalWidthPercent = parseFloat(bar.style.width);
            const minWidthPercent = (0.1 / this.duration) * 100; // Min 0.1s

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const deltaPercent = (deltaX / trackWidthPixels) * 100;
                
                const newStart = Math.max(0, Math.min(originalStartPercent + originalWidthPercent - minWidthPercent, originalStartPercent + deltaPercent));
                const newWidth = originalStartPercent + originalWidthPercent - newStart;
                
                bar.style.left = `${newStart}%`;
                bar.style.width = `${newWidth}%`;
                
                track.start = (newStart / 100) * this.duration;
                track.duration = (newWidth / 100) * this.duration;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.dispatchTrackChange(track);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // End handle - adjust duration only
        endHandle?.addEventListener('mousedown', (e) => {
            if (track.isLocked) return; // Check lock
            e.stopPropagation();
            
            const startX = e.clientX;
            const originalWidthPercent = parseFloat(bar.style.width);
            const startPosPercent = parseFloat(bar.style.left);
            const minWidthPercent = (0.1 / this.duration) * 100;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const deltaPercent = (deltaX / trackWidthPixels) * 100;
                
                const newWidth = Math.max(minWidthPercent, Math.min(100 - startPosPercent, originalWidthPercent + deltaPercent));
                
                bar.style.width = `${newWidth}%`;
                track.duration = (newWidth / 100) * this.duration;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.dispatchTrackChange(track);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    dispatchTrackChange(track) {
        document.dispatchEvent(new CustomEvent('timelineTrackChanged', {
            detail: {
                effectId: track.id,
                start: track.start,
                duration: track.duration
            }
        }));
    }

    addFlag(time) {
        const flag = {
            time: Math.max(0, Math.min(this.duration, time)),
            label: `Flag ${this.flags.length + 1}`,
            color: '#4ecdc4'
        };

        this.flags.push(flag);
        this.renderFlags(this.duration * this.pixelsPerSecond * this.zoom);
        console.log('Added flag at', time);
    }

    renderFlags(totalWidth) {
        // Remove existing flags
        document.querySelectorAll('.timeline-flag').forEach(f => f.remove());

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

        const range = document.createRange();
        range.selectNodeContents(labelEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishEdit = () => {
            labelEl.contentEditable = 'false';
            flag.label = labelEl.textContent.trim() || originalLabel;
            labelEl.textContent = flag.label;
        };

        labelEl.addEventListener('blur', finishEdit, { once: true });
        labelEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                flag.label = originalLabel;
                finishEdit();
            }
        });
    }

    /**
     * Updates a track's visual properties (e.g., lock/visibility).
     * @param {string} effectId - The ID of the effect/track.
     * @param {object} properties - The properties to update (e.g., { isLocked, isVisible }).
     */
    updateEffectProperties(effectId, properties) {
        const track = this.tracks.find(t => t.id === effectId);
        const trackEl = this.container.querySelector(`.timeline-track[data-effect-id="${effectId}"]`);
        
        if (!track || !trackEl) return;

        if (properties.isLocked !== undefined) {
            track.isLocked = properties.isLocked;
            trackEl.classList.toggle('locked', track.isLocked);
        }
        if (properties.isVisible !== undefined) {
            track.isVisible = properties.isVisible;
            trackEl.classList.toggle('hidden', !track.isVisible);
        }
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
        background: repeating-linear-gradient(
            45deg,
            var(--bg-tertiary),
            var(--bg-tertiary) 10px,
            var(--bg-secondary) 10px,
            var(--bg-secondary) 20px
        ) !important;
        cursor: not-allowed;
    }
    .timeline-track.locked .bar-handle {
        display: none;
    }
    .timeline-track.hidden {
        opacity: 0.5;
    }
    .timeline-track.hidden .track-bar {
        opacity: 0.6;
    }
`;
document.head.appendChild(style);
