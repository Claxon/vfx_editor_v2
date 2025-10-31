// Timeline Manager - Handles timeline visualization and track editing
export class TimelineManager {
    constructor() {
        this.container = document.getElementById('timeline-container');
        this.duration = 5; // seconds
        this.tracks = [];
        this.flags = [];
        this.zoom = 1;
    }

    init() {
        console.log('⏱️ Initializing Timeline Manager');
    }

    loadEffect(effectData) {
        // Sample timeline data
        this.tracks = [
            { name: 'Main Emitter', start: 0, duration: 3.5, color: '#ff6b35' },
            { name: 'Burst Emitter', start: 1.0, duration: 0.5, color: '#4ecdc4' },
            { name: 'Trail Particles', start: 0.5, duration: 4.0, color: '#f7b731' },
            { name: 'Glow Effect', start: 0, duration: 5.0, color: '#a855f7' }
        ];

        this.flags = [
            { time: 1.0, label: 'Burst', color: '#4ecdc4' },
            { time: 3.5, label: 'Fade', color: '#ff6b35' }
        ];

        this.render();
    }

    render() {
        if (!this.container) return;

        const content = document.createElement('div');
        content.className = 'timeline-content';

        // Create header with controls
        const header = document.createElement('div');
        header.className = 'timeline-header';
        header.innerHTML = `
            <span>Track Name</span>
            <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
                <button class="timeline-control-btn" title="Add Flag Point">🚩</button>
                <button class="timeline-control-btn" title="Zoom In">🔍+</button>
                <button class="timeline-control-btn" title="Zoom Out">🔍-</button>
                <span style="margin-left: 8px;">Duration: ${this.duration}s</span>
            </div>
        `;

        // Setup zoom controls
        const zoomInBtn = header.querySelectorAll('.timeline-control-btn')[1];
        const zoomOutBtn = header.querySelectorAll('.timeline-control-btn')[2];
        
        zoomInBtn?.addEventListener('click', () => {
            this.zoom = Math.min(3, this.zoom * 1.2);
            this.render();
        });

        zoomOutBtn?.addEventListener('click', () => {
            this.zoom = Math.max(0.5, this.zoom / 1.2);
            this.render();
        });

        // Setup add flag
        const addFlagBtn = header.querySelector('.timeline-control-btn');
        addFlagBtn?.addEventListener('click', () => {
            this.addFlag(2.5); // Add at middle
        });

        // Create ruler
        const ruler = this.createRuler();

        // Create tracks
        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'timeline-tracks';

        this.tracks.forEach(track => {
            tracksContainer.appendChild(this.createTrack(track));
        });

        content.appendChild(header);
        content.appendChild(ruler);
        content.appendChild(tracksContainer);

        this.container.innerHTML = '';
        this.container.appendChild(content);

        // Render flags after tracks
        this.renderFlags();
    }

    createRuler() {
        const ruler = document.createElement('div');
        ruler.className = 'timeline-ruler';
        ruler.style.width = `${100 * this.zoom}%`;

        const steps = Math.ceil(this.duration * this.zoom);
        const step = this.duration / steps;

        // Add time markers
        for (let i = 0; i <= steps; i++) {
            const time = i * step;
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

        // Make ruler clickable to add flags
        ruler.addEventListener('dblclick', (e) => {
            const rect = ruler.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = (x / rect.width) * this.duration;
            this.addFlag(time);
        });

        return ruler;
    }

    createTrack(track) {
        const trackEl = document.createElement('div');
        trackEl.className = 'timeline-track';
        trackEl.style.width = `${100 * this.zoom}%`;

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
            // Don't drag if clicking on handles
            if (e.target.classList.contains('bar-handle')) return;

            e.stopPropagation();
            const startX = e.clientX;
            const startLeft = parseFloat(bar.style.left);
            const barWidth = parseFloat(bar.style.width);

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const trackWidth = trackEl.offsetWidth;
                const deltaPercent = (deltaX / trackWidth) * 100;
                const newLeft = Math.max(0, Math.min(100 - barWidth, startLeft + deltaPercent));
                
                bar.style.left = `${newLeft}%`;
                track.start = (newLeft / 100) * this.duration;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s @ ${track.start.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    setupHandleDrag(bar, track, trackEl) {
        const startHandle = bar.querySelector('.bar-handle-start');
        const endHandle = bar.querySelector('.bar-handle-end');
        const barLabel = bar.querySelector('.bar-label');

        // Start handle - adjust start time and duration
        startHandle?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const originalStart = parseFloat(bar.style.left);
            const originalWidth = parseFloat(bar.style.width);

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const trackWidth = trackEl.offsetWidth;
                const deltaPercent = (deltaX / trackWidth) * 100;
                
                const newStart = Math.max(0, Math.min(originalStart + originalWidth - 5, originalStart + deltaPercent));
                const newWidth = originalStart + originalWidth - newStart;
                
                bar.style.left = `${newStart}%`;
                bar.style.width = `${newWidth}%`;
                
                track.start = (newStart / 100) * this.duration;
                track.duration = (newWidth / 100) * this.duration;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // End handle - adjust duration only
        endHandle?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const originalWidth = parseFloat(bar.style.width);
            const startPos = parseFloat(bar.style.left);

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                const trackWidth = trackEl.offsetWidth;
                const deltaPercent = (deltaX / trackWidth) * 100;
                
                const newWidth = Math.max(5, Math.min(100 - startPos, originalWidth + deltaPercent));
                
                bar.style.width = `${newWidth}%`;
                track.duration = (newWidth / 100) * this.duration;
                
                barLabel.textContent = `${track.duration.toFixed(1)}s`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
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
        this.renderFlags();
        console.log('Added flag at', time);
    }

    renderFlags() {
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
            flagLabel.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.editFlagLabel(flag, flagLabel);
            });

            // Right-click to delete
            flagEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.flags.splice(index, 1);
                this.renderFlags();
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
`;
document.head.appendChild(style);
