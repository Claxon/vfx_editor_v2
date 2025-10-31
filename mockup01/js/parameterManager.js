// Enhanced Parameter Manager - XML-Driven
// This manager now reads from an external XML definition via the
// CryEngineParameterParser and uses a WidgetFactory to build the UI.
// *** UPDATED to show ⚠️ for unused parameters ***

import { CryEngineParameterParser } from './cryEngineParameterParser.js';
import { WidgetFactory } from './WidgetFactory.js';

export class ParameterManager {
    constructor() {
        this.container = document.getElementById('parameters-content');
        this.currentEffect = null;
        this.parser = new CryEngineParameterParser();
        this.parameterElements = new Map(); // Stores widget elements by param name
        this.usedParams = new Set(); // Stores set of params used by renderer
        
        // Expression system (remains the same)
        this.expressions = new Map();
        this.references = new Map();
        this.dependents = new Map();
        this.clipboard = null;
        this.selectedParam = null;
    }

    /**
     * Asynchronously initializes the manager by loading XML definitions.
     * @param {Array<string>} usedParamsList - List of param names used by the renderer.
     */
    async init(usedParamsList = []) {
        console.log('🎛️ Initializing XML-Driven Parameter Manager');
        
        // Store the list of parameters that the renderer simulation uses
        this.usedParams = new Set(usedParamsList);
        console.log(`  Renderer uses ${this.usedParams.size} parameters.`);
        
        await this.parser.loadDefinitions('parameters.xml');
        this.setupExpressionHandlers(); // Keep expression handlers
        this.render();
    }

    /**
     * Renders the parameter UI based on the loaded XML definitions.
     */
    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.parameterElements.clear();

        const parameterGroups = this.parser.getGroups();

        parameterGroups.forEach(group => {
            // Filter out groups with no parameters
            if (!group.parameters || group.parameters.length === 0) {
                return;
            }
            
            const groupEl = this.createParameterGroup(group);
            const content = groupEl.querySelector('.parameter-group-content');

            group.parameters.forEach(param => {
                const paramEl = this.createParameter(param);
                content.appendChild(paramEl);
            });

            this.container.appendChild(groupEl);
        });
    }

    /**
     * Creates the DOM for a parameter group (the collapsible header).
     */
    createParameterGroup(group) {
        const groupEl = document.createElement('div');
        groupEl.className = 'parameter-group';
        if (group.collapsed) {
            groupEl.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'parameter-group-header';
        header.innerHTML = `
            <span class="parameter-group-toggle">▼</span>
            <span class="parameter-group-title">${group.title}</span>
            <span class="parameter-group-badge">${group.parameters.length}</span>
        `;

        header.addEventListener('click', () => {
            groupEl.classList.toggle('collapsed');
        });

        const content = document.createElement('div');
        content.className = 'parameter-group-content';

        groupEl.appendChild(header);
        groupEl.appendChild(content);

        return groupEl;
    }

    /**
     * Creates the DOM for a single parameter row.
     * This is where the Parameter class object would be instantiated.
     * For now, we create the widget directly.
     */
    createParameter(param) {
        const paramEl = document.createElement('div');
        paramEl.className = 'parameter-row';
        paramEl.dataset.paramName = param.name; // Use export name as data-attr

        // --- ADDED: Check if parameter is used by the 2D sim ---
        const isUsed = this.usedParams.has(param.name);
        const unusedIcon = isUsed ? '' : `
            <span class="unused-param-icon" title="This parameter is not used by the 2D simulation preview. It will still be exported.">⚠️</span>
        `;
        // --- END ADDITION ---

        const header = document.createElement('div');
        header.className = 'parameter-header';
        header.innerHTML = `
            <span class="parameter-label">${param.label}${unusedIcon}</span>
            <div class="parameter-controls">
                <div class="parameter-state default" title="Default"></div>
                <button class="param-icon-btn reset-btn" title="Reset to Default">↺</button>
                <button class="param-icon-btn curve-btn" title="Add to Curve">📈</button>
                <button class="param-icon-btn menu-btn" title="More Options">⋮</button>
            </div>
        `;

        paramEl.appendChild(header);

        // --- This is what the Parameter class would do ---
        // Create the widget
        const widget = WidgetFactory.createWidget(param, (value) => {
            // This is the onChange callback
            this.handleValueChange(param.name, value);
        });
        paramEl.appendChild(widget);
        this.parameterElements.set(param.name, widget);
        // --- End Parameter class logic ---


        // --- Setup event listeners for the row ---
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
        
        return paramEl;
    }


    /**
     * Loads an effect's saved data into the UI.
     */
    loadEffect(effectData) {
        this.currentEffect = effectData;
        this.render(); // Re-render to ensure all elements are fresh

        // Load parameter values from effect
        if (effectData.params) {
            setTimeout(() => { // Timeout to allow DOM to update
                Object.entries(effectData.params).forEach(([name, value]) => {
                    // Find the *export name* (key), not the display name
                    const paramDef = this.parser.getParameter(name); 
                    if (paramDef) {
                        this.setParameterValue(paramDef.name, value);
                    } else {
                        // This might be a param from an old file, or the label name
                        // Try finding by label
                        const paramDefByLabel = this.parser.getParameter(name);
                        if (paramDefByLabel) {
                             this.setParameterValue(paramDefByLabel.name, value);
                        } else {
                            console.warn(`Parameter "${name}" from save data not found in XML definitions.`);
                        }
                    }
                });
                console.log('✅ Loaded parameters for', effectData.name);
            }, 100);
        }

        // Load expressions (this system is unchanged)
        this.expressions.clear();
        this.references.clear();
        this.dependents.clear();
        if (effectData.expressions) {
             setTimeout(() => {
                Object.entries(effectData.expressions).forEach(([name, expression]) => {
                    const paramDef = this.parser.getParameter(name);
                    if (paramDef) {
                        this.setExpression(paramDef.name, expression);
                        this.refreshParameterRow(paramDef.name); // Refresh UI
                    }
                });
                console.log('✅ Loaded expressions for', effectData.name);
             }, 100);
        }
    }

    /**
     * Sets the value of a widget in the UI.
     * @param {string} paramName - The *export name* (e.g., "fParticleLifeTime")
     * @param {*} value - The value to set.
     */
    setParameterValue(paramName, value) {
        const widget = this.parameterElements.get(paramName);
        if (!widget) return;
        
        const paramDef = this.parser.getParameter(paramName);

        // Update the appropriate widget
        switch (paramDef.widget) {
            case 'slider':
                const sliderValue = widget.querySelector('.slider-value');
                const sliderTrack = widget.querySelector('.slider-track');
                const sliderInput = widget.querySelector('.slider-input');
                if (sliderValue && sliderTrack && sliderInput) {
                    const min = parseFloat(sliderInput.dataset.min);
                    const max = parseFloat(sliderInput.dataset.max);
                    const step = parseFloat(sliderValue.step);
                    
                    value = Math.max(min, Math.min(max, parseFloat(value)));
                    
                    sliderValue.value = value.toFixed(step >= 1 ? 0 : 2);
                    const percentage = ((value - min) / (max - min)) * 100;
                    sliderTrack.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
                }
                break;
            case 'vector':
                const vectorInputs = widget.querySelectorAll('.vector-input');
                if (vectorInputs.length > 0 && Array.isArray(value)) {
                    vectorInputs.forEach((input, i) => {
                        if (value[i] !== undefined) input.value = value[i];
                    });
                }
                break;
            case 'color':
                const colorValue = widget.querySelector('.color-value');
                const colorSwatch = widget.querySelector('.color-swatch');
                const colorPicker = widget.querySelector('.color-picker');
                if (colorValue) colorValue.value = value;
                if (colorSwatch) colorSwatch.style.background = value;
                if (colorPicker) colorPicker.value = value;
                break;
            case 'dropdown':
                const dropdown = widget.querySelector('.dropdown-select');
                if (dropdown) dropdown.value = value;
                break;
            case 'checkbox':
                const checkbox = widget.querySelector('.checkbox');
                if (checkbox) checkbox.classList.toggle('checked', !!value);
                break;
            case 'text':
                const textInput = widget.querySelector('.text-input-field');
                if (textInput) textInput.value = value;
                break;
        }
    }
    
    /**
     * Resets a parameter to its default value from the XML.
     */
    resetParameter(param) {
        let defaultValue = param.default;
        
        // Convert default types from XML string
        switch (param.type) {
            case 'float':
            case 'int':
                defaultValue = parseFloat(defaultValue);
                break;
            case 'bool':
                defaultValue = (defaultValue === 'true');
                break;
            case 'vec3':
                defaultValue = defaultValue.split(',').map(Number);
                break;
        }
        
        this.setParameterValue(param.name, defaultValue);
        this.clearExpression(param.name);
        this.dispatchParameterChange(param.name, defaultValue);
    }
    

    // --- All methods below this line are for the Expression System ---
    // --- They remain largely unchanged, but now use param.name ---
    
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
            this.dispatchParameterChange(this.selectedParam, this.clipboard.value); // Manually dispatch
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
            this.dispatchParameterChange(paramName, result); // Dispatch change from expression
        } catch (error) {
            console.error('Expression error:', error);
        }
    }

    getParameterValue(paramName) {
        const widget = this.parameterElements.get(paramName);
        if (!widget) return 0;
        
        const paramDef = this.parser.getParameter(paramName);

        // Find and update the appropriate widget
        switch (paramDef.widget) {
            case 'slider':
                return parseFloat(widget.querySelector('.slider-value').value) || 0;
            case 'vector':
                const inputs = widget.querySelectorAll('.vector-input');
                return Array.from(inputs).map(i => parseFloat(i.value) || 0);
            case 'color':
                return widget.querySelector('.color-value').value;
            case 'dropdown':
                return widget.querySelector('.dropdown-select').value;
            case 'checkbox':
                return widget.querySelector('.checkbox').classList.contains('checked');
            case 'text':
                return widget.querySelector('.text-input-field').value;
        }
        return 0;
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

    refreshParameterRow(paramName) {
        const row = this.container.querySelector(`[data-param-name="${paramName}"]`);
        if (!row) return;

        const hasExpression = this.expressions.has(paramName);
        const isReferenced = this.dependents.has(paramName);
        
        row.classList.toggle('expression', hasExpression);
        row.classList.toggle('dependency', isReferenced);

        const label = row.querySelector('.parameter-label');
        if (label) {
            const paramDef = this.parser.getParameter(paramName);
            const name = paramDef ? paramDef.label : paramName; // Use display name
            
            // --- ADDED: Check if parameter is used by the 2D sim ---
            const isUsed = this.usedParams.has(paramName);
            const unusedIcon = isUsed ? '' : `
                <span class="unused-param-icon" title="This parameter is not used by the 2D simulation preview. It will still be exported.">⚠️</span>
            `;
            // --- END ADDITION ---

            label.innerHTML = `
                ${name}${unusedIcon}
                ${hasExpression ? '<span class="expr-indicator" title="Has expression">ƒx</span>' : ''}
                ${isReferenced ? '<span class="ref-indicator" title="Referenced">🔗</span>' : ''}
            `;
        }
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
        // ** UPDATED: Send the internal name (e.g. fParticleLifeTime) **
        console.log('📤 Parameter changed:', name, '=', value);
        document.dispatchEvent(new CustomEvent('parameterChanged', {
            detail: { 
                name: name, // Internal name
                value: value,
                label: this.parser.getParameter(name)?.label || name // Display name (for info)
            }
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
