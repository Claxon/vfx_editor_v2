// Checkpoint System - A/B Testing and State Management
export class CheckpointManager {
    constructor() {
        // Initialize with only slots 1 and 2
        this.checkpoints = {
            '1': null,
            '2': null
        };
        this.maxCheckpoints = 10;
        this.currentCheckpoint = null;
        this.parameterState = null;
        this.init();
    }

    init() {
        console.log('📌 Initializing Checkpoint Manager');
        this.setupUI();
        this.setupKeyboardShortcuts();
    }

    setupUI() {
        // Create checkpoint button
        const createBtn = document.getElementById('create-checkpoint');
        createBtn?.addEventListener('click', () => this.showCheckpointDialog());

        // Quick checkpoint buttons
        const quickBtns = document.querySelectorAll('.checkpoint-quick-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const checkpoint = btn.dataset.checkpoint;
                
                // Ctrl+Click to SAVE, regular click to LOAD
                if (e.ctrlKey) {
                    console.log('Ctrl+Click detected - Creating checkpoint:', checkpoint);
                    this.createCheckpoint(checkpoint);
                } else {
                    if (btn.classList.contains('has-data')) {
                        console.log('Click detected - Loading checkpoint:', checkpoint);
                        this.loadCheckpoint(checkpoint);
                    } else {
                        console.log('Empty slot clicked - Creating checkpoint:', checkpoint);
                        this.createCheckpoint(checkpoint);
                    }
                }
            });

            // Right-click to always create/overwrite
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const checkpoint = btn.dataset.checkpoint;
                console.log('Right-click detected - Creating checkpoint:', checkpoint);
                this.createCheckpoint(checkpoint);
            });
        });

        // Manage checkpoints button
        const manageBtn = document.getElementById('manage-checkpoints');
        manageBtn?.addEventListener('click', () => this.openManager());

        // Listen for checkpoint manager open event
        document.addEventListener('openCheckpointManager', () => this.openManager());
    }

    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if typing in an input field
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            )) {
                return;
            }

            // Ctrl+Shift+C to create checkpoint dialog (keep existing)
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                console.log('Ctrl+Shift+C detected - creating checkpoint dialog');
                this.showCheckpointDialog();
                return;
            }

            // Ctrl+Shift+1 through Ctrl+Shift+9 and Ctrl+Shift+0 to CREATE checkpoints
            if (e.ctrlKey && e.shiftKey && !e.altKey) {
                const key = e.key;
                
                // Check for digit keys (1-9 and 0)
                if (/^[0-9]$/.test(key)) {
                    e.preventDefault();
                    const slot = key === '0' ? '10' : key;
                    
                    console.log('🔴 Ctrl+Shift+' + key + ' detected - Creating checkpoint -> slot:', slot);
                    this.createCheckpoint(slot);
                    return;
                }
            }

            // Number keys 1-9 and 0 to LOAD checkpoints (without modifiers)
            if (!e.ctrlKey && !e.shiftKey && !e.altKey) {
                const key = e.key;
                
                // Check for digit keys (1-9 and 0)
                if (/^[0-9]$/.test(key)) {
                    e.preventDefault();
                    const slot = key === '0' ? '10' : key;
                    
                    console.log('🔵 Key ' + key + ' detected - Loading checkpoint -> slot:', slot);
                    if (this.checkpoints[slot]) {
                        this.loadCheckpoint(slot);
                    } else {
                        console.log('⚠️ Checkpoint ' + slot + ' is empty');
                    }
                }
            }
        });
    }

    showCheckpointDialog() {
        const availableSlots = Object.keys(this.checkpoints).filter(k => !this.checkpoints[k]);
        
        if (availableSlots.length === 0) {
            this.showMessage('All checkpoint slots are full. Choose a slot to overwrite or delete one first.');
            this.openManager();
            return;
        }

        const firstAvailable = availableSlots[0];
        this.createCheckpoint(firstAvailable);
    }

    createCheckpoint(slot) {
        // Capture current parameter state
        const state = this.captureState();
        
        this.checkpoints[slot] = {
            name: `Checkpoint ${slot}`,
            slot: slot,
            timestamp: new Date(),
            state: state,
            description: `Parameters snapshot at ${new Date().toLocaleTimeString()}`
        };

        this.updateUI();
        this.showMessage(`Checkpoint ${slot} created!`, 'success');
        
        console.log('Checkpoint created:', slot, this.checkpoints[slot]);
    }

    loadCheckpoint(slot) {
        const checkpoint = this.checkpoints[slot];
        if (!checkpoint) {
            this.showMessage(`Checkpoint ${slot} is empty`, 'warning');
            return;
        }

        // Apply the checkpoint state
        this.applyState(checkpoint.state);
        this.currentCheckpoint = slot;
        
        this.updateUI();
        this.showMessage(`Loaded Checkpoint ${slot}`, 'success');
        
        // Update status bar
        const statusEl = document.getElementById('current-checkpoint');
        if (statusEl) {
            statusEl.textContent = `Checkpoint ${slot}`;
        }

        console.log('Checkpoint loaded:', slot);
    }

    deleteCheckpoint(slot) {
        if (!this.checkpoints[slot]) return;
        
        this.checkpoints[slot] = null;
        
        if (this.currentCheckpoint === slot) {
            this.currentCheckpoint = null;
            const statusEl = document.getElementById('current-checkpoint');
            if (statusEl) {
                statusEl.textContent = 'None';
            }
        }
        
        this.updateUI();
        this.showMessage(`Checkpoint ${slot} deleted`, 'info');
    }

    captureState() {
        // Capture all parameter values from the parameter manager
        const state = {
            parameters: {},
            metadata: {},
            timestamp: Date.now()
        };

        // Capture ALL parameter rows
        document.querySelectorAll('.parameter-row').forEach(paramRow => {
            const paramName = paramRow.querySelector('.parameter-label')?.textContent;
            if (!paramName) return;

            // Slider values
            const sliderValue = paramRow.querySelector('.slider-value');
            if (sliderValue) {
                const sliderInput = paramRow.querySelector('.slider-input');
                state.parameters[paramName] = {
                    type: 'slider',
                    value: parseFloat(sliderValue.value) || 0,
                    min: parseFloat(sliderInput?.dataset.min) || 0,
                    max: parseFloat(sliderInput?.dataset.max) || 100
                };
                return;
            }

            // Vector values
            const vectorInputs = paramRow.querySelectorAll('.vector-input');
            if (vectorInputs.length > 0) {
                const vectorLabels = paramRow.querySelectorAll('.vector-label');
                const vectorValue = {};
                vectorInputs.forEach((input, i) => {
                    const label = vectorLabels[i]?.textContent || `comp${i}`;
                    vectorValue[label] = parseFloat(input.value) || 0;
                });
                state.parameters[paramName] = {
                    type: 'vector',
                    value: vectorValue
                };
                return;
            }

            // Color values
            const colorValue = paramRow.querySelector('.color-value');
            if (colorValue) {
                state.parameters[paramName] = {
                    type: 'color',
                    value: colorValue.value
                };
                return;
            }

            // Dropdown values
            const dropdownBtn = paramRow.querySelector('.dropdown-btn');
            if (dropdownBtn) {
                state.parameters[paramName] = {
                    type: 'dropdown',
                    value: dropdownBtn.textContent.trim()
                };
                return;
            }

            // Checkbox states
            const checkbox = paramRow.querySelector('.checkbox');
            if (checkbox) {
                state.parameters[paramName] = {
                    type: 'checkbox',
                    value: checkbox.classList.contains('checked')
                };
                return;
            }
        });

        console.log('Captured state:', state);
        return state;
    }

    applyState(state) {
        if (!state) return;

        console.log('Applying state:', state);

        // Apply parameter values
        Object.entries(state.parameters).forEach(([paramName, paramData]) => {
            // Find parameter row
            const paramRows = Array.from(document.querySelectorAll('.parameter-row'));
            const paramRow = paramRows.find(row => {
                const label = row.querySelector('.parameter-label')?.textContent;
                return label === paramName;
            });

            if (!paramRow) {
                console.log('Parameter row not found for:', paramName);
                return;
            }

            // Handle different parameter types based on stored type
            const type = paramData.type || 'unknown';
            
            if (type === 'slider') {
                const sliderValue = paramRow.querySelector('.slider-value');
                const sliderTrack = paramRow.querySelector('.slider-track');
                const sliderInput = paramRow.querySelector('.slider-input');
                
                if (sliderValue && sliderInput) {
                    const value = paramData.value;
                    const min = paramData.min || parseFloat(sliderInput.dataset.min) || 0;
                    const max = paramData.max || parseFloat(sliderInput.dataset.max) || 100;
                    
                    sliderValue.value = value;
                    
                    // Calculate correct percentage using actual range
                    const percentage = ((value - min) / (max - min)) * 100;
                    
                    if (sliderTrack) {
                        sliderTrack.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
                    }
                    
                    console.log(`Restored slider "${paramName}": ${value} (${min}-${max}, ${percentage}%)`);
                }
            } else if (type === 'vector') {
                const vectorInputs = paramRow.querySelectorAll('.vector-input');
                const vectorLabels = paramRow.querySelectorAll('.vector-label');
                
                vectorInputs.forEach((input, i) => {
                    const label = vectorLabels[i]?.textContent;
                    if (label && paramData.value[label] !== undefined) {
                        input.value = paramData.value[label];
                        console.log(`Restored vector "${paramName}.${label}": ${paramData.value[label]}`);
                    }
                });
            } else if (type === 'color') {
                const colorValue = paramRow.querySelector('.color-value');
                const colorSwatch = paramRow.querySelector('.color-swatch');
                const colorPicker = paramRow.querySelector('.color-picker');
                
                if (paramData.value) {
                    if (colorValue) colorValue.value = paramData.value;
                    if (colorSwatch) colorSwatch.style.background = paramData.value;
                    if (colorPicker) colorPicker.value = paramData.value;
                    console.log(`Restored color "${paramName}": ${paramData.value}`);
                }
            } else if (type === 'dropdown') {
                const dropdownBtn = paramRow.querySelector('.dropdown-btn span');
                if (dropdownBtn && paramData.value) {
                    dropdownBtn.textContent = paramData.value;
                    console.log(`Restored dropdown "${paramName}": ${paramData.value}`);
                }
            } else if (type === 'checkbox') {
                const checkbox = paramRow.querySelector('.checkbox');
                if (checkbox) {
                    if (paramData.value) {
                        checkbox.classList.add('checked');
                    } else {
                        checkbox.classList.remove('checked');
                    }
                    console.log(`Restored checkbox "${paramName}": ${paramData.value}`);
                }
            }
        });

        // Trigger parameter update event
        document.dispatchEvent(new CustomEvent('parametersRestored', { detail: state }));
    }

    updateUI() {
        // Update quick buttons
        Object.keys(this.checkpoints).forEach(slot => {
            const btn = document.querySelector(`[data-checkpoint="${slot}"]`);
            if (!btn) return;

            if (this.checkpoints[slot]) {
                btn.classList.add('has-data');
            } else {
                btn.classList.remove('has-data');
            }

            if (this.currentCheckpoint === slot) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update create button indicator
        const createBtn = document.getElementById('create-checkpoint');
        if (createBtn) {
            const hasAny = Object.values(this.checkpoints).some(c => c !== null);
            if (hasAny) {
                createBtn.classList.add('has-checkpoint');
            } else {
                createBtn.classList.remove('has-checkpoint');
            }
        }
    }

    openManager() {
        const modal = document.getElementById('checkpoint-modal');
        if (!modal) return;

        // Populate checkpoint list
        const listEl = document.getElementById('checkpoint-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        // Add shortcuts hint
        const hint = document.createElement('div');
        hint.className = 'shortcuts-hint';
        hint.innerHTML = `
            <div><strong>Keyboard Shortcuts:</strong></div>
            <div>• Press <kbd>1</kbd>-<kbd>9</kbd> or <kbd>0</kbd> to load checkpoints 1-10</div>
            <div>• Press <kbd>Ctrl+Shift+1</kbd> through <kbd>Ctrl+Shift+0</kbd> to save checkpoints</div>
            <div>• Press <kbd>Ctrl+Shift+C</kbd> to create in next available slot</div>
            <div style="margin-top: 12px; color: var(--accent-secondary);">
                <strong>💡 Tip:</strong> Use checkpoints 1 and 2 for quick A/B testing!
            </div>
        `;
        listEl.appendChild(hint);

        // Add button to add new checkpoint slots
        const existingSlots = Object.keys(this.checkpoints).map(k => parseInt(k));
        const maxExisting = Math.max(...existingSlots, 0);
        
        if (maxExisting < this.maxCheckpoints) {
            const addSlotBtn = document.createElement('button');
            addSlotBtn.className = 'add-checkpoint-slot-btn';
            addSlotBtn.innerHTML = `➕ Add Checkpoint Slot (${maxExisting + 1} of ${this.maxCheckpoints})`;
            addSlotBtn.addEventListener('click', () => {
                this.addCheckpointSlot();
            });
            listEl.appendChild(addSlotBtn);
        }

        // Add checkpoint items
        const sortedSlots = Object.keys(this.checkpoints).sort((a, b) => parseInt(a) - parseInt(b));
        sortedSlots.forEach(slot => {
            const checkpoint = this.checkpoints[slot];
            const item = this.createCheckpointItem(slot, checkpoint);
            listEl.appendChild(item);
        });

        modal.classList.add('active');

        // Setup close
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => modal.classList.remove('active'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    addCheckpointSlot() {
        const existingSlots = Object.keys(this.checkpoints).map(k => parseInt(k));
        const maxExisting = Math.max(...existingSlots, 0);
        
        if (maxExisting < this.maxCheckpoints) {
            const newSlot = (maxExisting + 1).toString();
            this.checkpoints[newSlot] = null;
            
            // Add button to toolbar if slots 1-4
            if (parseInt(newSlot) <= 4) {
                this.addQuickButton(newSlot);
            }
            
            this.updateUI();
            this.openManager(); // Refresh the manager view
        }
    }

    addQuickButton(slot) {
        const selector = document.getElementById('checkpoint-selector');
        if (!selector) return;

        const btn = document.createElement('button');
        btn.className = 'checkpoint-quick-btn';
        btn.dataset.checkpoint = slot;
        btn.title = `Checkpoint ${slot} (Press ${slot} to load, Ctrl+Shift+${slot} to save)`;
        btn.innerHTML = `
            <span class="checkpoint-label">CP</span>
            <span class="checkpoint-number">${slot}</span>
        `;

        btn.addEventListener('click', () => {
            if (btn.classList.contains('has-data')) {
                this.loadCheckpoint(slot);
            } else {
                this.createCheckpoint(slot);
            }
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.createCheckpoint(slot);
        });

        selector.appendChild(btn);
    }

    createCheckpointItem(slot, checkpoint) {
        const item = document.createElement('div');
        item.className = 'checkpoint-item';
        
        if (this.currentCheckpoint === slot) {
            item.classList.add('active');
        }

        if (!checkpoint) {
            item.innerHTML = `
                <div class="checkpoint-header">
                    <div class="checkpoint-info">
                        <div class="checkpoint-name">
                            <span class="checkpoint-slot-badge">Checkpoint ${slot}</span>
                            <span style="color: var(--text-muted);">Empty Slot</span>
                        </div>
                        <div class="checkpoint-shortcut">Press <kbd>Ctrl+Shift+${slot}</kbd> to save</div>
                    </div>
                    <div class="checkpoint-actions">
                        <button class="checkpoint-action-btn primary" onclick="window.checkpointManager.createCheckpoint('${slot}')">
                            Create Checkpoint
                        </button>
                    </div>
                </div>
            `;
            return item;
        }

        const paramCount = Object.keys(checkpoint.state.parameters).length;
        const timeAgo = this.getTimeAgo(checkpoint.timestamp);

        item.innerHTML = `
            <div class="checkpoint-header">
                <div class="checkpoint-info">
                    <div class="checkpoint-name">
                        <span class="checkpoint-slot-badge">Checkpoint ${slot}</span>
                        <span>${checkpoint.name}</span>
                    </div>
                    <div class="checkpoint-time">Created ${timeAgo}</div>
                </div>
                <div class="checkpoint-actions">
                    <button class="checkpoint-action-btn primary" onclick="window.checkpointManager.loadCheckpoint('${slot}')">
                        Load
                    </button>
                    <button class="checkpoint-action-btn" onclick="window.checkpointManager.createCheckpoint('${slot}')">
                        Overwrite
                    </button>
                    <button class="checkpoint-action-btn danger" onclick="window.checkpointManager.deleteCheckpoint('${slot}')">
                        Delete
                    </button>
                </div>
            </div>
            <div class="checkpoint-description">
                ${checkpoint.description}
            </div>
            <div class="checkpoint-stats">
                <div class="checkpoint-stat">
                    <div class="checkpoint-stat-label">Parameters</div>
                    <div class="checkpoint-stat-value">${paramCount}</div>
                </div>
                <div class="checkpoint-stat">
                    <div class="checkpoint-stat-label">Shortcut</div>
                    <div class="checkpoint-stat-value">
                        <kbd>${slot}</kbd> load • <kbd>Ctrl+Shift+${slot}</kbd> save
                    </div>
                </div>
                <div class="checkpoint-stat">
                    <div class="checkpoint-stat-label">State</div>
                    <div class="checkpoint-stat-value">${this.currentCheckpoint === slot ? 'Active' : 'Saved'}</div>
                </div>
            </div>
        `;

        return item;
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification checkpoint-toast show';
        toast.innerHTML = `
            <div class="toast-title">Checkpoints</div>
            <div class="toast-message">${message}</div>
        `;
        
        if (type === 'success') {
            toast.style.borderLeft = '4px solid var(--status-good)';
        } else if (type === 'warning') {
            toast.style.borderLeft = '4px solid var(--status-warning)';
        }
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialize and expose globally
const checkpointManager = new CheckpointManager();
window.checkpointManager = checkpointManager;
export default checkpointManager;
