// Enhanced Curve Editor - Better interaction, interpolation modes
export class CurveEditor {
    constructor() {
        this.container = document.getElementById('curve-editor');
        this.canvas = null;
        this.ctx = null;
        this.curves = [];
        this.selectedPoint = null;
        this.selectedCurve = null;
        this.isDragging = false;
        this.interpolationMode = 'linear';
        this.gridSize = 10;
        this.zoom = 1.0;
    }

    init(app) {
        this.app = app;
        console.log('📈 Initializing Enhanced Curve Editor');
        this.setupCanvas();
    }

    setupCanvas() {
        if (!this.container) return;

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'curve-toolbar';
        toolbar.innerHTML = `
            <div class="curve-tool-group">
                <button class="curve-tool-btn active" data-mode="linear" data-tooltip="Linear Interpolation">━</button>
                <button class="curve-tool-btn" data-mode="bezier" data-tooltip="Bezier (Smooth)">〰️</button>
                <button class="curve-tool-btn" data-mode="step" data-tooltip="Step/Corner">⌊⌋</button>
            </div>
            <div class="curve-tool-group">
                <button class="curve-tool-btn" data-action="addPoint" data-tooltip="Add Point (A)">➕</button>
                <button class="curve-tool-btn" data-action="deletePoint" data-tooltip="Delete Point (Del)">➖</button>
            </div>
            <div class="curve-tool-group">
                <button class="curve-tool-btn" data-action="zoomIn" data-tooltip="Zoom In (+)">🔍+</button>
                <button class="curve-tool-btn" data-action="zoomOut" data-tooltip="Zoom Out (-)">🔍-</button>
                <button class="curve-tool-btn" data-action="fit" data-tooltip="Fit View (F)">⬚</button>
            </div>
            <div class="curve-tool-group">
                <button class="curve-tool-btn" data-action="snap" data-tooltip="Snap to Grid">⊞</button>
            </div>
        `;

        // Interpolation mode buttons
        toolbar.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                toolbar.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.interpolationMode = btn.dataset.mode;
                this.render();
                this.app.showNotification(`Interpolation: ${this.interpolationMode}`, 'info');
            });
        });

        // Action buttons
        toolbar.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleToolAction(btn.dataset.action);
            });
        });

        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'curve-canvas-container';

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'curve-canvas';
        this.ctx = this.canvas.getContext('2d');

        // Create legend
        const legend = this.createLegend();

        canvasContainer.appendChild(this.canvas);
        canvasContainer.appendChild(legend);

        this.container.appendChild(toolbar);
        this.container.appendChild(canvasContainer);

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
        });
        resizeObserver.observe(canvasContainer);

        // Setup mouse events
        this.setupMouseEvents();

        // Setup keyboard events
        this.setupKeyboardEvents();

        // Initial render
        this.resizeCanvas();
    }

    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'curve-legend';
        legend.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Active Curves</div>
            <div class="curve-legend-item" data-curve="size" style="cursor: pointer;">
                <div class="curve-color-indicator" style="background: #ff6b35"></div>
                <span class="curve-name">Size</span>
                <span style="margin-left: auto; font-size: 10px;">👁️</span>
            </div>
            <div class="curve-legend-item" data-curve="opacity" style="cursor: pointer;">
                <div class="curve-color-indicator" style="background: #4ecdc4"></div>
                <span class="curve-name">Opacity</span>
                <span style="margin-left: auto; font-size: 10px;">👁️</span>
            </div>
            <div class="curve-legend-item" data-curve="velocity" style="cursor: pointer;">
                <div class="curve-color-indicator" style="background: #f7b731"></div>
                <span class="curve-name">Velocity</span>
                <span style="margin-left: auto; font-size: 10px;">👁️</span>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); font-size: 10px; color: var(--text-muted);">
                Click curve to toggle visibility
            </div>
        `;

        // Toggle curve visibility
        legend.querySelectorAll('.curve-legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const curveName = item.dataset.curve;
                const curve = this.curves.find(c => c.name.toLowerCase() === curveName);
                if (curve) {
                    curve.visible = !curve.visible;
                    const eye = item.querySelector('span:last-child');
                    eye.textContent = curve.visible ? '👁️' : '🚫';
                    item.style.opacity = curve.visible ? '1' : '0.5';
                    this.render();
                }
            });

            item.setAttribute('data-tooltip', `Click to show/hide curve\nDouble-click to focus`);
        });

        return legend;
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Only handle if curve editor is visible
            if (!this.container.parentElement.classList.contains('active')) return;

            switch (e.key) {
                case 'Delete':
                    if (this.selectedPoint && this.selectedCurve) {
                        this.deletePoint(this.selectedCurve, this.selectedPoint);
                    }
                    break;
                case 'a':
                case 'A':
                    if (this.selectedCurve) {
                        this.addPointToCurve(this.selectedCurve);
                    }
                    break;
                case '+':
                case '=':
                    this.handleToolAction('zoomIn');
                    break;
                case '-':
                case '_':
                    this.handleToolAction('zoomOut');
                    break;
                case 'f':
                case 'F':
                    this.handleToolAction('fit');
                    break;
            }
        });
    }

    handleToolAction(action) {
        switch (action) {
            case 'addPoint':
                if (this.selectedCurve) {
                    this.addPointToCurve(this.selectedCurve);
                } else {
                    this.app.showNotification('Select a curve first', 'warning');
                }
                break;
            case 'deletePoint':
                if (this.selectedPoint && this.selectedCurve) {
                    this.deletePoint(this.selectedCurve, this.selectedPoint);
                } else {
                    this.app.showNotification('Select a point first', 'warning');
                }
                break;
            case 'zoomIn':
                this.zoom = Math.min(4, this.zoom * 1.2);
                this.render();
                this.app.showNotification(`Zoom: ${(this.zoom * 100).toFixed(0)}%`, 'info');
                break;
            case 'zoomOut':
                this.zoom = Math.max(0.25, this.zoom / 1.2);
                this.render();
                this.app.showNotification(`Zoom: ${(this.zoom * 100).toFixed(0)}%`, 'info');
                break;
            case 'fit':
                this.zoom = 1;
                this.render();
                this.app.showNotification('Fit to view', 'info');
                break;
            case 'snap':
                this.app.showNotification('Snap to grid: Coming soon', 'info');
                break;
        }
    }

    addPointToCurve(curve) {
        // Add point at 0.5, 0.5
        const newPoint = { x: 0.5, y: 0.5 };
        curve.points.push(newPoint);
        
        // Sort points by x
        curve.points.sort((a, b) => a.x - b.x);
        
        this.selectedPoint = newPoint;
        this.render();
        this.app.showNotification(`Added point to ${curve.name}`, 'success');
    }

    deletePoint(curve, point) {
        const index = curve.points.indexOf(point);
        if (index > -1 && curve.points.length > 2) {
            curve.points.splice(index, 1);
            this.selectedPoint = null;
            this.render();
            this.app.showNotification(`Deleted point from ${curve.name}`, 'success');
        } else {
            this.app.showNotification('Cannot delete - curve needs at least 2 points', 'warning');
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);

        this.render();
    }

    setupMouseEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if clicking on a point
            const { point, curve } = this.findPointAt(x, y);
            if (point) {
                this.selectedPoint = point;
                this.selectedCurve = curve;
                this.isDragging = true;
                this.render();
            } else {
                // Clicked on canvas - add point to selected curve
                if (e.shiftKey && this.selectedCurve) {
                    const width = this.canvas.width / (window.devicePixelRatio || 1);
                    const height = this.canvas.height / (window.devicePixelRatio || 1);
                    const newPoint = {
                        x: Math.max(0, Math.min(1, x / width)),
                        y: Math.max(0, Math.min(1, 1 - (y / height)))
                    };
                    this.selectedCurve.points.push(newPoint);
                    this.selectedCurve.points.sort((a, b) => a.x - b.x);
                    this.selectedPoint = newPoint;
                    this.render();
                    this.app.showNotification(`Added point to ${this.selectedCurve.name}`, 'success');
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !this.selectedPoint) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.updatePointPosition(this.selectedPoint, x, y);
            this.render();

            // Dispatch curve changed event
            if (this.selectedCurve) {
                document.dispatchEvent(new CustomEvent('curveChanged', {
                    detail: {
                        curve: this.selectedCurve.name,
                        points: this.selectedCurve.points
                    }
                }));
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Double-click to add point
        this.canvas.addEventListener('dblclick', (e) => {
            if (!this.selectedCurve) {
                this.app.showNotification('Select a curve from the legend first', 'info');
                return;
            }

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            const newPoint = {
                x: Math.max(0, Math.min(1, x / width)),
                y: Math.max(0, Math.min(1, 1 - (y / height)))
            };

            this.selectedCurve.points.push(newPoint);
            this.selectedCurve.points.sort((a, b) => a.x - b.x);
            this.selectedPoint = newPoint;
            this.render();
            this.app.showNotification(`Added point to ${this.selectedCurve.name}`, 'success');
        });
    }

    loadEffectCurves(effectData) {
        // Load sample curves
        this.curves = [
            {
                name: 'Size',
                color: '#ff6b35',
                visible: true,
                points: [
                    { x: 0, y: 0.2 },
                    { x: 0.3, y: 0.8 },
                    { x: 0.7, y: 0.9 },
                    { x: 1, y: 0.3 }
                ]
            },
            {
                name: 'Opacity',
                color: '#4ecdc4',
                visible: true,
                points: [
                    { x: 0, y: 0 },
                    { x: 0.2, y: 1 },
                    { x: 0.8, y: 1 },
                    { x: 1, y: 0 }
                ]
            },
            {
                name: 'Velocity',
                color: '#f7b731',
                visible: true,
                points: [
                    { x: 0, y: 1 },
                    { x: 0.4, y: 0.6 },
                    { x: 0.8, y: 0.4 },
                    { x: 1, y: 0.2 }
                ]
            }
        ];

        this.render();
    }

    render() {
        if (!this.ctx || !this.canvas) return;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        this.ctx.fillStyle = '#25252a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid(width, height);

        // Draw curves
        this.curves.forEach(curve => {
            if (curve.visible !== false) {
                this.drawCurve(curve, width, height);
            }
        });

        // Draw points
        this.curves.forEach(curve => {
            if (curve.visible !== false) {
                this.drawPoints(curve, width, height);
            }
        });

        // Draw value at cursor if dragging
        if (this.isDragging && this.selectedPoint) {
            this.drawPointValue(this.selectedPoint, width, height);
        }
    }

    drawGrid(width, height) {
        // Background grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridLines = this.gridSize * this.zoom;

        for (let i = 0; i <= gridLines; i++) {
            const x = (width / gridLines) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();

            const y = (height / gridLines) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Center lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(width / 2, 0);
        this.ctx.lineTo(width / 2, height);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();

        // Axis labels
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.font = '10px monospace';
        this.ctx.fillText('0', 5, height - 5);
        this.ctx.fillText('1', width - 15, height - 5);
        this.ctx.fillText('1', 5, 15);
        this.ctx.fillText('0', 5, height - 5);
    }

    drawCurve(curve, width, height) {
        if (curve.points.length < 2) return;

        this.ctx.strokeStyle = curve.color;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = curve.color;
        this.ctx.shadowBlur = 5;
        this.ctx.beginPath();

        if (this.interpolationMode === 'linear') {
            this.drawLinearCurve(curve, width, height);
        } else if (this.interpolationMode === 'bezier') {
            this.drawBezierCurve(curve, width, height);
        } else if (this.interpolationMode === 'step') {
            this.drawStepCurve(curve, width, height);
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    drawLinearCurve(curve, width, height) {
        curve.points.forEach((point, i) => {
            const x = point.x * width;
            const y = (1 - point.y) * height;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
    }

    drawBezierCurve(curve, width, height) {
        const points = curve.points;
        
        this.ctx.moveTo(points[0].x * width, (1 - points[0].y) * height);

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];

            const cp1x = (p0.x + (p1.x - p0.x) / 3) * width;
            const cp1y = (1 - p0.y) * height;
            const cp2x = (p0.x + (p1.x - p0.x) * 2 / 3) * width;
            const cp2y = (1 - p1.y) * height;
            const p1x = p1.x * width;
            const p1y = (1 - p1.y) * height;

            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1x, p1y);
        }
    }

    drawStepCurve(curve, width, height) {
        curve.points.forEach((point, i) => {
            const x = point.x * width;
            const y = (1 - point.y) * height;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                const prevY = (1 - curve.points[i - 1].y) * height;
                this.ctx.lineTo(x, prevY);
                this.ctx.lineTo(x, y);
            }
        });
    }

    drawPoints(curve, width, height) {
        curve.points.forEach(point => {
            const x = point.x * width;
            const y = (1 - point.y) * height;

            const isSelected = this.selectedPoint === point && this.selectedCurve === curve;

            // Outer circle
            this.ctx.fillStyle = '#1e1e24';
            this.ctx.strokeStyle = curve.color;
            this.ctx.lineWidth = isSelected ? 3 : 2;

            this.ctx.beginPath();
            this.ctx.arc(x, y, isSelected ? 7 : 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Inner dot when selected
            if (isSelected) {
                this.ctx.fillStyle = curve.color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawPointValue(point, width, height) {
        const x = point.x * width;
        const y = (1 - point.y) * height;

        // Draw value box
        const text = `X: ${point.x.toFixed(3)}, Y: ${point.y.toFixed(3)}`;
        this.ctx.font = '11px monospace';
        const textWidth = this.ctx.measureText(text).width;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(x + 10, y - 20, textWidth + 12, 20);

        this.ctx.fillStyle = 'white';
        this.ctx.fillText(text, x + 16, y - 6);
    }

    findPointAt(x, y) {
        if (!this.canvas) return { point: null, curve: null };

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const threshold = 12;

        for (const curve of this.curves) {
            if (curve.visible === false) continue;

            for (const point of curve.points) {
                const px = point.x * width;
                const py = (1 - point.y) * height;

                const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
                if (distance < threshold) {
                    return { point, curve };
                }
            }
        }

        return { point: null, curve: null };
    }

    updatePointPosition(point, x, y) {
        if (!this.canvas) return;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        point.x = Math.max(0, Math.min(1, x / width));
        point.y = Math.max(0, Math.min(1, 1 - (y / height)));
    }

    updateCurve(paramData) {
        console.log('Updating curve from parameter:', paramData);
    }

    captureState() {
        return {
            curves: JSON.parse(JSON.stringify(this.curves)),
            interpolationMode: this.interpolationMode,
            zoom: this.zoom
        };
    }

    restoreState(state) {
        this.curves = state.curves || this.curves;
        this.interpolationMode = state.interpolationMode || 'linear';
        this.zoom = state.zoom || 1;
        
        // Update toolbar buttons
        const toolbar = this.container.querySelector('.curve-toolbar');
        if (toolbar) {
            toolbar.querySelectorAll('[data-mode]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === this.interpolationMode);
            });
        }

        this.render();
    }
}
