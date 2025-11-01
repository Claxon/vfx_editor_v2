// Library Manager - Handles library tree and effect selection
// *** UPDATED to support nested child effects and hierarchy events ***
export class LibraryManager {
    constructor() {
        this.container = document.getElementById('library-content');
        this.searchInput = document.getElementById('library-search');
        this.libraries = [];
        this.selectedItem = null;
        this.draggedItem = null;
        this.searchTerm = '';
    }

    init() {
        console.log('📚 Initializing Library Manager');
        this.setupSearch();
    }

    setupSearch() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterTree();
        });
    }

    filterTree() {
        const allItems = this.container.querySelectorAll('.tree-item');
        
        if (!this.searchTerm) {
            // Show all items
            allItems.forEach(item => {
                item.style.display = '';
            });
            return;
        }

        // Filter items
        allItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(this.searchTerm);
            
            if (matches) {
                item.style.display = '';
                // Show all parents
                let parent = item.parentElement;
                while (parent && parent.classList.contains('library-tree')) {
                    if (parent.classList.contains('tree-item')) {
                        parent.style.display = '';
                    }
                    parent = parent.parentElement;
                }
            } else if (!item.classList.contains('library') && !item.classList.contains('folder')) {
                item.style.display = 'none';
            }
        });
    }

    loadLibraries(libraries) {
        this.libraries = libraries;
        this.render();
    }

    render() {
        if (!this.container) return;

        const tree = document.createElement('div');
        tree.className = 'library-tree';

        this.libraries.forEach(library => {
            tree.appendChild(this.createLibraryNode(library));
        });

        this.container.innerHTML = '';
        this.container.appendChild(tree);
    }

    createLibraryNode(library) {
        const node = document.createElement('div');
        
        // Library header
        const header = document.createElement('div');
        header.className = 'tree-item library';
        header.draggable = false;
        header.innerHTML = `
            <span class="tree-icon">📦</span>
            <span class="tree-name" contenteditable="false">${library.name}</span>
            <div class="tree-controls">
                <button class="tree-control-btn" title="Pin Library">📌</button>
                <button class="tree-control-btn" title="Refresh Library">🔄</button>
                <button class="tree-control-btn rename-btn" title="Rename">✏️</button>
            </div>
        `;

        // Setup rename
        const renameBtn = header.querySelector('.rename-btn');
        const nameSpan = header.querySelector('.tree-name');
        renameBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.enableRename(nameSpan);
        });

        node.appendChild(header);

        // Library items
        if (library.items) {
            // *** FIX: Pass null as the rootEffect initially ***
            library.items.forEach(item => {
                node.appendChild(this.createTreeItem(item, 0, null));
            });
        }

        return node;
    }

    createTreeItem(item, level = 0, rootEffect = null) {
        const node = document.createElement('div');
        
        // *** FIX: The root is the first effect encountered, or the one passed down ***
        const currentRoot = rootEffect || (item.type === 'effect' ? item : null);

        if (item.type === 'folder') {
            // Folder
            const folder = document.createElement('div');
            folder.className = 'tree-item folder';
            folder.style.paddingLeft = `${20 + level * 16}px`;
            folder.draggable = true;
            folder.dataset.type = 'folder';
            folder.dataset.name = item.name;
            
            folder.innerHTML = `
                <span class="tree-icon">📁</span>
                <span class="tree-name" contenteditable="false">${item.name}</span>
                <div class="tree-controls">
                    <button class="tree-control-btn expand-btn" title="Expand/Collapse">▼</button>
                    <button class="tree-control-btn rename-btn" title="Rename (F2)">✏️</button>
                </div>
            `;

            // Setup drag and drop
            this.setupDragDrop(folder);

            // Setup expand/collapse
            const expandBtn = folder.querySelector('.expand-btn');
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';

            // Folder items
            if (item.items) {
                item.items.forEach(child => {
                    // Pass the current root effect down
                    childrenContainer.appendChild(this.createTreeItem(child, level + 1, currentRoot));
                });
            }

            expandBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                childrenContainer.classList.toggle('collapsed');
                expandBtn.textContent = childrenContainer.classList.contains('collapsed') ? '▶' : '▼';
            });

            // Setup rename
            const renameBtn = folder.querySelector('.rename-btn');
            const nameSpan = folder.querySelector('.tree-name');
            renameBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enableRename(nameSpan);
            });

            node.appendChild(folder);
            node.appendChild(childrenContainer);

        } else if (item.type === 'effect') {
            // Effect
            const effect = document.createElement('div');
            effect.className = 'tree-item effect';
            // Adjust padding based on level
            const padding = (level === 0) ? 20 : 36;
            effect.style.paddingLeft = `${padding + level * 16}px`;
            effect.draggable = true;
            effect.dataset.type = 'effect';
            effect.dataset.name = item.name;
            
            // Add visibility and lock state
            if (item.isVisible === false) effect.classList.add('hidden');
            if (item.isLocked === true) effect.classList.add('locked');

            const hasChildren = item.items && item.items.length > 0;
            const expandBtnHtml = hasChildren ? 
                `<button class="tree-control-btn expand-btn" title="Expand/Collapse">▼</button>` : 
                `<span class="tree-icon-placeholder"></span>`; // Placeholder for alignment

            effect.innerHTML = `
                ${expandBtnHtml}
                <span class="tree-icon">✨</span>
                <span class="tree-name" contenteditable="false">${item.name}</span>
                <div class="tree-controls">
                    <button class="tree-control-btn lock-btn" title="Lock Effect">${item.isLocked ? '🔒' : '🔓'}</button>
                    <button class="tree-control-btn visibility-btn" title="Show/Hide">${item.isVisible === false ? '👁️‍🗨️' : '👁️'}</button>
                    <button class="tree-control-btn solo-btn" title="Solo">🎯</button>
                    <button class="tree-control-btn rename-btn" title="Rename (F2)">✏️</button>
                </div>
            `;

            // Setup controls
            const lockBtn = effect.querySelector('.lock-btn');
            lockBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLock(effect, lockBtn);
            });

            const visBtn = effect.querySelector('.visibility-btn');
            visBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVisibility(effect, visBtn);
            });

            const soloBtn = effect.querySelector('.solo-btn');
            soloBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSolo(effect, soloBtn);
            });

            // Setup rename
            const renameBtn = effect.querySelector('.rename-btn');
            const nameSpan = effect.querySelector('.tree-name');
            renameBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enableRename(nameSpan);
            });

            // Setup drag and drop
            this.setupDragDrop(effect);

            // Setup selection
            effect.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectEffect(effect, item, currentRoot);
            });

            node.appendChild(effect);

            // *** NEW: Handle child effects ***
            if (hasChildren) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                
                item.items.forEach(child => {
                    // Pass the SAME root effect down to all children
                    childrenContainer.appendChild(this.createTreeItem(child, level + 1, currentRoot));
                });
                
                node.appendChild(childrenContainer);

                // Setup expand/collapse
                const expandBtn = effect.querySelector('.expand-btn');
                expandBtn?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    childrenContainer.classList.toggle('collapsed');
                    expandBtn.textContent = childrenContainer.classList.contains('collapsed') ? '▶' : '▼';
                });
            }
        }

        return node;
    }


    enableRename(nameSpan) {
        const originalName = nameSpan.textContent;
        
        nameSpan.contentEditable = 'true';
        nameSpan.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(nameSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishRename = () => {
            nameSpan.contentEditable = 'false';
            const newName = nameSpan.textContent.trim();
            
            if (!newName) {
                nameSpan.textContent = originalName;
            } else {
                console.log('Renamed:', originalName, '->', newName);
                // Note: This only renames in UI. We'd need to update the data model.
                // For this simulation, we'll update the dataset name
                nameSpan.closest('.tree-item').dataset.name = newName;
                this.showToast(`Renamed to: ${newName}`);
            }
        };

        nameSpan.addEventListener('blur', finishRename, { once: true });
        nameSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishRename();
            } else if (e.key === 'Escape') {
                nameSpan.textContent = originalName;
                finishRename();
            }
        });
    }

    setupDragDrop(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedItem = element;
            element.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.name);
        });

        element.addEventListener('dragend', () => {
            element.style.opacity = '1';
            this.draggedItem = null;
            // Remove all drop indicators
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        });

        element.addEventListener('dragover', (e) => {
            if (!this.draggedItem || this.draggedItem === element) return;
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Show drop indicator
            const rect = element.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const before = e.clientY < midpoint;
            
            this.showDropIndicator(element, before);
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (!this.draggedItem || this.draggedItem === element) return;
            
            // Determine drop position
            const rect = element.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const before = e.clientY < midpoint;
            
            // Perform reordering
            this.reorderItems(this.draggedItem, element, before);
        });

        element.addEventListener('dragleave', () => {
            // Could remove drop indicators here
        });
    }

    showDropIndicator(element, before) {
        // Remove existing indicators
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--accent-secondary);
            pointer-events: none;
            z-index: 1000;
            box-shadow: 0 0 4px var(--accent-secondary);
        `;
        
        if (before) {
            element.parentElement.insertBefore(indicator, element);
        } else {
            element.parentElement.insertBefore(indicator, element.nextSibling);
        }
    }

    reorderItems(draggedEl, targetEl, before) {
        const parent = targetEl.parentElement;
        
        if (before) {
            parent.insertBefore(draggedEl, targetEl);
        } else {
            parent.insertBefore(draggedEl, targetEl.nextSibling);
        }

        this.showToast(`Moved ${draggedEl.dataset.name}`);
        console.log('Reordered items');
    }

    toggleLock(element, button) {
        element.classList.toggle('locked');
        const isLocked = element.classList.contains('locked');
        button.textContent = isLocked ? '🔒' : '🔓';
        this.showToast(isLocked ? 'Locked' : 'Unlocked');
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('effectLockChanged', {
            detail: {
                name: element.dataset.name,
                isLocked: isLocked
            }
        }));
    }

    toggleVisibility(element, button) {
        element.classList.toggle('hidden');
        const isHidden = element.classList.contains('hidden');
        button.textContent = isHidden ? '👁️‍🗨️' : '👁️';
        button.style.opacity = isHidden ? '0.5' : '1';
        this.showToast(isHidden ? 'Hidden' : 'Visible');

        // Dispatch event
        document.dispatchEvent(new CustomEvent('effectVisibilityChanged', {
            detail: {
                name: element.dataset.name,
                isVisible: !isHidden
            }
        }));
    }

    toggleSolo(element, button) {
        const wasSolo = element.classList.contains('solo');
        
        // Remove solo from all
        document.querySelectorAll('.tree-item.solo').forEach(item => {
            item.classList.remove('solo');
            item.querySelector('.solo-btn').style.color = '';
        });

        if (!wasSolo) {
            element.classList.add('solo');
            button.style.color = 'var(--accent-tertiary)';
            this.showToast('Solo mode enabled');
            // We would also need to dispatch a 'solo' event
        } else {
            button.style.color = '';
            this.showToast('Solo mode disabled');
        }
    }

    selectEffect(element, effectData, rootEffectData) {
        // Remove previous selection
        if (this.selectedItem) {
            this.selectedItem.classList.remove('selected');
        }

        // Select new item
        element.classList.add('selected');
        this.selectedItem = element;

        // Dispatch event with effect data including params
        // *** NEW: Pass both the clicked effect and its root ***
        const event = new CustomEvent('effectSelected', {
            detail: {
                effectData: effectData, // The effect that was clicked
                rootEffectData: rootEffectData // The root parent effect
            }
        });
        document.dispatchEvent(event);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification show';
        toast.innerHTML = `
            <div class="toast-title">Library</div>
            <div class="toast-message">${message}</div>
        `;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    }
}

