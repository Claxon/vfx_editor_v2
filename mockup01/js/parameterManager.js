// Enhanced Parameter Manager - Adds CryEngine 3 Parameters + Expression System
// Extends existing parameterManager.js with ALL features from ParticleParams_info.h
// ***** UPDATED to include exportExpressions() method *****

export class ParameterManager {
    constructor() {
        this.container = document.getElementById('parameters-content');
        this.currentEffect = null;
        this.widgetContextMenu = null;
        this.presetDropdowns = new Map();
        
        // Expression system
        this.expressions = new Map();
        this.references = new Map();
        this.dependents = new Map();
        this.clipboard = null;
        this.clipboardAsExpression = false;
        this.dragSource = null;
        this.selectedParam = null;
    }

    init() {
        console.log('🎛️ Initializing Enhanced Parameter Manager with Expressions');
        this.setupWidgetContextMenu();
        this.setupExpressionHandlers();
    }

    setupExpressionHandlers() {
        // Keyboard shortcuts for expressions
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.copyAsExpression();
            } else if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.copyAsValue();
            } else if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.paste();
            }
        });

        // Middle-mouse drag support
        let isDragging = false;
        document.addEventListener('mousemove', (e) => {
            if (e.buttons === 4 && this.dragSource) { // Middle button
                isDragging = true;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 1 && isDragging && this.dragSource) {
                this.completeDrag(e);
            }
            isDragging = false;
        });
    }

    setupWidgetContextMenu() {
        this.widgetContextMenu = document.getElementById('widget-selector');
        
        if (!this.widgetContextMenu) return;

        const items = this.widgetContextMenu.querySelectorAll('.context-menu-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const widgetType = item.dataset.widget;
                this.changeWidgetType(widgetType);
                this.hideContextMenu();
            });
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    showWidgetSelector(paramElement, x, y) {
        if (!this.widgetContextMenu) return;

        this.currentParamElement = paramElement;
        this.widgetContextMenu.style.display = 'block';
        
        const menuWidth = 200;
        const menuHeight = 200;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let finalX = x;
        if (x + menuWidth > windowWidth) {
            finalX = x - menuWidth - 10;
        }
        
        let finalY = y;
        if (y + menuHeight > windowHeight) {
            finalY = windowHeight - menuHeight - 10;
        }
        
        this.widgetContextMenu.style.left = `${finalX}px`;
        this.widgetContextMenu.style.top = `${finalY}px`;
    }

    hideContextMenu() {
        if (this.widgetContextMenu) {
            this.widgetContextMenu.style.display = 'none';
        }
    }

    changeWidgetType(widgetType) {
        if (!this.currentParamElement) return;

        const paramRow = this.currentParamElement.closest('.parameter-row');
        if (!paramRow) return;

        const paramName = paramRow.querySelector('.parameter-label')?.textContent;
        const currentValue = this.getCurrentValue(paramRow);

        console.log(`Changing widget for "${paramName}" to ${widgetType}`);

        const oldControl = paramRow.querySelector('.slider-control, .vector-control, .color-control, .dropdown-control, .checkbox-control');
        if (oldControl) {
            oldControl.remove();
        }

        let newControl;
        switch (widgetType) {
            case 'slider':
                newControl = this.createSlider({ name: paramName, value: currentValue, min: 0, max: 100 });
                break;
            case 'number':
                newControl = this.createNumberInput({ name: paramName, value: currentValue });
                break;
            case 'dropdown':
                newControl = this.createPresetDropdown({ name: paramName, value: currentValue });
                break;
            case 'vector':
                newControl = this.createVector({ name: paramName, value: [currentValue, currentValue, currentValue] });
                break;
            case 'color':
                newControl = this.createColor({ name: paramName, value: '#ff6b35' });
                break;
        }

        if (newControl) {
            paramRow.appendChild(newControl);
        }
    }

    getCurrentValue(paramRow) {
        const sliderValue = paramRow.querySelector('.slider-value');
        if (sliderValue) return parseFloat(sliderValue.value) || 0;

        const vectorInput = paramRow.querySelector('.vector-input');
        if (vectorInput) return parseFloat(vectorInput.value) || 0;

        return 50;
    }

    loadEffect(effectData) {
        this.currentEffect = effectData;
        this.render();
        
        // Load parameter values from effect
        if (effectData.params) {
            setTimeout(() => {
                Object.entries(effectData.params).forEach(([name, value]) => {
                    this.setParameterValue(name, value);
                });
                console.log('✅ Loaded parameters for', effectData.name);
            }, 100);
        }

        // Load expressions
        this.expressions.clear();
        this.references.clear();
        this.dependents.clear();
        if (effectData.expressions) {
             setTimeout(() => {
                Object.entries(effectData.expressions).forEach(([name, expression]) => {
                    this.setExpression(name, expression);
                    this.refreshParameterRow(name); // Refresh UI after setting expression
                });
                console.log('✅ Loaded expressions for', effectData.name);
             }, 100);
        }
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        // Complete CryEngine 3 parameter groups from ParticleParams_info.h
        // Note: These should ideally come from the parser, but we'll keep the simple manager's structure
        // as requested by the user's file context (FIXES_APPLIED.md)
        const parameterGroups = [
            this.createSpawnGroup(),
            this.createTimingGroup(),
            this.createEmitterLocationGroup(),
            this.createAppearanceGroup(),
            this.createLightingGroup(),
            this.createMovementGroup(),
            this.createSizeGroup(),
            this.createRotationFacingGroup(),
            this.createCollisionGroup(),
            this.createVisibilityGroup(),
            this.createAdvancedGroup()
        ];

        parameterGroups.forEach(group => {
            this.container.appendChild(this.createParameterGroup(group));
        });
    }

    // CryEngine 3 Parameter Groups from ParticleParams_info.h
    createSpawnGroup() {
        return {
            title: 'Spawn',
            badge: '8',
            parameters: [
                { name: 'Enabled', type: 'checkbox', value: true, state: 'default' },
                { name: 'Count', type: 'slider', value: 100, min: 0, max: 10000, state: 'modified' },
                { name: 'Spawn Probability', type: 'slider', value: 1.0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Inheritance', type: 'dropdown', value: 'Standard', options: ['Standard', 'Parent', 'ExternalRef'], state: 'default' },
                { name: 'Spawn Mode', type: 'dropdown', value: 'Direct', options: ['Direct', 'ParentStart', 'ParentCollide', 'ParentDeath'], state: 'default' },
                { name: 'Maintain Density', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Planetary Spacing', type: 'slider', value: 0, min: 0, max: 1000, state: 'default' },
                { name: 'Spline Guided', type: 'checkbox', value: false, state: 'default' }
            ]
        };
    }

    createTimingGroup() {
        return {
            title: 'Timing',
            badge: '6',
            parameters: [
                { name: 'Continuous', type: 'checkbox', value: true, state: 'default' },
                { name: 'Particle Lifetime', type: 'slider', value: 2.5, min: 0, max: 10, step: 0.1, state: 'modified' },
                { name: 'Emitter Lifetime', type: 'slider', value: 0, min: 0, max: 100, step: 0.1, state: 'default' },
                { name: 'Spawn Delay', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Pulse Period', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Emit Per Distance', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' }
            ]
        };
    }

    createEmitterLocationGroup() {
        return {
            title: 'Emitter Location',
            badge: '5',
            parameters: [
                { name: 'Position Offset', type: 'vector', value: [0, 0, 0], labels: ['X', 'Y', 'Z'], state: 'default' },
                { name: 'Emission Size', type: 'vector', value: [1, 1, 1], labels: ['X', 'Y', 'Z'], state: 'default' },
                { name: 'Emission Roundness', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Emission Distribution', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Bind To Camera', type: 'checkbox', value: false, state: 'default' }
            ]
        };
    }

    createAppearanceGroup() {
        return {
            title: 'Appearance',
            badge: '8',
            parameters: [
                { name: 'Blend Mode', type: 'dropdown', value: 'Additive', options: ['AlphaBased', 'Additive', 'Multiplicative', 'Opaque'], state: 'default' },
                { name: 'Texture', type: 'text', value: 'textures/particles/smoke.dds', state: 'default' },
                { name: 'Color', type: 'color', value: '#ff6b35', state: 'modified' },
                { name: 'Alpha', type: 'slider', value: 0.85, min: 0, max: 1, step: 0.01, state: 'modified' },
                { name: 'Size', type: 'slider', value: 1.0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Aspect', type: 'slider', value: 1.0, min: 0, max: 4, step: 0.1, state: 'default' },
                { name: 'Soft Particle', type: 'checkbox', value: false, state: 'default' },
                { name: 'Octagonal Shape', type: 'checkbox', value: false, state: 'default' }
            ]
        };
    }

    createLightingGroup() {
        return {
            title: 'Lighting',
            badge: '6',
            parameters: [
                { name: 'Emissive Lighting', type: 'slider', value: 0, min: 0, max: 1000, state: 'default' },
                { name: 'Receive Shadows', type: 'checkbox', value: false, state: 'default' },
                { name: 'Cast Shadows', type: 'checkbox', value: false, state: 'default' },
                { name: 'Reflectiveness', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Curvature', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Not Affected By Fog', type: 'checkbox', value: false, state: 'default' }
            ]
        };
    }

    createMovementGroup() {
        return {
            title: 'Movement',
            badge: '9',
            parameters: [
                { name: 'Speed', type: 'slider', value: 5.0, min: 0, max: 100, step: 0.1, state: 'modified' },
                { name: 'Inherit Velocity', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Velocity', type: 'vector', value: [0, 0, 5.0], labels: ['X', 'Y', 'Z'], state: 'inherited' },
                { name: 'Acceleration', type: 'vector', value: [0, 0, 0], labels: ['X', 'Y', 'Z'], state: 'default' },
                { name: 'Gravity Scale', type: 'slider', value: 0, min: -2, max: 2, step: 0.1, state: 'default' },
                { name: 'Air Resistance', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Drag', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Turbulence', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Wind Scale', type: 'slider', value: 1.0, min: 0, max: 2, step: 0.01, state: 'default' }
            ]
        };
    }

    createSizeGroup() {
        return {
            title: 'Size',
            badge: '5',
            parameters: [
                { name: 'Size', type: 'slider', value: 1.0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Aspect', type: 'slider', value: 1.0, min: 0, max: 4, step: 0.1, state: 'default' },
                { name: 'Pivot X', type: 'slider', value: 0, min: -1, max: 1, step: 0.01, state: 'default' },
                { name: 'Pivot Y', type: 'slider', value: 0, min: -1, max: 1, step: 0.01, state: 'default' },
                { name: 'Velocity Stretch', type: 'slider', value: 0, min: 0, max: 1, step: 0.01, state: 'default' }
            ]
        };
    }

    createRotationFacingGroup() {
        return {
            title: 'Rotation and Facing',
            badge: '6',
            parameters: [
                { name: 'Init Angles', type: 'vector', value: [0, 0, 0], labels: ['Pitch', 'Yaw', 'Roll'], state: 'default' },
                { name: 'Random Angles', type: 'vector', value: [0, 0, 0], labels: ['Pitch', 'Yaw', 'Roll'], state: 'default' },
                { name: 'Rotation Rate', type: 'vector', value: [0, 0, 0], labels: ['Pitch', 'Yaw', 'Roll'], state: 'default' },
                { name: 'Facing', type: 'dropdown', value: 'Camera', options: ['Camera', 'Velocity', 'Horizontal', 'Free'], state: 'default' },
                { name: 'Orient To Velocity', type: 'checkbox', value: false, state: 'default' },
                { name: 'Orient To Terrain', type: 'checkbox', value: false, state: 'default' }
            ]
        };
    }

    createCollisionGroup() {
        return {
            title: 'Collision',
            badge: '7',
            parameters: [
                { name: 'Z-Buffer Collision', type: 'checkbox', value: false, state: 'default' },
                { name: 'Planet HeightMap', type: 'checkbox', value: false, state: 'default' },
                { name: 'SDF Collision', type: 'checkbox', value: false, state: 'default' },
                { name: 'Elasticity', type: 'slider', value: 0.5, min: 0, max: 1, step: 0.01, state: 'default' },
                { name: 'Friction', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Stop Speed', type: 'slider', value: 0, min: 0, max: 10, step: 0.1, state: 'default' },
                { name: 'Stop Behaviour', type: 'dropdown', value: 'Stop', options: ['Stop', 'Freeze', 'Die'], state: 'default' }
            ]
        };
    }

    createVisibilityGroup() {
        return {
            title: 'Visibility',
            badge: '7',
            parameters: [
                { name: 'Camera Max Distance', type: 'slider', value: 100, min: 0, max: 1000, state: 'default' },
                { name: 'Camera Min Distance', type: 'slider', value: 0, min: 0, max: 100, state: 'default' },
                { name: 'Max Distance LOD', type: 'slider', value: 1000, min: 0, max: 5000, state: 'default' },
                { name: 'Sort Offset', type: 'slider', value: 0, min: -10, max: 10, step: 0.1, state: 'default' },
                { name: 'Draw On Top', type: 'checkbox', value: false, state: 'default' },
                { name: 'Visible Indoors', type: 'dropdown', value: 'Both', options: ['Both', 'IndoorsOnly', 'OutdoorsOnly'], state: 'default' },
                { name: 'Responsive AA', type: 'checkbox', value: false, state: 'default' }
            ]
        };
    }

    createAdvancedGroup() {
        return {
            title: 'Advanced',
            badge: '5',
            parameters: [
                { name: 'Force Update Shader', type: 'checkbox', value: false, state: 'default' },
                { name: 'Half Res', type: 'checkbox', value: false, state: 'default' },
                { name: 'Update Rule', type: 'dropdown', value: 'OnScreen', options: ['OnScreen', 'OnStreaming', 'Always'], state: 'default' },
                { name: 'Seed', type: 'number', value: 0, min: 0, max: 99999, state: 'default' },
                { name: 'Streamable', type: 'checkbox', value: true, state: 'default' }
            ]
        };
    }

    createParameterGroup(group) {
        const groupEl = document.createElement('div');
        groupEl.className = 'parameter-group';

        const header = document.createElement('div');
        header.className = 'parameter-group-header';
        header.innerHTML = `
            <span class="parameter-group-toggle">▼</span>
            <span class="parameter-group-title">${group.title}</span>
            <span class="parameter-group-badge">${group.badge}</span>
        `;

        header.addEventListener('click', () => {
            groupEl.classList.toggle('collapsed');
        });

        const content = document.createElement('div');
        content.className = 'parameter-group-content';

        group.parameters.forEach(param => {
            content.appendChild(this.createParameter(param));
        });

        groupEl.appendChild(header);
        groupEl.appendChild(content);

        return groupEl;
    }

    createParameter(param) {
        const paramEl = document.createElement('div');
        paramEl.className = 'parameter-row';
        paramEl.dataset.paramName = param.name;

        // Check expression status
        const hasExpression = this.expressions.has(param.name);
        const isReferenced = this.dependents.has(param.name);
        
        if (hasExpression) paramEl.classList.add('expression');
        if (isReferenced) paramEl.classList.add('dependency');

        const header = document.createElement('div');
        header.className = 'parameter-header';
        header.innerHTML = `
            <span class="parameter-label">
                ${param.name}
                ${hasExpression ? '<span class="expr-indicator" title="Has expression">ƒx</span>' : ''}
                ${isReferenced ? '<span class="ref-indicator" title="Referenced">🔗</span>' : ''}
            </span>
            <div class="parameter-controls">
                <div class="parameter-state ${param.state}" title="${param.state}"></div>
                <button class="param-icon-btn reset-btn" title="Reset to Default">↺</button>
                <button class="param-icon-btn curve-btn" title="Add to Curve">📈</button>
                <button class="param-icon-btn menu-btn" title="More Options">⋮</button>
            </div>
        `;

        // Selection
        paramEl.addEventListener('click', () => {
            document.querySelectorAll('.parameter-row').forEach(r => r.classList.remove('selected'));
            paramEl.classList.add('selected');
            this.selectedParam = param.name;
        });

        // Middle-mouse drag
        paramEl.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                this.startDrag(param.name, paramEl);
            }
        });

        // Context menu
        const menuBtn = header.querySelector('.menu-btn');
        menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showParamContextMenu(e, param);
        });

        // Reset button
        const resetBtn = header.querySelector('.reset-btn');
        resetBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetParameter(param);
        });

        paramEl.appendChild(header);

        // Create control
        let control;
        switch (param.type) {
            case 'slider':
                control = this.createSlider(param);
                break;
            case 'vector':
                control = this.createVector(param);
                break;
            case 'color':
                control = this.createColor(param);
                break;
            case 'dropdown':
                control = this.createDropdown(param);
                break;
            case 'checkbox':
                control = this.createCheckbox(param);
                break;
            case 'number':
                control = this.createNumberInput(param);
                break;
            case 'text':
                control = this.createTextInput(param);
                break;
        }

        if (control) {
            paramEl.appendChild(control);
        }

        return paramEl;
    }

    createTextInput(param) {
        const container = document.createElement('div');
        container.className = 'text-control';
        container.innerHTML = `
            <input type="text" class="text-input-field" value="${param.value || ''}" placeholder="Enter path...">
        `;
        
        const input = container.querySelector('.text-input-field');
        input?.addEventListener('change', (e) => {
            this.dispatchParameterChange(param.name, e.target.value);
        });
        
        return container;
    }

    createNumberInput(param) {
        const container = document.createElement('div');
        container.className = 'number-control';
        container.innerHTML = `
            <input type="number" class="number-input" value="${param.value || 0}" step="1" min="${param.min || 0}" max="${param.max || 999999}">
        `;
        
        const input = container.querySelector('.number-input');
        input?.addEventListener('change', (e) => {
            this.dispatchParameterChange(param.name, parseFloat(e.target.value) || 0);
        });
        
        return container;
    }

    // Expression System Methods
    copyAsValue() {
        if (!this.selectedParam) {
            this.showToast('No parameter selected');
            return;
        }

        const value = this.getParameterValue(this.selectedParam);
        this.clipboard = { param: this.selectedParam, value, asExpression: false };
        this.showToast(`📋 Copied ${this.selectedParam}`);
    }

    copyAsExpression() {
        if (!this.selectedParam) {
            this.showToast('No parameter selected');
            return;
        }

        const value = this.getParameterValue(this.selectedParam);
        const expression = this.expressions.get(this.selectedParam) || `\${${this.selectedParam}}`;
        
        this.clipboard = { param: this.selectedParam, value, expression, asExpression: true };
        this.showToast(`📋 Copied as expression: ${this.selectedParam}`);
    }

    paste() {
        if (!this.clipboard || !this.selectedParam) {
            this.showToast('Nothing to paste or no target selected');
            return;
        }

        if (this.clipboard.asExpression) {
            // Create reference expression
            const expr = `\${${this.clipboard.param}}`;
            this.setExpression(this.selectedParam, expr);
            this.showToast(`🔗 Pasted expression to ${this.selectedParam}`);
        } else {
            // Paste value
            this.setParameterValue(this.selectedParam, this.clipboard.value);
            this.showToast(`📋 Pasted value to ${this.selectedParam}`);
        }

        this.refreshParameterRow(this.selectedParam);
    }

    startDrag(paramName, element) {
        this.dragSource = { param: paramName, element };
        element.classList.add('dragging');
        console.log('Started drag:', paramName);
    }

    completeDrag(e) {
        if (!this.dragSource) return;

        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const targetRow = targetEl?.closest('.parameter-row');
        
        if (targetRow && targetRow.dataset.paramName !== this.dragSource.param) {
            const targetParam = targetRow.dataset.paramName;
            const expr = `\${${this.dragSource.param}}`;
            
            this.setExpression(targetParam, expr);
            this.refreshParameterRow(targetParam);
            
            this.showToast(`🔗 ${targetParam} → ${this.dragSource.param}`);
        }

        this.dragSource.element.classList.remove('dragging');
        this.dragSource = null;
    }

    setExpression(paramName, expression) {
        // Clear old references
        const oldRefs = this.references.get(paramName);
        if (oldRefs) {
            oldRefs.forEach(ref => {
                const deps = this.dependents.get(ref);
                if (deps) {
                    deps.delete(paramName);
                    if (deps.size === 0) this.dependents.delete(ref);
                }
            });
        }

        // Parse new expression
        const refs = this.extractReferences(expression);
        
        this.expressions.set(paramName, expression);
        this.references.set(paramName, refs);
        
        // Update dependents
        refs.forEach(ref => {
            if (!this.dependents.has(ref)) {
                this.dependents.set(ref, new Set());
            }
            this.dependents.get(ref).add(paramName);
        });

        // Evaluate and update
        this.evaluateExpression(paramName);
    }

    extractReferences(expression) {
        const refs = new Set();
        
        // ${ParamName}
        const dollarMatches = expression.matchAll(/\$\{([^}]+)\}/g);
        for (const match of dollarMatches) {
            refs.add(match[1].trim());
        }
        
        // @ParamName
        const atMatches = expression.matchAll(/@([a-zA-Z_][a-zA-Z0-9_\s]*)/g);
        for (const match of atMatches) {
            refs.add(match[1].trim());
        }
        
        // %ParamName%
        const percentMatches = expression.matchAll(/%([^%]+)%/g);
        for (const match of percentMatches) {
            refs.add(match[1].trim());
        }
        
        return refs;
    }

    evaluateExpression(paramName) {
        const expression = this.expressions.get(paramName);
        if (!expression) return;

        try {
            // Get all parameter values
            const values = {};
            this.container.querySelectorAll('.parameter-row').forEach(row => {
                const name = row.dataset.paramName;
                values[name] = this.getParameterValue(name);
            });

            // Replace references
            let evaluated = expression;
            
            evaluated = evaluated.replace(/\$\{([^}]+)\}/g, (match, name) => {
                return values[name.trim()] !== undefined ? values[name.trim()] : 0;
            });
            
            evaluated = evaluated.replace(/@([a-zA-Z_][a-zA-Z0-9_\s]*)/g, (match, name) => {
                return values[name.trim()] !== undefined ? values[name.trim()] : 0;
            });
            
            evaluated = evaluated.replace(/%([^%]+)%/g, (match, name) => {
                return values[name.trim()] !== undefined ? values[name.trim()] : 0;
            });

            // Safe eval with math functions
            const result = new Function(`
                const {sin, cos, tan, sqrt, pow, abs, min, max, floor, ceil, round, PI} = Math;
                const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                const lerp = (a, b, t) => a + (b - a) * t;
                const remap = (v, inMin, inMax, outMin, outMax) => outMin + (outMax - outMin) * ((v - inMin) / (inMax - inMin));
                return ${evaluated};
            `)();

            // Update widget
            this.setParameterValue(paramName, result);
        } catch (error) {
            console.error('Expression error:', error);
        }
    }

    getParameterValue(paramName) {
        const row = this.container.querySelector(`[data-param-name="${paramName}"]`);
        if (!row) return 0;

        const sliderValue = row.querySelector('.slider-value');
        if (sliderValue) return parseFloat(sliderValue.value) || 0;

        const vectorInput = row.querySelector('.vector-input');
        if (vectorInput) return parseFloat(vectorInput.value) || 0;

        const numberInput = row.querySelector('.number-input');
        if (numberInput) return parseFloat(numberInput.value) || 0;

        const checkbox = row.querySelector('.checkbox');
        if (checkbox) return checkbox.classList.contains('checked') ? 1 : 0;
        
        const dropdown = row.querySelector('.dropdown-select');
        if (dropdown) return dropdown.value;
        
        const textInput = row.querySelector('.text-input-field');
        if (textInput) return textInput.value;
        
        const colorValue = row.querySelector('.color-value');
        if(colorValue) return colorValue.value;

        return 0;
    }

    setParameterValue(paramName, value) {
        const row = this.container.querySelector(`[data-param-name="${paramName}"]`);
        if (!row) return;

        // Find and update the appropriate widget
        const sliderValue = row.querySelector('.slider-value');
        if (sliderValue) {
            sliderValue.value = typeof value === 'number' ? value.toFixed(parseFloat(sliderValue.step) >= 1 ? 0 : 2) : value;
            // Update slider track
            const slider = row.querySelector('.slider-input');
            const track = row.querySelector('.slider-track');
            if (slider && track) {
                const min = parseFloat(slider.dataset.min);
                const max = parseFloat(slider.dataset.max);
                const percentage = ((parseFloat(value) - min) / (max - min)) * 100;
                track.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
            }
            return;
        }

        const numberInput = row.querySelector('.number-input');
        if (numberInput) {
            numberInput.value = value;
            return;
        }
        
        const textInput = row.querySelector('.text-input-field');
        if (textInput) {
            textInput.value = value;
            return;
        }
        
        const colorValue = row.querySelector('.color-value');
        if (colorValue) {
            colorValue.value = value;
            const swatch = row.querySelector('.color-swatch');
            const picker = row.querySelector('.color-picker');
            if (swatch) swatch.style.background = value;
            if (picker) picker.value = value;
            return;
        }
        
        const dropdown = row.querySelector('.dropdown-select');
        if (dropdown) {
            dropdown.value = value;
            return;
        }
        
        const checkbox = row.querySelector('.checkbox');
        if (checkbox) {
            if (value) {
                checkbox.classList.add('checked');
            } else {
                checkbox.classList.remove('checked');
            }
            return;
        }
        
        const vectorInputs = row.querySelectorAll('.vector-input');
        if (vectorInputs.length > 0 && Array.isArray(value)) {
            vectorInputs.forEach((input, i) => {
                if (value[i] !== undefined) {
                    input.value = value[i];
                }
            });
            return;
        }
    }

    showParamContextMenu(e, param) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.style.zIndex = '10000';

        const hasExpression = this.expressions.has(param.name);

        menu.innerHTML = `
            <div class="context-menu-item" data-action="copy-value">📋 Copy Value</div>
            <div class="context-menu-item" data-action="copy-expr">📑 Copy as Expression</div>
            <div class="context-menu-item" data-action="paste">📥 Paste</div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="edit-expr">✏️ ${hasExpression ? 'Edit' : 'Create'} Expression</div>
            ${hasExpression ? '<div class="context-menu-item" data-action="clear-expr">🗑️ Clear Expression</div>' : ''}
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="reset">↺ Reset to Default</div>
        `;

        document.body.appendChild(menu);

        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.selectedParam = param.name;
                switch (action) {
                    case 'copy-value': this.copyAsValue(); break;
                    case 'copy-expr': this.copyAsExpression(); break;
                    case 'paste': this.paste(); break;
                    case 'edit-expr': this.editExpression(param.name); break;
                    case 'clear-expr': this.clearExpression(param.name); break;
                    case 'reset': this.resetParameter(param); break;
                }
            }
            menu.remove();
        });

        setTimeout(() => {
            const removeMenu = () => {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            };
            document.addEventListener('click', removeMenu);
        }, 0);
    }

    clearExpression(paramName) {
        this.expressions.delete(paramName);
        const refs = this.references.get(paramName);
        if (refs) {
            refs.forEach(ref => {
                const deps = this.dependents.get(ref);
                if (deps) deps.delete(paramName);
            });
            this.references.delete(paramName);
        }
        this.refreshParameterRow(paramName);
        this.showToast(`Cleared expression from ${paramName}`);
    }

    editExpression(paramName) {
        const current = this.expressions.get(paramName) || '';
        const newExpr = prompt(`Expression for ${paramName}:`, current);
        
        if (newExpr !== null && newExpr.trim()) {
            this.setExpression(paramName, newExpr.trim());
            this.refreshParameterRow(paramName);
        }
    }

    resetParameter(param) {
        this.setParameterValue(param.name, param.value);
        this.clearExpression(param.name);
        this.dispatchParameterChange(param.name, param.value);
    }

    refreshParameterRow(paramName) {
        const row = this.container.querySelector(`[data-param-name="${paramName}"]`);
        if (!row) return;

        const hasExpression = this.expressions.has(paramName);
        const isReferenced = this.dependents.has(paramName);
        
        row.classList.toggle('expression', hasExpression);
        row.classList.toggle('dependency', isReferenced);

        const label = row.querySelector('.parameter-label');
        if (label) {
            const name = paramName;
            label.innerHTML = `
                ${name}
                ${hasExpression ? '<span class="expr-indicator" title="Has expression">ƒx</span>' : ''}
                ${isReferenced ? '<span class="ref-indicator" title="Referenced">🔗</span>' : ''}
            `;
        }
    }

    // Keep ALL original methods for widgets
    createSlider(param) {
        const container = document.createElement('div');
        container.className = 'slider-control';

        const min = param.min || 0;
        const max = param.max || 100;
        const value = param.value || 50;
        const percentage = ((value - min) / (max - min)) * 100;

        container.innerHTML = `
            <div class="slider-input" data-min="${min}" data-max="${max}">
                <div class="slider-track" style="width: ${percentage}%">
                    <div class="slider-handle"></div>
                </div>
            </div>
            <input type="number" class="slider-value" value="${value}" step="${param.step || 1}" data-min="${min}" data-max="${max}">
        `;

        const sliderInput = container.querySelector('.slider-input');
        const sliderTrack = container.querySelector('.slider-track');
        const sliderHandle = container.querySelector('.slider-handle');
        const valueInput = container.querySelector('.slider-value');

        let isDragging = false;

        const updateSlider = (clientX) => {
            const rect = sliderInput.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percentage = (x / rect.width) * 100;
            const newValue = min + (max - min) * (percentage / 100);

            sliderTrack.style.width = `${percentage}%`;
            valueInput.value = newValue.toFixed(param.step >= 1 ? 0 : 2);
        };

        sliderHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        sliderInput.addEventListener('click', (e) => {
            if (!isDragging) {
                updateSlider(e.clientX);
                const val = parseFloat(valueInput.value);
                this.handleValueChange(param.name, val);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateSlider(e.clientX);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                const val = parseFloat(valueInput.value);
                this.handleValueChange(param.name, val);
            }
            isDragging = false;
        });

        valueInput.addEventListener('change', () => {
            const val = parseFloat(valueInput.value);
            if (!isNaN(val)) {
                const percentage = ((val - min) / (max - min)) * 100;
                sliderTrack.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
                this.handleValueChange(param.name, val);
            }
        });

        return container;
    }

    createVector(param) {
        const container = document.createElement('div');
        container.className = 'vector-control';

        const labels = param.labels || ['X', 'Y', 'Z'];
        const values = param.value || [0, 0, 0];

        labels.forEach((label, i) => {
            const component = document.createElement('div');
            component.className = 'vector-component';
            component.innerHTML = `
                <div class="vector-label">${label}</div>
                <input type="number" class="vector-input" value="${values[i] || 0}" step="0.1">
            `;
            container.appendChild(component);
        });

        const lock = document.createElement('div');
        lock.className = 'vector-lock';
        lock.innerHTML = `<button class="vector-lock-btn" title="Lock Uniform Scaling">🔓</button>`;

        const lockBtn = lock.querySelector('.vector-lock-btn');
        const inputs = container.querySelectorAll('.vector-input');
        
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                const values = Array.from(inputs).map(i => parseFloat(i.value) || 0);
                this.handleValueChange(param.name, values);
            });
        });

        lockBtn?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('locked');
            btn.innerHTML = btn.classList.contains('locked') ? '🔒' : '🔓';

            if (btn.classList.contains('locked')) {
                const firstValue = inputs[0]?.value;
                inputs.forEach(input => input.value = firstValue);
                const values = Array.from(inputs).map(i => parseFloat(i.value) || 0);
                this.handleValueChange(param.name, values);
            }
        });

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (lockBtn?.classList.contains('locked')) {
                    const value = input.value;
                    inputs.forEach(i => i.value = value);
                }
            });
        });

        container.appendChild(lock);
        return container;
    }

    createColor(param) {
        const container = document.createElement('div');
        container.className = 'color-control';

        container.innerHTML = `
            <div class="color-swatch" style="background: ${param.value}"></div>
            <input type="text" class="color-value" value="${param.value}">
            <input type="color" class="color-picker" value="${param.value}" style="display: none;">
        `;

        const swatch = container.querySelector('.color-swatch');
        const valueInput = container.querySelector('.color-value');
        const picker = container.querySelector('.color-picker');

        swatch?.addEventListener('click', () => picker?.click());

        picker?.addEventListener('input', (e) => {
            const color = e.target.value;
            swatch.style.background = color;
            valueInput.value = color;
            this.handleValueChange(param.name, color);
        });

        return container;
    }

    createDropdown(param) {
        const container = document.createElement('div');
        container.className = 'dropdown-control';

        const options = param.options || ['Option 1', 'Option 2', 'Option 3'];

        container.innerHTML = `
            <select class="dropdown-select">
                ${options.map(opt => `
                    <option value="${opt}" ${opt === param.value ? 'selected' : ''}>${opt}</option>
                `).join('')}
            </select>
        `;
        
        const select = container.querySelector('.dropdown-select');
        select?.addEventListener('change', (e) => {
            this.handleValueChange(param.name, e.target.value);
        });

        return container;
    }

    createCheckbox(param) {
        const container = document.createElement('div');
        container.className = 'checkbox-control';

        container.innerHTML = `
            <div class="checkbox ${param.value ? 'checked' : ''}">
                <span class="checkbox-icon">✓</span>
            </div>
            <span class="checkbox-label">${param.name}</span>
        `;

        const checkbox = container.querySelector('.checkbox');
        checkbox?.addEventListener('click', () => {
            checkbox.classList.toggle('checked');
            const isChecked = checkbox.classList.contains('checked');
            this.handleValueChange(param.name, isChecked);
        });

        return container;
    }

    handleValueChange(paramName, value) {
        // Update dependents
        const deps = this.dependents.get(paramName);
        if (deps) {
            deps.forEach(depName => {
                this.evaluateExpression(depName);
            });
        }

        // Dispatch to other systems
        this.dispatchParameterChange(paramName, value);
    }

    updateFromCurve(curveData) {
        console.log('Updating parameters from curve:', curveData);
    }
    
    dispatchParameterChange(name, value) {
        console.log('📤 Parameter changed:', name, '=', value);
        document.dispatchEvent(new CustomEvent('parameterChanged', {
            detail: { name, value }
        }));
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification show';
        toast.innerHTML = `<div class="toast-message">${message}</div>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Exports all currently defined expressions.
     * @returns {Object} An object mapping paramName -> expressionString
     */
    exportExpressions() {
        const exported = {};
        for (const [paramName, expression] of this.expressions) {
            exported[paramName] = expression;
        }
        return exported;
    }
}

// Styles for new features only
const style = document.createElement('style');
style.textContent = `
    .text-input-field {
        width: 100%;
        padding: 6px 10px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-primary);
        font-size: 12px;
        outline: none;
    }
    .text-input-field:focus {
        border-color: var(--accent-primary);
    }
    .dropdown-select {
        width: 100%;
        padding: 6px 10px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-primary);
        font-size: 12px;
        cursor: pointer;
        outline: none;
    }
    .dropdown-select:hover {
        border-color: var(--border-light);
    }
    .number-input {
        width: 100%;
        padding: 6px 10px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-primary);
        font-size: 12px;
        outline: none;
    }
    .parameter-row.selected {
        background: rgba(79, 195, 247, 0.1);
        border: 1px solid rgba(79, 195, 247, 0.3);
    }
`;
document.head.appendChild(style);
