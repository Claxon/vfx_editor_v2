// VFX Editor v2.0 - Main Application with Export Support
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
        
        this.selectedEffect = null;
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
        await this.parameterManager.init(); 
        
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
            this.selectEffect(e.detail);
        });

        // Parameter changes
        document.addEventListener('parameterChanged', (e) => {
            this.onParameterChanged(e.detail);
        });

        // Curve changes
        document.addEventListener('curveChanged', (e) => {
            this.onCurveChanged(e.detail);
        });
        
        // Timeline changes
        document.addEventListener('timelineChanged', (e) => {
            this.onTimelineChanged(e.detail);
        });

        // Menu actions
        document.addEventListener('menuAction', (e) => {
            this.handleMenuAction(e.detail);
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

    selectEffect(effectData) {
        this.selectedEffect = effectData;
        console.log('Selected effect:', effectData.name);
        
        // Update status bar
        this.updateStatusBar(effectData);
        
        // Load effect parameters
        this.parameterManager.loadEffect(effectData);
        
        // Load curves
        this.curveEditor.loadEffectCurves(effectData);
        
        // Update timeline
        this.timelineManager.loadEffect(effectData);
        
        // Update particle preview
        this.particleRenderer.loadEffect(effectData);
    }

    updateStatusBar(effectData) {
        const statusValue = document.getElementById('selected-effect');
        if (statusValue) {
            statusValue.textContent = effectData.name;
        }
    }

    onParameterChanged(data) {
        console.log('Parameter changed:', data);
        // Update particle preview with new parameter
        this.particleRenderer.updateParameter(data);
        
        // Store in current effect data
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
        
        // Store curve data
        if (this.selectedEffect) {
            if (!this.selectedEffect.curves) {
                this.selectedEffect.curves = {};
            }
            this.selectedEffect.curves[data.curve.toLowerCase()] = data.points;
        }
        
        // Update parameters to reflect curve changes
        this.parameterManager.updateFromCurve(data);
        
        // Update particle preview
        this.particleRenderer.updateFromCurve(data);
    }
    
    onTimelineChanged(data) {
        console.log('Timeline changed:', data);
        
        // Store timeline data
        if (this.selectedEffect) {
            this.selectedEffect.timeline = data;
        }
        
        // Update particle renderer
        this.particleRenderer.updateFromTimeline(data);
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
        if (effects.length === 0 && (this.selectedEffect || this.particleRenderer.currentEffect)) {
            console.log('  No library effects found, capturing current effect from particle renderer...');
            const currentState = this.particleRenderer.exportState();
            
            // Get expressions from parameter manager
            const expressions = this.parameterManager.exportExpressions();
            
            const effectData = {
                name: currentState.effectName || this.selectedEffect?.name || 'Current_Effect',
                effectName: currentState.effectName,
                params: { ...currentState.params },
                expressions: expressions, // Add expressions
                curves: { ...currentState.curves },
                timeline: { ...currentState.timeline },
                children: []
            };
            
            console.log('  ✓ Captured effect:', effectData.name);
            effects.push(effectData);
        }
        
        console.log(`  Total effects to export: ${effects.length}`);
        return effects;
    }
    
    traverseLibraryItems(items, effects) {
        items.forEach(item => {
            if (item.type === 'effect') {
                console.log('    Found effect:', item.name);
                
                // Create effect data with default parameters
                // This is now less relevant as params are loaded on-demand,
                // but good for a base structure.
                const effectData = {
                    name: item.name,
                    params: {}, // Start with empty params
                    expressions: {},
                    curves: {},
                    timeline: { duration: 5, tracks: [] },
                    children: []
                };
                
                // If this is the currently selected effect, use live data
                if (this.selectedEffect?.name === item.name) {
                    console.log('      → Using live data from particle renderer and param manager');
                    const currentState = this.particleRenderer.exportState();
                    const expressions = this.parameterManager.exportExpressions();
                    
                    effectData.params = { ...currentState.params };
                    effectData.expressions = expressions;
                    effectData.curves = { ...currentState.curves };
                    effectData.timeline = { ...currentState.timeline };
                }
                
                effects.push(effectData);
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
                                { name: 'Thruster_Main', type: 'effect' },
                                { name: 'Thruster_Secondary', type: 'effect' },
                                { name: 'Thruster_Boost', type: 'effect' }
                            ]
                        },
                        {
                            name: 'Maneuvering',
                            type: 'folder',
                            items: [
                                { name: 'Maneuver_Front', type: 'effect' },
                                { name: 'Maneuver_Back', type: 'effect' }
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
                                { name: 'Impact_Plasma', type: 'effect' },
                                { name: 'Impact_Laser', type: 'effect' }
                            ]
                        }
                    ]
                },
                {
                    name: 'Environment/Weather.vfxlib',
                    items: [
                        { name: 'Rain_Heavy', type: 'effect' },
                        { name: 'Snow_Light', type: 'effect' },
                        { name: 'Fog_Dense', type: 'effect' }
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

