// VFX Editor v2.0 - Main Application with Export Support
// *** UPDATED to support child effects and full hierarchy simulation ***

import { LibraryManager } from './libraryManager.js';
import { ParameterManager } from './parameterManager.js';
import { CurveEditor } from './curveEditor.js';
import { TimelineManager } from './timelineManager.js';
import { ParticleRenderer } from './particleRenderer.js';
import { CryEngineExporter } from './cryEngineExporter.js';
import menuManager from './menus.js';
import checkpointManager from './checkpoints.js';
import keyboardShortcuts from './keyboardShortcuts.js';
import resizeManager from './resizeManager.js';
import { WidgetFactory } from './WidgetFactory.js'; // Import the new factory

class VFXEditor {
    constructor() {
        this.libraryManager = new LibraryManager();
        this.parameterManager = new ParameterManager();
        this.curveEditor = new CurveEditor();
        this.timelineManager = new TimelineManager();
        this.particleRenderer = new ParticleRenderer();
        this.exporter = new CryEngineExporter(); // Create instance
        
        this.selectedEffect = null; // This is the effect currently being EDITED
        this.rootEffect = null; // This is the root of the hierarchy being SIMULATED
        this.currentLibrary = null;
        this.effectsData = [];
        
        // Don't call init() here anymore, it will be called externally
    }

    async init() {
        console.log('🎨 Initializing VFX Editor v2.0 with CryEngine 3 Export...');
        
        this.initTabSwitching();
        
        // Initialize all managers
        this.libraryManager.init();
        
        // *** MODIFICATION: Await the async init of ParameterManager ***
        // *** Pass the list of used parameters from the renderer to the param manager ***
        await this.parameterManager.init(ParticleRenderer.USED_PARAMS); 
        
        // *** FIX: Await the new async init of CryEngineExporter ***
        await this.exporter.init();
        
        this.curveEditor.init(this);
        this.timelineManager.init();
        this.particleRenderer.init();
        
        // Setup save/export functionality
        this.setupExportHandlers();
        
        // Load sample data
        this.loadSampleData();
        
        // Set up event listeners
        this.setupEventListeners();

        // Initialize expressions panel
        this.initExpressionsPanel();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('✅ VFX Editor initialized successfully');
        console.log('💡 Press Ctrl+S to save/export particle library');
        console.log('💡 Press 1-4 to switch between checkpoints A-D');
        console.log('💡 Right-click checkpoint buttons to save current state');
    }

    initTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const panels = {
            'parameters': document.getElementById('parameters-tab'),
            'curves': document.getElementById('curves-tab'),
            'expressions': document.getElementById('expressions-tab')
        };

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons and panels
                tabButtons.forEach(b => b.classList.remove('active'));
                Object.values(panels).forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked button and corresponding panel
                btn.classList.add('active');
                const tabName = btn.dataset.tab;
                panels[tabName].classList.add('active');
            });
        });
    }

    initExpressionsPanel() {
        const expressionsContent = document.getElementById('expressions-content');
        if (!expressionsContent) return;

        // Sample expressions
        const expressions = [
            {
                name: 'Speed-Based Lifetime',
                code: 'lifetime = baseLifetime / (speed * 0.1)',
                help: 'Faster particles have shorter lifetimes'
            },
            {
                name: 'Size-Based Opacity',
                code: 'opacity = 1 - (size / maxSize) * 0.5',
                help: 'Larger particles are more transparent'
            },
            {
                name: 'Velocity Color Tint',
                code: 'color.r = clamp(velocity / 100, 0, 1)',
                help: 'Red channel based on particle velocity'
            }
        ];

        expressions.forEach(expr => {
            const item = document.createElement('div');
            item.className = 'expression-item';
            item.innerHTML = `
                <div class="expression-header">
                    <span class="expression-name">${expr.name}</span>
                    <div class="expression-actions">
                        <button class="param-icon-btn" title="Enable/Disable">✓</button>
                        <button class="param-icon-btn" title="Edit">✏️</button>
                        <button class="param-icon-btn" title="Delete">🗑️</button>
                    </div>
                </div>
                <textarea class="expression-code" spellcheck="false">${expr.code}</textarea>
                <div class="expression-help">${expr.help}</div>
            `;
            expressionsContent.appendChild(item);
        });

        // Add new expression button
        const newExprBtn = document.createElement('button');
        newExprBtn.className = 'new-expression-btn';
        newExprBtn.innerHTML = '<span>➕</span> Add New Expression';
        newExprBtn.addEventListener('click', () => {
            this.addNewExpression();
        });
        expressionsContent.appendChild(newExprBtn);
    }

    addNewExpression() {
        const expressionsContent = document.getElementById('expressions-content');
        if (!expressionsContent) return;

        const item = document.createElement('div');
        item.className = 'expression-item';
        item.innerHTML = `
            <div class="expression-header">
                <span class="expression-name">New Expression</span>
                <div class="expression-actions">
                    <button class="param-icon-btn" title="Enable/Disable">✓</button>
                    <button class="param-icon-btn" title="Edit">✏️</button>
                    <button class="param-icon-btn" title="Delete">🗑️</button>
                </div>
            </div>
            <textarea class="expression-code" spellcheck="false" placeholder="Enter expression here...
Example: size = baseSize * (1 - age / lifetime)"></textarea>
        `;

        const lastItem = expressionsContent.lastElementChild;
        expressionsContent.insertBefore(item, lastItem);

        // Focus the textarea
        item.querySelector('.expression-code')?.focus();
    }
    
    setupExportHandlers() {
        // Find the existing save button in the menu bar
        const saveBtn = document.querySelector('.menu-actions button[title="Save (Ctrl+S)"]');
        
        if (saveBtn) {
            console.log('💾 Save button found, attaching export handler...');
            saveBtn.addEventListener('click', () => {
                console.log('💾 Save button clicked!');
                this.exportLibrary();
            });
        } else {
            console.error('❌ Save button not found in menu-actions!');
        }
        
        // Also attach to File menu "Save" option
        const fileSaveOption = document.querySelector('.menu-option[data-action="save"]');
        if (fileSaveOption) {
            console.log('💾 File menu Save option found, attaching handler...');
            fileSaveOption.addEventListener('click', () => {
                console.log('💾 File > Save clicked!');
                this.exportLibrary();
            });
        }
        
        // Also attach to File menu "Export Effect" option
        const exportOption = document.querySelector('.menu-option[data-action="export"]');
        if (exportOption) {
            console.log('📦 Export option found, attaching handler...');
            exportOption.addEventListener('click', () => {
                console.log('📦 File > Export Effect clicked!');
                this.showExportPreview();
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S or Cmd+S - Save/Export
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.exportLibrary();
            }
            
            // Ctrl+E - Export preview
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.showExportPreview();
            }
        });
    }

    setupEventListeners() {
        // Library selection
        document.addEventListener('effectSelected', (e) => {
            this.selectEffect(e.detail.effectData, e.detail.rootEffectData);
        });

        // Parameter changes
        document.addEventListener('parameterChanged', (e) => {
            this.onParameterChanged(e.detail);
        });

        // Curve changes
        document.addEventListener('curveChanged', (e) => {
            this.onCurveChanged(e.detail);
        });
        
        // Timeline changes from the timeline manager
        document.addEventListener('timelineTrackChanged', (e) => {
            this.onTimelineChanged(e.detail);
        });

        // Menu actions
        document.addEventListener('menuAction', (e) => {
            this.handleMenuAction(e.detail);
        });

        // --- New listeners for hierarchy controls ---
        document.addEventListener('effectVisibilityChanged', (e) => {
            this.onEffectVisibilityChanged(e.detail.name, e.detail.isVisible);
        });

        document.addEventListener('effectLockChanged', (e) => {
            this.onEffectLockChanged(e.detail.name, e.detail.isLocked);
        });
    }

    handleMenuAction(action) {
        console.log('Handling menu action:', action);
        
        switch(action) {
            case 'save':
                this.exportLibrary();
                break;
            case 'export':
                this.exportLibrary();
                break;
            case 'undo':
                this.showNotification('Undo', 'Action undone');
                break;
            case 'redo':
                this.showNotification('Redo', 'Action redone');
                break;
        }
    }

    /**
     * Finds an effect by name within a hierarchy.
     * @param {object} root - The root effect to start searching from.
     * @param {string} name - The name of the effect to find.
     * @returns {object|null} The found effect object or null.
     */
    findEffectInHierarchy(root, name) {
        if (!root) return null;
        if (root.name === name) return root;
        if (root.items) {
            for (const child of root.items) {
                const found = this.findEffectInHierarchy(child, name);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Called when an effect is clicked in the library.
     * @param {object} effectData - The data for the specific effect that was clicked.
     * @param {object} rootEffectData - The data for the root parent of the clicked effect.
     */
    selectEffect(effectData, rootEffectData) {
        // The effect being edited
        this.selectedEffect = effectData;
        // The root effect for simulation
        this.rootEffect = rootEffectData;

        console.log('Selected effect (for editing):', effectData.name);
        console.log('Root effect (for simulation):', rootEffectData.name);
        
        // Update status bar
        this.updateStatusBar(effectData);
        
        // Load the *clicked* effect into parameters and curves for editing
        this.parameterManager.loadEffect(effectData);
        this.curveEditor.loadEffectCurves(effectData);
        
        // Load the *entire hierarchy* into the timeline and renderer for simulation
        this.timelineManager.loadEffectHierarchy(this.rootEffect);
        this.particleRenderer.loadEffectHierarchy(this.rootEffect);
    }

    updateStatusBar(effectData) {
        const statusValue = document.getElementById('selected-effect');
        if (statusValue) {
            statusValue.textContent = effectData.name;
        }
    }

    onParameterChanged(data) {
        // *** UPDATED: data.name is now the internal name (e.g., fParticleLifeTime) ***
        console.log('Parameter changed:', data.name, data.value);
        
        // Update particle preview with new parameter
        // This updates the *currently selected* effect in the renderer
        this.particleRenderer.updateEffectParameter(this.selectedEffect.name, data.name, data.value);
        
        // Store in current effect data (the one being edited)
        if (this.selectedEffect) {
            if (!this.selectedEffect.params) {
                this.selectedEffect.params = {};
            }
            this.selectedEffect.params[data.name] = data.value;
        }
        
        // Update curves if parameter has curve
        if (data.curve) {
            this.curveEditor.updateCurve(data);
        }
    }

    onCurveChanged(data) {
        console.log('Curve changed:', data);
        
        // Store curve data in the effect being edited
        if (this.selectedEffect) {
            if (!this.selectedEffect.curves) {
                this.selectedEffect.curves = {};
            }
            this.selectedEffect.curves[data.curve.toLowerCase()] = data.points;
        }
        
        // Update parameters to reflect curve changes
        this.parameterManager.updateFromCurve(data);
        
        // Update particle preview
        this.particleRenderer.updateEffectCurve(this.selectedEffect.name, data.curve.toLowerCase(), data.points);
    }
    
    onTimelineChanged(data) {
        console.log('Timeline changed:', data.effectId, 'Start:', data.start, 'Duration:', data.duration);
        
        // Find the effect in our master hierarchy and update it
        const effectToUpdate = this.findEffectInHierarchy(this.rootEffect, data.effectId);
        if (effectToUpdate) {
            if (!effectToUpdate.timeline) effectToUpdate.timeline = {};
            effectToUpdate.timeline.start = data.start;
            effectToUpdate.timeline.duration = data.duration;
        }
        
        // Update particle renderer
        this.particleRenderer.updateEffectTimeline(data.effectId, data.start, data.duration);
    }

    onEffectVisibilityChanged(effectName, isVisible) {
        console.log(`Visibility changed: ${effectName} is ${isVisible ? 'visible' : 'hidden'}`);
        const effectToUpdate = this.findEffectInHierarchy(this.rootEffect, effectName);
        if (effectToUpdate) {
            effectToUpdate.isVisible = isVisible;
        }
        this.particleRenderer.updateEffectVisibility(effectName, isVisible);
        this.timelineManager.updateEffectProperties(effectName, { isVisible });
    }

    onEffectLockChanged(effectName, isLocked) {
        console.log(`Lock changed: ${effectName} is ${isLocked ? 'locked' : 'unlocked'}`);
        const effectToUpdate = this.findEffectInHierarchy(this.rootEffect, effectName);
        if (effectToUpdate) {
            effectToUpdate.isLocked = isLocked;
        }
        
        // Lock/unlock timeline track
        this.timelineManager.updateEffectProperties(effectName, { isLocked });
        
        // If the *currently selected* effect is the one being locked, lock the param editor
        if (this.selectedEffect && this.selectedEffect.name === effectName) {
            this.parameterManager.setLocked(isLocked);
        }
    }
    
    async exportLibrary() {
        console.log('💾 Starting CryEngine 3 export...');
        
        // Gather all effect data from library
        const effectsToExport = this.gatherEffectData();
        
        if (effectsToExport.length === 0) {
            this.showNotification('Export Error', 'No effects to export', 'error');
            return;
        }
        
        // Validate effects
        let hasErrors = false;
        effectsToExport.forEach(effect => {
            const errors = this.exporter.validateEffect(effect);
            if (errors.length > 0) {
                console.error('❌ Validation errors for', effect.name, ':', errors);
                hasErrors = true;
            }
        });
        
        if (hasErrors) {
            this.showNotification('Export Warning', 'Some effects have validation warnings. Check console.', 'warning');
            // Continue with export anyway
        }
        
        // Get library name
        const libraryName = this.currentLibrary?.name || 'Exported_Effects';
        const cleanName = libraryName.replace(/\.vfxlib$/, '').replace(/[\/]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
        const defaultFilename = cleanName + '.xml';
        
        // Prompt for filename
        const filename = await this.promptForFilename(defaultFilename);
        
        if (!filename) {
            console.log('Export cancelled by user');
            return;
        }
        
        // Generate CryEngine XML
        console.log('🔨 Generating CryEngine 3 XML...');
        const xmlContent = this.exporter.exportLibrary(
            { name: cleanName },
            effectsToExport
        );
        
        // Create download
        this.downloadFile(xmlContent, filename, 'text/xml');
        
        console.log('✅ Export complete!');
        this.showNotification('Export Success', `Exported ${effectsToExport.length} effect(s) to ${filename}`, 'success');
    }
    
    gatherEffectData() {
        console.log('📋 Gathering effect data for export...');
        const effects = [];
        
        // Get ALL effects from the library tree
        if (this.currentLibrary && this.currentLibrary.items) {
            console.log('  Scanning library:', this.currentLibrary.name);
            this.traverseLibraryItems(this.currentLibrary.items, effects);
        }
        
        // If no effects found in library, export current selected effect
        if (effects.length === 0 && (this.rootEffect)) {
            console.log('  No library effects found, capturing current root effect hierarchy...');
            
            // We need to traverse the rootEffect hierarchy
            const traverseAndAdd = (effect) => {
                effects.push(effect);
                if (effect.items) {
                    effect.items.forEach(traverseAndAdd);
                }
            };
            traverseAndAdd(this.rootEffect);
        }
        
        console.log(`  Total effects to export: ${effects.length}`);
        return effects;
    }
    
    traverseLibraryItems(items, effects) {
        items.forEach(item => {
            if (item.type === 'effect') {
                console.log('    Found effect:', item.name);
                
                // *** FIX: Read existing data from the item object ***
                // This ensures that changes made to effects (even if not
                // currently selected) are preserved for export.
                const effectData = {
                    name: item.name,
                    params: item.params || {}, // Load existing params
                    expressions: item.expressions || {}, // Load existing expressions
                    curves: item.curves || {}, // Load existing curves
                    timeline: item.timeline || { start: 0, duration: 5.0 }, // Load existing timeline
                    children: item.items || [], // Use 'items' for children
                    isVisible: item.isVisible !== false,
                    isLocked: item.isLocked || false
                };
                
                // If this is the currently selected *root* effect, we need to
                // replace this item with the in-memory version.
                if (this.rootEffect && this.rootEffect.name === item.name) {
                    // This is complex. For now, we assume the library data is
                    // what we want to export, and live data is just for simulation.
                    // This part needs refinement if live data should *always*
                    // overwrite the library on export.
                    
                    // Let's assume the in-memory `rootEffect` is the source of truth
                    // if it's the one being exported.
                    
                    // This logic is tricky. Let's simplify:
                    // The `gatherEffectData` will just pull from the library structure.
                    // The live, in-memory `this.rootEffect` (which is a copy)
                    // is what's being modified. We need to update the *original*
                    // library data.
                    
                    // `this.selectedEffect` and `this.rootEffect` are references to
                    // objects *from* the library data. So, modifications *should*
                    // be persistent.
                    
                    effects.push(effectData);
                    if (item.items) {
                        this.traverseLibraryItems(item.items, effects);
                    }

                } else {
                     effects.push(effectData);
                    if (item.items) {
                        this.traverseLibraryItems(item.items, effects);
                    }
                }

            } else if (item.type === 'folder' && item.items) {
                // Recursively traverse folders
                this.traverseLibraryItems(item.items, effects);
            }
        });
    }
    
    showExportPreview() {
        const effects = this.gatherEffectData();
        const preview = this.exporter.generatePreview(effects);
        
        // Create modal for preview
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Export Preview</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <pre style="background: var(--bg-tertiary); padding: 16px; border-radius: 4px; overflow: auto; max-height: 400px;">${preview}</pre>
                    <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
                        <button class="checkpoint-action-btn">Cancel</button>
                        <button class="checkpoint-action-btn primary" id="export-confirm">Export</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup handlers
        modal.querySelector('.modal-close')?.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.querySelector('#export-confirm')?.addEventListener('click', () => {
            this.exportLibrary();
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    promptForFilename(defaultName) {
        // Show modal dialog to confirm/edit filename
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.zIndex = '10000';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>💾 Export Particle Library</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-weight: 500;">Filename:</label>
                            <input type="text" id="export-filename" value="${defaultName}" 
                                   style="width: 100%; padding: 10px; background: var(--bg-tertiary); 
                                          border: 1px solid var(--border-color); border-radius: 4px; 
                                          color: var(--text-primary); font-size: 14px;">
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
                            The file will be downloaded to your browser's default download location.
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="checkpoint-action-btn" id="export-cancel">Cancel</button>
                            <button class="checkpoint-action-btn primary" id="export-confirm">Export</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const input = modal.querySelector('#export-filename');
            input.focus();
            input.select();
            
            // Close handlers
            const close = (filename) => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                resolve(filename);
            };
            
            modal.querySelector('.modal-close')?.addEventListener('click', () => close(null));
            modal.querySelector('#export-cancel')?.addEventListener('click', () => close(null));
            modal.querySelector('#export-confirm')?.addEventListener('click', () => {
                const filename = input.value.trim();
                if (filename) {
                    close(filename.endsWith('.xml') ? filename : filename + '.xml');
                }
            });
            
            // Enter to confirm
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const filename = input.value.trim();
                    if (filename) {
                        close(filename.endsWith('.xml') ? filename : filename + '.xml');
                    }
                } else if (e.key === 'Escape') {
                    close(null);
                }
            });
        });
    }

    loadSampleData() {
        // This would normally load from a file or API
        const sampleData = {
            libraries: [
                {
                    name: 'Ships/Thrusters.vfxlib',
                    items: [
                        {
                            name: 'Main Thrusters',
                            type: 'folder',
                            items: [
                                { 
                                    name: 'Thruster_Main', 
                                    type: 'effect', 
                                    params: { 'fCount': 150, 'fParticleLifeTime': 2.0, 'fSize': 1.2, 'cColor': '#ff8833' }, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 0, duration: 5.0 },
                                    items: [
                                        { 
                                            name: 'Thruster_Heat_Distortion', 
                                            type: 'effect', 
                                            params: { 'fCount': 10, 'fParticleLifeTime': 1.0, 'fSize': 2.0, 'fAlpha': 0.1, 'eBlendType': 'AlphaBased' }, 
                                            curves: {}, 
                                            expressions: {},
                                            timeline: { start: 0, duration: 5.0 },
                                            items: []
                                        },
                                        { 
                                            name: 'Thruster_Sparks', 
                                            type: 'effect', 
                                            params: { 'fCount': 20, 'fParticleLifeTime': 0.5, 'fSize': 0.2, 'cColor': '#ffff99', 'fSpeed': 15.0, 'fGravityScale': 0.5 }, 
                                            curves: {}, 
                                            expressions: {},
                                            timeline: { start: 0.2, duration: 4.8 },
                                            items: []
                                        }
                                    ]
                                },
                                { 
                                    name: 'Thruster_Secondary', 
                                    type: 'effect', 
                                    params: { 'fCount': 50 }, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 0, duration: 5.0 },
                                    items: []
                                },
                                { 
                                    name: 'Thruster_Boost', 
                                    type: 'effect', 
                                    params: { 'fCount': 500, 'fSpeed': 20.0, 'cColor': '#66ccff' }, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 1.0, duration: 2.5 },
                                    items: []
                                }
                            ]
                        },
                        {
                            name: 'Maneuvering',
                            type: 'folder',
                            items: [
                                { 
                                    name: 'Maneuver_Front', 
                                    type: 'effect', 
                                    params: {}, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 0, duration: 5.0 },
                                    items: [] 
                                },
                                { 
                                    name: 'Maneuver_Back', 
                                    type: 'effect', 
                                    params: {}, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 0, duration: 5.0 },
                                    items: []
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'Weapons/Impacts.vfxlib',
                    items: [
                        {
                            name: 'Energy Impacts',
                            type: 'folder',
                            items: [
                                { 
                                    name: 'Impact_Plasma', 
                                    type: 'effect', 
                                    params: {}, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 0, duration: 5.0 },
                                    items: [] 
                                },
                                { 
                                    name: 'Impact_Laser', 
                                    type: 'effect', 
                                    params: {}, 
                                    curves: {}, 
                                    expressions: {},
                                    timeline: { start: 0, duration: 5.0 },
                                    items: []
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'Environment/Weather.vfxlib',
                    items: [
                        { 
                            name: 'Rain_Heavy', 
                            type: 'effect', 
                            params: {}, 
                            curves: {}, 
                            expressions: {},
                            timeline: { start: 0, duration: 5.0 },
                            items: [] 
                        },
                        { 
                            name: 'Snow_Light', 
                            type: 'effect', 
                            params: {}, 
                            curves: {}, 
                            expressions: {},
                            timeline: { start: 0, duration: 5.0 },
                            items: [] 
                        },
                        { 
                            name: 'Fog_Dense', 
                            type: 'effect', 
                            params: {}, 
                            curves: {}, 
                            expressions: {},
                            timeline: { start: 0, duration: 5.0 },
                            items: [] 
                        }
                    ]
                }
            ]
        };
        
        this.currentLibrary = sampleData.libraries[0];
        this.libraryManager.loadLibraries(sampleData.libraries);
    }

    showNotification(title, message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast-notification show';
        
        // Add type-specific styling
        const iconMap = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-title">${iconMap[type] || ''} ${title}</div>
            <div class="toast-message">${message}</div>
        `;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the editor when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.vfxEditor = new VFXEditor();
    await window.vfxEditor.init(); // Call the new async init
});
