// Enhanced Particle Renderer - Fully reactive to parameters, curves, and timeline
// ***** UPDATED to accept more physics parameters *****
// ***** UPDATED to use internal parameter names (e.g., fParticleLifeTime) *****
export class ParticleRenderer {
    
    // --- ADDED: Static defaults object ---
    // This provides a single source of truth for default parameters
    static DEFAULT_PARAMS = {
        // Spawn
        'fCount': 150,
        'fParticleLifeTime': 2.5,
        
        // Appearance
        'cColor': { r: 255, g: 107, b: 53, a: 1 }, // Note: cColor is custom
        'fSize': 1.0, // Base size
        'fAlpha': 0.85,
        'eBlendType': 'Additive',
        
        // Movement
        'fSpeed': 5.0, // Scalar speed
        'fGravityScale': 0.0,
        'fAirResistance': 0.1, // Mapped to drag
        'fDrag': 0.1,
        'fTurbulence': 0.3,
        
        // Collision
        'bZBufferCollision': true,
        'bCollideStaticObjects': true,
        'bCollideTerrainOnly': true,
        
        // Unused by this sim (will get ⚠️ icon)
        'bCastShadows': false,
        'vVelocity': { x: 0, y: 0, z: 5 },
        'fBurstCount': 25 // Example of an unused param
    };
    // --- END ADDITION ---


    // --- ADDED: List of parameters this 2D sim ACTUALLY uses ---
    // This is checked by parameterManager to show ⚠️ on unused ones
    static USED_PARAMS = [
        'fCount', 'fParticleLifeTime', // Spawn
        'eBlendType', 'cColor', 'fAlpha', 'fSize', // Appearance
        'fSpeed', 'fGravityScale', 'fAirResistance', 'fDrag', 'fTurbulence', // Movement
        'bZBufferCollision', 'bCollideStaticObjects', 'bCollideTerrainOnly' // Collision
    ];
    // --- END ADDITION ---

    constructor() {
        this.container = document.getElementById('particle-preview');
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.time = 0;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.currentEffect = null;
        
        // Effect parameters - now fully reactive
        // *** UPDATED: Now uses internal CryEngine names ***
        // *** FIX: Initialize from the static default object ***
        this.effectParams = { ...ParticleRenderer.DEFAULT_PARAMS };
        
        // Curves for animated parameters - fully integrated
        this.curves = {
            size: [
                { x: 0, y: 0.2 },
                { x: 0.3, y: 0.8 },
                { x: 0.7, y: 0.9 },
                { x: 1, y: 0.3 }
            ],
            opacity: [
                { x: 0, y: 0 },
                { x: 0.2, y: 1 },
                { x: 0.8, y: 1 },
                { x: 1, y: 0 }
            ],
            velocity: [
                { x: 0, y: 1 },
                { x: 0.4, y: 0.6 },
                { x: 0.8, y: 0.4 },
                { x: 1, y: 0.2 }
            ],
            color: null
        };
        
        // Timeline data - now actively affects emission
        this.timelineData = {
            duration: 5,
            tracks: [],
            flags: [],
            currentTime: 0,
            playing: true
        };
        
        // Emitter state
        this.emitterActive = true;
        this.particleCount = 0;
        this.maxParticles = 1000;
        this.spawnAccumulator = 0;
        this.burstTimer = 0;
    }

    init() {
        console.log('✨ Initializing Enhanced Particle Renderer');
        this.setupCanvas();
        this.startAnimation();
    }
    
    setupCanvas() {
        if (!this.container) return;
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Handle resize
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Add controls overlay
        this.addControlsOverlay();
    }
    
    resizeCanvas() {
        if (!this.canvas || !this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    addControlsOverlay() {
        const controls = document.createElement('div');
        controls.className = 'particle-controls-overlay';
        controls.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 100;
            display: flex;
            gap: 8px;
            background: rgba(0, 0, 0, 0.6);
            padding: 8px;
            border-radius: 4px;
        `;
        
        controls.innerHTML = `
            <button class="particle-control-btn" id="play-pause" title="Play/Pause">⏸️</button>
            <button class="particle-control-btn" id="reset" title="Reset">🔄</button>
            <button class="particle-control-btn" id="toggle-emitter" title="Toggle Emitter">🔥</button>
            <button class="particle-control-btn" id="clear-particles" title="Clear All">🧹</button>
            <div style="color: white; font-size: 12px; display: flex; align-items: center; margin-left: 8px;">
                <span>T: <span id="timeline-time">0.00</span>s</span>
                <span style="margin-left: 12px;">P: <span id="particle-count">0</span></span>
            </div>
        `;
        
        this.container.appendChild(controls);
        
        // Setup control handlers
        controls.querySelector('#play-pause')?.addEventListener('click', () => this.togglePlayPause());
        controls.querySelector('#reset')?.addEventListener('click', () => this.reset());
        controls.querySelector('#toggle-emitter')?.addEventListener('click', () => this.toggleEmitter());
        controls.querySelector('#clear-particles')?.addEventListener('click', () => this.clearAllParticles());
    }

    loadEffect(effectData) {
        console.log('Loading effect for rendering:', effectData.name);
        this.currentEffect = effectData;
        
        // Reset params to default before loading
        // *** FIX: Reset from the static DEFAULT_PARAMS object ***
        this.effectParams = { ...ParticleRenderer.DEFAULT_PARAMS };

        // Load effect parameters if available
        if (effectData.params) {
            // Merge loaded params into defaults
            Object.assign(this.effectParams, effectData.params);
        }
        
        // Load curves if available
        if (effectData.curves) {
            Object.assign(this.curves, effectData.curves);
        }
        
        // Load timeline if available
        if (effectData.timeline) {
            Object.assign(this.timelineData, effectData.timeline);
        }
        
        // *** FIX: Handle legacy color or saved color object ***
        if (typeof this.effectParams.cColor === 'string') {
            this.setColorFromHex(this.effectParams.cColor);
        }
        
        this.reset();
    }
    
    updateParameter(data) {
        // *** UPDATED: This function now receives the internal name (data.name) ***
        console.log('🎛️ Updating particle renderer with parameter:', data.name, '=', data.value);
        
        // Dynamically update any parameter in effectParams
        // This makes it fully reactive.
        this.effectParams[data.name] = data.value;

        // Use the map for specific logic (like color conversion)
        if (data.name === 'cColor') {
            this.setColorFromHex(data.value);
            console.log('  → Color now:', this.effectParams['cColor']);
        } else if (data.name === 'eBlendType') {
             this.effectParams['eBlendType'] = data.value.toLowerCase();
             console.log('  → Blend mode now:', this.effectParams['eBlendType']);
        } else {
            console.log(`  → Generic update for "${data.name}"`);
        }
        
        // Store in current effect
        if (this.currentEffect) {
            if (!this.currentEffect.params) {
                this.currentEffect.params = {};
            }
            this.currentEffect.params[data.name] = data.value;
        }
    }
    
    updateFromCurve(data) {
        console.log('📈 Updating particle renderer from curve:', data.curve);
        
        // Store curve data for runtime evaluation
        const curveName = data.curve.toLowerCase();
        if (this.curves.hasOwnProperty(curveName)) {
            this.curves[curveName] = data.points;
            console.log(`  → ${data.curve} curve updated with ${data.points.length} points`);
            
            // Store in current effect
            if (this.currentEffect) {
                if (!this.currentEffect.curves) {
                    this.currentEffect.curves = {};
                }
                this.currentEffect.curves[curveName] = data.points;
            }
        }
    }
    
    updateFromTimeline(data) {
        console.log('⏱️ Updating particle renderer from timeline:', data);
        this.timelineData = {
            ...this.timelineData,
            ...data
        };
        
        // Store in current effect
        if (this.currentEffect) {
            this.currentEffect.timeline = this.timelineData;
        }
        
        console.log('  → Timeline duration:', this.timelineData.duration, 'seconds');
        console.log('  → Active tracks:', this.timelineData.tracks?.length || 0);
    }
    
    setColorFromHex(hex) {
        if (typeof hex !== 'string' || !hex.startsWith('#')) {
             console.warn('Invalid color format for hex:', hex);
             // Handle color objects being passed in
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
    
    evaluateCurve(curve, t) {
        if (!curve || curve.length < 2) return 1;
        
        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t));
        
        // Find surrounding points
        let p1 = curve[0];
        let p2 = curve[curve.length - 1];
        
        for (let i = 0; i < curve.length - 1; i++) {
            if (t >= curve[i].x && t <= curve[i + 1].x) {
                p1 = curve[i];
                p2 = curve[i + 1];
                break;
            }
        }
        
        // Linear interpolation
        if (p2.x === p1.x) return p1.y;
        const ratio = (t - p1.x) / (p2.x - p1.x);
        return p1.y + (p2.y - p1.y) * ratio;
    }
    
    isEmitterActiveAtTime(time) {
        // Check if any timeline tracks are active at the current time
        if (!this.timelineData.tracks || this.timelineData.tracks.length === 0) {
            return true; // Default to active if no timeline data
        }
        
        // Check if time is within any active track
        for (const track of this.timelineData.tracks) {
            if (time >= track.start && time < track.start + track.duration) {
                return true;
            }
        }
        
        return false;
    }
    
    createParticle() {
        // *** UPDATED: Use correct internal names ***
        const speed = this.effectParams['fSpeed'] || 0;
        const turbulence = this.effectParams['fTurbulence'] || 0;
        const color = this.effectParams['cColor'] || { r: 255, g: 255, b: 255, a: 1 };

        const particle = {
            // Position (with some spawn variance)
            x: this.canvas.width / 2 + (Math.random() - 0.5) * 20,
            y: this.canvas.height / 2 + (Math.random() - 0.5) * 20,
            z: 0,
            
            // Velocity - now with full parameter support
            vx: (this.effectParams['vVelocity']?.x || 0) + (Math.random() - 0.5) * 2,
            vy: -(speed) - Math.random() * 2, // Use Speed for vertical velocity
            vz: (this.effectParams['vVelocity']?.z || 0),
            
            // Properties - responsive to all parameters
            lifetime: this.effectParams['fParticleLifeTime'] * (0.8 + Math.random() * 0.4),
            age: 0,
            size: this.effectParams['fSize'] * (0.8 + Math.random() * 0.4),
            opacity: this.effectParams['fAlpha'],
            
            // Visual - full color support
            color: { ...color },
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        };
        
        // Apply initial turbulence
        if (turbulence > 0) {
            particle.vx += (Math.random() - 0.5) * turbulence * 10;
            particle.vy += (Math.random() - 0.5) * turbulence * 10;
        }
        
        this.particles.push(particle);
        this.particleCount++;
        
        return particle;
    }
    
    createBurst() {
        // *** UPDATED: Use correct internal name ***
        const burstCount = this.effectParams['fBurstCount'] || 0;
        if (burstCount === 0) return;
        
        console.log(`💥 Creating burst of ${burstCount} particles`);
        
        for (let i = 0; i < burstCount; i++) {
            if (this.particleCount < this.maxParticles) {
                this.createParticle();
            }
        }
    }
    
    updateParticles() {
        // Calculate delta time
        const currentTime = performance.now() / 1000;
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update timeline time
        if (this.timelineData.playing) {
            this.timelineData.currentTime = (this.timelineData.currentTime + this.deltaTime) % this.timelineData.duration;
        }
        
        this.time += this.deltaTime;
        
        // Update timeline display
        const timeDisplay = document.getElementById('timeline-time');
        if (timeDisplay) {
            timeDisplay.textContent = this.timelineData.currentTime.toFixed(2);
        }
        
        // Check if emitter should be active based on timeline
        const timelineActive = this.isEmitterActiveAtTime(this.timelineData.currentTime);
        
        // *** UPDATED: Use correct internal name ***
        // Spawn new particles based on spawn rate (if emitter and timeline allow)
        const spawnRate = this.effectParams['fCount'] || 0;
        if (this.emitterActive && timelineActive && this.particleCount < this.maxParticles) {
            this.spawnAccumulator += this.deltaTime * spawnRate;
            while (this.spawnAccumulator >= 1) {
                this.createParticle();
                this.spawnAccumulator -= 1;
            }
        }
        
        // *** UPDATED: Use correct internal name ***
        // Handle burst spawning if burst count is set
        if (this.effectParams['fBurstCount'] > 0 && timelineActive) {
            this.burstTimer += this.deltaTime;
            if (this.burstTimer >= 1.0) { // Burst every second
                this.createBurst();
                this.burstTimer = 0;
            }
        }
        
        // --- Get physics values once ---
        // *** UPDATED: Use correct internal names ***
        const gravity = (this.effectParams['fGravityScale'] || 0) * 9.8; // Note: CryEngine uses scale, sim uses acceleration
        const drag = this.effectParams['fDrag'] || this.effectParams['fAirResistance'] || 0;
        const turbulence = this.effectParams['fTurbulence'] || 0;
        const useCollisions = this.effectParams['bZBufferCollision'] || this.effectParams['bCollideStaticObjects'] || this.effectParams['bCollideTerrainOnly'] || false;
        
        // Update existing particles with full curve support
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update age
            p.age += this.deltaTime;
            const lifeRatio = p.age / p.lifetime;
            
            // Remove dead particles
            if (lifeRatio >= 1) {
                this.particles.splice(i, 1);
                this.particleCount--;
                continue;
            }
            
            // *** UPDATED: Use correct internal names ***
            // Apply size curve - FULLY REACTIVE
            if (this.curves.size && this.curves.size.length > 0) {
                const curveValue = this.evaluateCurve(this.curves.size, lifeRatio);
                p.size = this.effectParams['fSize'] * curveValue * (0.8 + Math.random() * 0.4);
            }
            
            // *** UPDATED: Use correct internal names ***
            // Apply opacity curve - FULLY REACTIVE
            if (this.curves.opacity && this.curves.opacity.length > 0) {
                const curveValue = this.evaluateCurve(this.curves.opacity, lifeRatio);
                p.opacity = this.effectParams['fAlpha'] * curveValue;
            }
            
            // Apply velocity curve - FULLY REACTIVE
            if (this.curves.velocity && this.curves.velocity.length > 0) {
                const velocityMult = this.evaluateCurve(this.curves.velocity, lifeRatio);
                const velocityScale = 0.98 + velocityMult * 0.02; // Subtle velocity modulation
                p.vx *= velocityScale;
                p.vy *= velocityScale;
            }
            
            // *** UPDATED: Use correct internal name ***
            // Apply color curve if available
            if (this.curves.color && this.curves.color.length > 0) {
                const colorMult = this.evaluateCurve(this.curves.color, lifeRatio);
                p.color = {
                    r: this.effectParams['cColor'].r * colorMult,
                    g: this.effectParams['cColor'].g * colorMult,
                    b: this.effectParams['cColor'].b * colorMult,
                    a: this.effectParams['cColor'].a
                };
            }
            
            // Apply physics - FULLY REACTIVE TO PARAMETERS
            p.vy += gravity * this.deltaTime * 10;
            
            // Apply drag - FULLY REACTIVE
            p.vx *= (1 - drag * this.deltaTime);
            p.vy *= (1 - drag * this.deltaTime);
            
            // Apply turbulence - FULLY REACTIVE
            if (turbulence > 0) {
                p.vx += (Math.random() - 0.5) * turbulence * this.deltaTime * 50;
                p.vy += (Math.random() - 0.5) * turbulence * this.deltaTime * 50;
            }
            
            // Update position
            p.x += p.vx * this.deltaTime * 10;
            p.y += p.vy * this.deltaTime * 10;
            p.z += p.vz * this.deltaTime * 10;
            
            // Update rotation
            p.rotation += p.rotationSpeed;
            
            // Apply collisions if enabled - FULLY REACTIVE
            if (useCollisions) {
                // Simple floor collision
                if (p.y > this.canvas.height - 10) {
                    p.y = this.canvas.height - 10;
                    p.vy *= -0.5; // Bounce with damping
                    p.vx *= 0.8; // Friction
                }
                
                // Wall collisions
                if (p.x < 10 || p.x > this.canvas.width - 10) {
                    p.vx *= -0.5;
                    p.x = Math.max(10, Math.min(this.canvas.width - 10, p.x));
                }
            }
        }
        
        // Update particle count display
        const countDisplay = document.getElementById('particle-count');
        if (countDisplay) {
            countDisplay.textContent = this.particleCount;
        }
    }
    
    render() {
        if (!this.ctx || !this.canvas) return;
        
        // Clear canvas with subtle trail effect
        this.ctx.fillStyle = 'rgba(37, 37, 42, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // *** UPDATED: Use correct internal name ***
        // Set blend mode - FULLY REACTIVE TO PARAMETER
        const blendMode = this.effectParams['eBlendType'] || 'Additive';
        if (blendMode.toLowerCase() === 'additive') {
            this.ctx.globalCompositeOperation = 'screen'; // 'screen' is often used for additive
        } else if (blendMode.toLowerCase() === 'multiplicative') {
            this.ctx.globalCompositeOperation = 'multiply';
        } else if (blendMode.toLowerCase() === 'screen') {
            this.ctx.globalCompositeOperation = 'screen';
        } else if (blendMode.toLowerCase() === 'overlay') {
            this.ctx.globalCompositeOperation = 'overlay';
        } else {
            this.ctx.globalCompositeOperation = 'source-over'; // AlphaBlend / Opaque
        }
        
        // Sort particles by Z for depth
        this.particles.sort((a, b) => a.z - b.z);
        
        // Render particles with full parameter support
        this.particles.forEach(p => {
            this.ctx.save();
            
            // Calculate screen size based on Z depth
            const depthScale = 1 + p.z * 0.001;
            const screenSize = p.size * 4 * depthScale;
            
            // Set particle properties
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            
            // Draw particle with gradient
            const r = p.color.r || 255;
            const g = p.color.g || 255;
            const b = p.color.b || 255;
            
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, screenSize);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
            gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.8)`);
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-screenSize, -screenSize, screenSize * 2, screenSize * 2);
            
            // Add glow effect for bright particles
            if (p.opacity > 0.5) {
                this.ctx.shadowBlur = screenSize * 2;
                this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
                this.ctx.fillRect(-screenSize * 0.5, -screenSize * 0.5, screenSize, screenSize);
            }
            
            this.ctx.restore();
        });
        
        // Reset blend mode
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Draw debug info if needed
        this.renderDebugInfo();
    }
    
    renderDebugInfo() {
        if (!this.ctx) return;
        
        // Draw emitter position
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 20, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    startAnimation() {
        this.lastTime = performance.now() / 1000;
        
        const animate = () => {
            this.updateParticles();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    togglePlayPause() {
        const btn = document.getElementById('play-pause');
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.timelineData.playing = false;
            if (btn) btn.textContent = '▶️';
        } else {
            this.startAnimation();
            this.timelineData.playing = true;
            if (btn) btn.textContent = '⏸️';
        }
    }
    
    reset() {
        this.particles = [];
        this.particleCount = 0;
        this.time = 0;
        this.spawnAccumulator = 0;
        this.burstTimer = 0;
        this.timelineData.currentTime = 0;
        console.log('🔄 Particle system reset');
    }
    
    toggleEmitter() {
        this.emitterActive = !this.emitterActive;
        const btn = document.getElementById('toggle-emitter');
        if (btn) {
            btn.textContent = this.emitterActive ? '🔥' : '💨';
        }
        console.log('Emitter', this.emitterActive ? 'enabled' : 'disabled');
    }
    
    clearAllParticles() {
        this.particles = [];
        this.particleCount = 0;
        console.log('🧹 All particles cleared');
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.particles = [];
        this.particleCount = 0;
        if (this.canvas) {
            this.canvas.remove();
        }
    }
    
    // Export current state for saving - COMPLETE DATA CAPTURE
    exportState() {
        // Return a deep copy of the params
        const exportedParams = {};
        for(const key in this.effectParams) {
            const value = this.effectParams[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                exportedParams[key] = { ...value }; // Shallow copy for objects like color
            } else if (Array.isArray(value)) {
                 exportedParams[key] = [ ...value ]; // Shallow copy for arrays like velocity
            } else {
                exportedParams[key] = value;
            }
        }
        
        return {
            effectName: this.currentEffect?.name || 'Unnamed Effect',
            params: exportedParams, // All current values
            curves: JSON.parse(JSON.stringify(this.curves)), // Deep copy curves
            timeline: { ...this.timelineData }, // Shallow copy timeline
            particleCount: this.particleCount,
            time: this.time
        };
    }
}
