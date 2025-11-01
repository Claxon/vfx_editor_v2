// Enhanced Particle Renderer - Fully reactive to parameters, curves, and timeline
// ***** UPDATED to simulate *multiple* effects from a hierarchy *****

// --- Helper class for managing a single effect's simulation state ---
class EffectInstance {
    constructor(effectData, defaultCurves) {
        this.id = effectData.name;
        this.effectData = effectData;
        this.particles = [];
        this.particleCount = 0;
        this.spawnAccumulator = 0;
        
        // Combine defaults, default curves, and effect-specific data
        this.effectParams = { ...ParticleRenderer.DEFAULT_PARAMS, ...effectData.params };
        this.curves = { ...defaultCurves, ...effectData.curves };
        
        // Handle color conversion
        if (typeof this.effectParams.cColor === 'string') {
            this.setColorFromHex(this.effectParams.cColor);
        }

        // Timeline properties
        this.startTime = effectData.timeline?.start || 0;
        this.duration = effectData.timeline?.duration || 5.0;
        this.endTime = this.startTime + this.duration;
        
        // State properties
        this.isVisible = effectData.isVisible !== false; // Default to true
        this.isEmitting = false;
        this.localTime = 0; // Time since this effect started (0 to duration)

        // --- NEW: Canvas dimensions, will be set by main renderer ---
        this.canvasWidth = 300;
        this.canvasHeight = 200;
    }

    setColorFromHex(hex) {
        if (typeof hex !== 'string' || !hex.startsWith('#')) {
             if (typeof hex === 'object' && hex.r !== undefined) {
                 this.effectParams['cColor'] = { ...hex, a: 1 };
             }
             return;
        }
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            this.effectParams['cColor'] = {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
                a: 1
            };
        }
    }

    /**
     * Updates the simulation for this effect instance.
     * @param {number} globalTime - The main timeline's current time.
     * @param {number} deltaTime - The delta time since the last frame.
     * @param {number} canvasWidth - Current width of the canvas.
     * @param {number} canvasHeight - Current height of the canvas.
     */
    update(globalTime, deltaTime, canvasWidth, canvasHeight) {
        // --- NEW: Update canvas dimensions ---
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        if (!this.isVisible) {
            this.isEmitting = false;
            // Clear particles if visibility was toggled off
            if (this.particles.length > 0) {
                this.particles = [];
                this.particleCount = 0;
            }
            return;
        }

        // Check if the effect is active on the global timeline
        const isActive = (globalTime >= this.startTime && globalTime < this.endTime);
        this.isEmitting = isActive;
        this.localTime = globalTime - this.startTime;

        // Spawn new particles
        const spawnRate = this.effectParams['fCount'] || 0;
        if (this.isEmitting && this.particleCount < 1000) { // Hard cap
            this.spawnAccumulator += deltaTime * spawnRate;
            while (this.spawnAccumulator >= 1) {
                this.createParticle();
                this.spawnAccumulator -= 1;
            }
        }

        // Get physics values once
        const gravity = (this.effectParams['fGravityScale'] || 0) * 9.8;
        const drag = this.effectParams['fDrag'] || this.effectParams['fAirResistance'] || 0;
        const turbulence = this.effectParams['fTurbulence'] || 0;
        const useCollisions = this.effectParams['bZBufferCollision'] || this.effectParams['bCollideStaticObjects'] || this.effectParams['bCollideTerrainOnly'] || false;
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.age += deltaTime;
            const lifeRatio = p.age / p.lifetime;
            
            if (lifeRatio >= 1) {
                this.particles.splice(i, 1);
                this.particleCount--;
                continue;
            }
            
            // Apply curves
            p.size = this.effectParams['fSize'] * this.evaluateCurve(this.curves.size, lifeRatio);
            p.opacity = this.effectParams['fAlpha'] * this.evaluateCurve(this.curves.opacity, lifeRatio);
            const velocityMult = this.evaluateCurve(this.curves.velocity, lifeRatio);

            // Apply physics
            p.vy += gravity * deltaTime * 10;
            p.vx *= (1 - drag * deltaTime);
            p.vy *= (1 - drag * deltaTime);
            
            // Apply velocity curve
            p.vx *= (0.98 + velocityMult * 0.02);
            p.vy *= (0.98 + velocityMult * 0.02);

            if (turbulence > 0) {
                p.vx += (Math.random() - 0.5) * turbulence * deltaTime * 50;
                p.vy += (Math.random() - 0.5) * turbulence * deltaTime * 50;
            }
            
            p.x += p.vx * deltaTime * 10;
            p.y += p.vy * deltaTime * 10;
            p.rotation += p.rotationSpeed;
            
            // Collisions
            if (useCollisions) {
                // --- FIX: Use dynamic canvas dimensions ---
                if (p.y > this.canvasHeight - 10) { 
                    p.y = this.canvasHeight - 10;
                    p.vy *= -0.5;
                    p.vx *= 0.8;
                }
                if (p.x < 10 || p.x > this.canvasWidth - 10) {
                    p.vx *= -0.5;
                    p.x = Math.max(10, Math.min(this.canvasWidth - 10, p.x));
                }
            }
        }
    }

    createParticle() {
        const speed = this.effectParams['fSpeed'] || 0;
        const turbulence = this.effectParams['fTurbulence'] || 0;
        const color = this.effectParams['cColor'] || { r: 255, g: 255, b: 255, a: 1 };

        const particle = {
             // --- FIX: Use dynamic canvas dimensions ---
            x: this.canvasWidth / 2 + (Math.random() - 0.5) * 20,
            y: this.canvasHeight / 2 + (Math.random() - 0.5) * 20,
            z: 0,
            vx: (this.effectParams['vVelocity']?.x || 0) + (Math.random() - 0.5) * 2,
            vy: -(speed) - Math.random() * 2,
            vz: (this.effectParams['vVelocity']?.z || 0),
            lifetime: this.effectParams['fParticleLifeTime'] * (0.8 + Math.random() * 0.4),
            age: 0,
            size: this.effectParams['fSize'],
            opacity: this.effectParams['fAlpha'],
            color: { ...color },
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        };
        
        if (turbulence > 0) {
            particle.vx += (Math.random() - 0.5) * turbulence * 10;
            particle.vy += (Math.random() - 0.5) * turbulence * 10;
        }
        
        this.particles.push(particle);
        this.particleCount++;
    }

    evaluateCurve(curve, t) {
        if (!curve || curve.length < 2) return 1;
        t = Math.max(0, Math.min(1, t));
        
        let p1 = curve[0];
        let p2 = curve[curve.length - 1];
        
        for (let i = 0; i < curve.length - 1; i++) {
            if (t >= curve[i].x && t <= curve[i + 1].x) {
                p1 = curve[i];
                p2 = curve[i + 1];
                break;
            }
        }
        
        if (p2.x === p1.x) return p1.y;
        const ratio = (t - p1.x) / (p2.x - p1.x);
        return p1.y + (p2.y - p1.y) * ratio;
    }
}

export class ParticleRenderer {
    
    // Static defaults
    static DEFAULT_PARAMS = {
        'fCount': 150, 'fParticleLifeTime': 2.5,
        'cColor': { r: 255, g: 107, b: 53, a: 1 },
        'fSize': 1.0, 'fAlpha': 0.85, 'eBlendType': 'Additive',
        'fSpeed': 5.0, 'fGravityScale': 0.0, 'fAirResistance': 0.1, 'fDrag': 0.1, 'fTurbulence': 0.3,
        'bZBufferCollision': true, 'bCollideStaticObjects': true, 'bCollideTerrainOnly': true,
        'bCastShadows': false, 'vVelocity': { x: 0, y: 0, z: 5 }, 'fBurstCount': 0
    };

    static USED_PARAMS = [
        'fCount', 'fParticleLifeTime', 'eBlendType', 'cColor', 'fAlpha', 'fSize',
        'fSpeed', 'fGravityScale', 'fAirResistance', 'fDrag', 'fTurbulence',
        'bZBufferCollision', 'bCollideStaticObjects', 'bCollideTerrainOnly'
    ];

    // Default curve shapes
    static DEFAULT_CURVES = {
        size: [ { x: 0, y: 0.2 }, { x: 0.3, y: 0.8 }, { x: 0.7, y: 0.9 }, { x: 1, y: 0.3 } ],
        opacity: [ { x: 0, y: 0 }, { x: 0.2, y: 1 }, { x: 0.8, y: 1 }, { x: 1, y: 0 } ],
        velocity: [ { x: 0, y: 1 }, { x: 0.4, y: 0.6 }, { x: 0.8, y: 0.4 }, { x: 1, y: 0.2 } ],
        color: null
    };

    constructor() {
        this.container = document.getElementById('particle-preview');
        this.canvas = null;
        this.ctx = null;
        this.effectInstances = new Map(); // Stores EffectInstance objects
        
        this.animationId = null;
        this.deltaTime = 0;
        this.lastTime = 0;

        // --- NEW: Store canvas dimensions ---
        this.canvasWidth = 300;
        this.canvasHeight = 200;

        // Global timeline state
        this.timelineData = {
            duration: 5.0, // Total duration
            currentTime: 0,
            playing: true
        };
    }

    init() {
        console.log('✨ Initializing Enhanced Particle Renderer (Multi-Effect)');
        this.setupCanvas();
        this.startAnimation();
    }
    
    setupCanvas() {
        if (!this.container) return;
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.addControlsOverlay();
    }
    
    resizeCanvas() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        // --- NEW: Update stored dimensions ---
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;
    }
    
    addControlsOverlay() {
        const controls = document.createElement('div');
        controls.className = 'particle-controls-overlay';
        controls.innerHTML = `
            <button class="particle-control-btn" id="play-pause" title="Play/Pause">⏸️</button>
            <button class="particle-control-btn" id="reset" title="Reset">🔄</button>
            <div style="color: white; font-size: 12px; display: flex; align-items: center; margin-left: 8px;">
                <span>T: <span id="timeline-time">0.00</span>s</span>
                <span style="margin-left: 12px;">P: <span id="particle-count">0</span></span>
            </div>
        `;
        
        this.container.appendChild(controls);
        
        controls.querySelector('#play-pause')?.addEventListener('click', () => this.togglePlayPause());
        controls.querySelector('#reset')?.addEventListener('click', () => this.reset());
    }

    /**
     * Loads an entire effect hierarchy.
     * @param {object} rootEffect - The root effect node.
     */
    loadEffectHierarchy(rootEffect) {
        console.log('Loading effect hierarchy for rendering:', rootEffect.name);
        this.effectInstances.clear();

        // Recursively create instances for the root and all children
        const createInstancesRecursive = (effect) => {
            if (effect.type !== 'effect') return;
            
            console.log(`  Creating instance for: ${effect.name}`);
            const instance = new EffectInstance(effect, ParticleRenderer.DEFAULT_CURVES);
            this.effectInstances.set(effect.name, instance);

            if (effect.items) {
                effect.items.forEach(createInstancesRecursive);
            }
        };

        createInstancesRecursive(rootEffect);
        this.reset();
    }
    
    /**
     * Updates a single parameter for a specific effect instance.
     * @param {string} effectId - The name/ID of the effect.
     * @param {string} paramName - The internal name of the parameter.
     * @param {*} value - The new value.
     */
    updateEffectParameter(effectId, paramName, value) {
        const instance = this.effectInstances.get(effectId);
        if (instance) {
            instance.effectParams[paramName] = value;
            
            // Handle special cases
            if (paramName === 'cColor') {
                instance.setColorFromHex(value);
            } else if (paramName === 'eBlendType') {
                instance.effectParams['eBlendType'] = value.toLowerCase();
            }
        }
    }
    
    /**
     * Updates a curve for a specific effect instance.
     * @param {string} effectId - The name/ID of the effect.
     * @param {string} curveName - The name of the curve (e.g., 'size').
     * @param {Array} points - The new curve points.
     */
    updateEffectCurve(effectId, curveName, points) {
        const instance = this.effectInstances.get(effectId);
        if (instance) {
            instance.curves[curveName] = points;
        }
    }
    
    /**
     * Updates the timeline properties for a specific effect instance.
     * @param {string} effectId - The name/ID of the effect.
     * @param {number} start - The new start time.
     * @param {number} duration - The new duration.
     */
    updateEffectTimeline(effectId, start, duration) {
        const instance = this.effectInstances.get(effectId);
        if (instance) {
            instance.startTime = start;
            instance.duration = duration;
            instance.endTime = start + duration;
        }
    }

    /**
     * Toggles the visibility of a specific effect instance.
     * @param {string} effectId - The name/ID of the effect.
     * @param {boolean} isVisible - The new visibility state.
     */
    updateEffectVisibility(effectId, isVisible) {
        const instance = this.effectInstances.get(effectId);
        if (instance) {
            instance.isVisible = isVisible;
        }
    }

    // --- Main Animation Loop ---

    startAnimation() {
        this.lastTime = performance.now() / 1000;
        
        const animate = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    update() {
        const currentTime = performance.now() / 1000;
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update global timeline
        if (this.timelineData.playing) {
            this.timelineData.currentTime = (this.timelineData.currentTime + this.deltaTime) % this.timelineData.duration;
        }
        
        // Update timeline display
        document.getElementById('timeline-time').textContent = this.timelineData.currentTime.toFixed(2);
        
        let totalParticles = 0;

        // Update all effect instances
        for (const instance of this.effectInstances.values()) {
            // --- FIX: Pass canvas dimensions to instance update ---
            instance.update(this.timelineData.currentTime, this.deltaTime, this.canvasWidth, this.canvasHeight);
            totalParticles += instance.particleCount;
        }
        
        // Update particle count display
        document.getElementById('particle-count').textContent = totalParticles;
    }
    
    render() {
        if (!this.ctx || !this.canvas) return;
        
        // Clear canvas
        this.ctx.fillStyle = 'rgba(37, 37, 42, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render particles from all instances
        for (const instance of this.effectInstances.values()) {
            if (!instance.isVisible || instance.particles.length === 0) continue;

            const blendMode = instance.effectParams['eBlendType'] || 'Additive';
            if (blendMode.toLowerCase() === 'additive') this.ctx.globalCompositeOperation = 'screen';
            else if (blendMode.toLowerCase() === 'multiplicative') this.ctx.globalCompositeOperation = 'multiply';
            else if (blendMode.toLowerCase() === 'screen') this.ctx.globalCompositeOperation = 'screen';
            else if (blendMode.toLowerCase() === 'overlay') this.ctx.globalCompositeOperation = 'overlay';
            else this.ctx.globalCompositeOperation = 'source-over';
            
            // Sort particles by Z? (Skipping for 2D sim)
            
            instance.particles.forEach(p => {
                this.ctx.save();
                
                const screenSize = p.size * 4;
                this.ctx.globalAlpha = p.opacity;
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rotation);
                
                const r = p.color.r || 255, g = p.color.g || 255, b = p.color.b || 255;
                
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, screenSize);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
                gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.8)`);
                gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(-screenSize, -screenSize, screenSize * 2, screenSize * 2);
                
                if (p.opacity > 0.5) {
                    this.ctx.shadowBlur = screenSize * 2;
                    this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
                    this.ctx.fillRect(-screenSize * 0.5, -screenSize * 0.5, screenSize, screenSize);
                }
                
                this.ctx.restore();
            });
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.renderDebugInfo();
    }
    
    renderDebugInfo() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 20, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    // --- Controls ---

    togglePlayPause() {
        const btn = document.getElementById('play-pause');
        this.timelineData.playing = !this.timelineData.playing;
        if (btn) btn.textContent = this.timelineData.playing ? '⏸️' : '▶️';
    }
    
    reset() {
        this.timelineData.currentTime = 0;
        for (const instance of this.effectInstances.values()) {
            instance.particles = [];
            instance.particleCount = 0;
            instance.spawnAccumulator = 0;
        }
        console.log('🔄 Particle system reset');
    }

    // --- Data Export (Unused by App) ---
    exportState() {
        const state = {
            globalTime: this.timelineData.currentTime,
            instances: {}
        };
        for (const [id, instance] of this.effectInstances.entries()) {
            state.instances[id] = {
                params: instance.effectParams,
                curves: instance.curves,
                timeline: { start: instance.startTime, duration: instance.duration },
                particleCount: instance.particleCount
            };
        }
        return state;
    }
}

