/**
 * WidgetFactory
 * Creates DOM elements for different parameter types.
 */
export class WidgetFactory {

    /**
     * Creates a widget based on the parameter definition.
     * @param {Object} param - The parameter definition from the parser.
     * @param {Function} onChange - The callback function to execute when the value changes.
     * @returns {HTMLElement} The DOM element for the widget.
     */
    static createWidget(param, onChange) {
        switch (param.widget) {
            case 'slider':
                return this.createSlider(param, onChange);
            case 'vector':
                return this.createVector(param, onChange);
            case 'color':
                return this.createColor(param, onChange);
            case 'dropdown':
                return this.createDropdown(param, onChange);
            case 'checkbox':
                return this.createCheckbox(param, onChange);
            case 'text':
                return this.createTextInput(param, onChange);
            default:
                console.warn(`Unknown widget type: ${param.widget}. Defaulting to text input.`);
                return this.createTextInput(param, onChange);
        }
    }

    static createSlider(param, onChange) {
        const container = document.createElement('div');
        container.className = 'slider-control';

        const min = parseFloat(param.min || 0);
        const max = parseFloat(param.max || 100);
        const value = parseFloat(param.default || 50);
        const step = parseFloat(param.step || 1);
        const percentage = ((value - min) / (max - min)) * 100;

        container.innerHTML = `
            <div class="slider-input" data-min="${min}" data-max="${max}">
                <div class="slider-track" style="width: ${percentage}%">
                    <div class="slider-handle"></div>
                </div>
            </div>
            <input type="number" class="slider-value" value="${value}" step="${step}" data-min="${min}" data-max="${max}">
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
            let newValue = min + (max - min) * (percentage / 100);
            
            // Snap to step
            newValue = Math.round(newValue / step) * step;
            
            const finalValue = Math.max(min, Math.min(max, newValue));
            const finalPercentage = ((finalValue - min) / (max - min)) * 100;

            sliderTrack.style.width = `${finalPercentage}%`;
            valueInput.value = finalValue.toFixed(step >= 1 ? 0 : 2);
        };

        sliderHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
            document.body.style.cursor = 'grabbing';
        });

        sliderInput.addEventListener('click', (e) => {
            if (!isDragging) {
                updateSlider(e.clientX);
                const val = parseFloat(valueInput.value);
                onChange(val);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateSlider(e.clientX);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                const val = parseFloat(valueInput.value);
                onChange(val);
            }
            isDragging = false;
            document.body.style.cursor = '';
        });

        valueInput.addEventListener('change', () => {
            let val = parseFloat(valueInput.value) || 0;
            val = Math.max(min, Math.min(max, val));
            valueInput.value = val.toFixed(step >= 1 ? 0 : 2);
            
            const percentage = ((val - min) / (max - min)) * 100;
            sliderTrack.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
            onChange(val);
        });

        return container;
    }

    static createVector(param, onChange) {
        const container = document.createElement('div');
        container.className = 'vector-control';

        const labels = param.labels ? param.labels.split(',') : ['X', 'Y', 'Z'];
        const values = param.default ? param.default.split(',') : [0, 0, 0];

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
        container.appendChild(lock);

        const inputs = container.querySelectorAll('.vector-input');
        const lockBtn = lock.querySelector('.vector-lock-btn');
        
        const handleChange = () => {
            const values = Array.from(inputs).map(i => parseFloat(i.value) || 0);
            onChange(values);
        };

        inputs.forEach(input => input.addEventListener('change', handleChange));

        lockBtn?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('locked');
            btn.innerHTML = btn.classList.contains('locked') ? '🔒' : '🔓';
        });

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (lockBtn?.classList.contains('locked')) {
                    const value = input.value;
                    inputs.forEach(i => i.value = value);
                }
            });
        });

        return container;
    }

    static createColor(param, onChange) {
        const container = document.createElement('div');
        container.className = 'color-control';
        const defaultValue = param.default || '#ffffff';

        container.innerHTML = `
            <div class="color-swatch" style="background: ${defaultValue}"></div>
            <input type="text" class="color-value" value="${defaultValue}">
            <input type="color" class="color-picker" value="${defaultValue}" style="display: none;">
        `;

        const swatch = container.querySelector('.color-swatch');
        const valueInput = container.querySelector('.color-value');
        const picker = container.querySelector('.color-picker');

        swatch?.addEventListener('click', () => picker?.click());

        picker?.addEventListener('input', (e) => {
            const color = e.target.value;
            swatch.style.background = color;
            valueInput.value = color;
            onChange(color);
        });

        valueInput.addEventListener('change', (e) => {
            const color = e.target.value;
            swatch.style.background = color;
            picker.value = color;
            onChange(color);
        });

        return container;
    }

    static createDropdown(param, onChange) {
        const container = document.createElement('div');
        container.className = 'dropdown-control';
        const defaultValue = param.default || '';

        const optionsHtml = param.options.map(opt => `
            <option value="${opt}" ${opt === defaultValue ? 'selected' : ''}>${opt}</option>
        `).join('');

        container.innerHTML = `<select class="dropdown-select">${optionsHtml}</select>`;
        
        const select = container.querySelector('.dropdown-select');
        select?.addEventListener('change', (e) => {
            onChange(e.target.value);
        });

        return container;
    }

    static createCheckbox(param, onChange) {
        const container = document.createElement('div');
        container.className = 'checkbox-control';
        const isChecked = (param.default === 'true' || param.default === true);

        container.innerHTML = `
            <div class="checkbox ${isChecked ? 'checked' : ''}">
                <span class="checkbox-icon">✓</span>
            </div>
            <span class="checkbox-label" style="display:none;">${param.displayName}</span>
        `;

        const checkbox = container.querySelector('.checkbox');
        checkbox?.addEventListener('click', () => {
            checkbox.classList.toggle('checked');
            const isChecked = checkbox.classList.contains('checked');
            onChange(isChecked);
        });

        return container;
    }

    static createTextInput(param, onChange) {
        const container = document.createElement('div');
        container.className = 'text-control';
        container.innerHTML = `
            <input type="text" class="text-input-field" value="${param.default || ''}" placeholder="Enter value...">
        `;
        
        const input = container.querySelector('.text-input-field');
        input?.addEventListener('change', (e) => {
            onChange(e.target.value);
        });
        
        return container;
    }
}
