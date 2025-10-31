// CryEngine Particle Effect Exporter - Correct Format
// Exports to actual CryEngine particle library XML format
// ***** UPDATED to export ALL non-default parameters and expressions *****

import { CryEngineParameterParser } from './cryEngineParameterParser.js';

export class CryEngineExporter {
    constructor() {
        this.sandboxVersion = '1.0.151.20733';
        this.particleVersion = '53';
        
        // Initialize the parser to access default values
        this.parser = new CryEngineParameterParser();
        this.parser.parse('All'); // Parse all params to get definitions
        console.log('CryEngineExporter initialized with full parameter parser.');
    }
    
    // Generate a GUID for particle effects
    generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Export particle effect library to CryEngine format
    exportLibrary(libraryData, effectsData) {
        console.log('📦 Exporting CryEngine particle library:', libraryData.name);
        console.log('  Effects to export:', effectsData.length);
        
        const cryXML = this.generateCryEngineXML(libraryData, effectsData);
        
        console.log('✅ CryEngine export complete - XML size:', cryXML.length, 'bytes');
        return cryXML;
    }
    
    generateCryEngineXML(libraryData, effectsData) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<ParticleLibrary Name="' + this.escapeXML(libraryData.name) + '" SandboxVersion="' + this.sandboxVersion + '" ParticleVersion="' + this.particleVersion + '">\n';
        
        // Process each effect
        effectsData.forEach((effect, index) => {
            console.log(`  Exporting effect ${index + 1}/${effectsData.length}: ${effect.name || 'Unnamed'}`);
            xml += this.generateParticleXML(effect);
        });
        
        xml += '</ParticleLibrary>\n';
        
        return xml;
    }
    
    generateParticleXML(effect) {
        const guid = this.generateGUID();
        const name = effect.name || effect.effectName || 'Unnamed_Effect';
        
        let xml = ' <Particles Name="' + this.escapeXML(name) + '" GUID="' + guid + '">\n';
        xml += '  <Params' + this.generateParamsAttributes(effect) + '/>\n';
        xml += ' </Particles>\n';
        
        return xml;
    }
    
    /**
     * Generates all non-default parameter attributes and all expression attributes.
     */
    generateParamsAttributes(effect) {
        const params = effect.params || {};
        const expressions = effect.expressions || {};
        
        let attrs = '';
        
        // --- Default Inheritance and System ---
        attrs += ' Inheritance="System"';
        attrs += ' ParticleSystem="CryEngine"'; // Assuming CryEngine, could be 'RParticleGPU'
        
        // --- Export All Non-Default Values ---
        for (const [paramName, currentValue] of Object.entries(params)) {
            const definition = this.parser.getParameter(paramName);
            
            if (!definition) {
                // Parameter from params doesn't exist in parser (e.g., an old param)
                // We'll write it just in case, using its label
                const paramLabel = this.findLabelForParam(paramName);
                if (paramLabel) {
                     attrs += ` ${this.escapeXML(paramLabel)}="${this.formatValue(currentValue)}"`;
                }
                continue;
            }

            // Get the *actual* parameter name from the definition (not the label)
            const actualParamName = definition.name;
            const defaultValue = definition.value;

            // Compare current value to default value
            if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
                // Value is non-default, write it to XML
                attrs += ` ${this.escapeXML(actualParamName)}="${this.formatValue(currentValue)}"`;
            }
        }
        
        // --- Export All Expressions ---
        for (const [paramName, expression] of Object.entries(expressions)) {
             const definition = this.parser.getParameter(paramName);
             const actualParamName = definition ? definition.name : paramName; // Use definition name if possible
            
            // Expressions are written as attributes
            attrs += ` ${this.escapeXML(actualParamName)}="${this.escapeXML(expression)}"`;
        }

        return attrs;
    }

    /**
     * Finds the parameter definition label (e.g., "Particle Lifetime") for a given internal name (e.g., "fParticleLifeTime")
     * This is a fallback for the exporter, but the parameter manager should ideally send the correct names.
     */
    findLabelForParam(internalName) {
         for (const group of this.parser.parameterGroups) {
             for (const param of group.parameters) {
                 if (param.name === internalName) {
                     return param.label || param.name;
                 }
             }
         }
         // Fallback: try to find by label (which is what the simple manager uses)
         const definition = this.parser.getParameter(internalName);
         if (definition) return definition.name;
         
         return internalName; // Last resort
    }

    /**
     * Formats a JavaScript value into a string suitable for CryEngine XML.
     * @param {*} value - The value to format.
     */
    formatValue(value) {
        if (typeof value === 'string') {
            return this.escapeXML(value);
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'number') {
            // Format numbers with 3 decimal places if they are floats
            return Number.isInteger(value) ? value.toString() : value.toFixed(3);
        }
        if (Array.isArray(value)) {
            // Format vectors: [x, y, z] -> "x,y,z"
            return value.map(v => (Number.isInteger(v) ? v : v.toFixed(3))).join(',');
        }
        if (typeof value === 'object' && value !== null) {
            // Handle color objects: {r: 255, g: 100, b: 50} -> "1.000,0.392,0.196"
            if (value.hasOwnProperty('r') && value.hasOwnProperty('g') && value.hasOwnProperty('b')) {
                const r = (value.r / 255).toFixed(3);
                const g = (value.g / 255).toFixed(3);
                const b = (value.b / 255).toFixed(3);
                return `${r},${g},${b}`;
            }
            // Handle simple hex color strings
            if (typeof value === 'string' && value.startsWith('#')) {
                return this.formatValue(this.hexToRgb(value));
            }
        }
        
        return this.escapeXML(String(value));
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    encodeCurveAttribute(paramName, curvePoints) {
        if (!curvePoints || curvePoints.length === 0) return '';
        
        // CryEngine curve format: ParamName.OverLife="(time1:value1,time2:value2,...)"
        let attr = ' ' + paramName + '.OverLife="(';
        
        const keyframes = curvePoints.map(p => {
            return p.x.toFixed(3) + ':' + p.y.toFixed(3);
        });
        
        attr += keyframes.join(',');
        attr += ')"';
        
        return attr;
    }
    
    mapBlendMode(mode) {
        const modeMap = {
            'additive': 'Additive',
            'add': 'Additive',
            'alpha': 'AlphaBlend',
            'alphabased': 'AlphaBlend',
            'multiply': 'Multiplicative',
            'multiplicative': 'Multiplicative',
            'screen': 'Screen',
            'overlay': 'Overlay',
            'opaque': 'Opaque'
        };
        return modeMap[mode?.toLowerCase()] || 'AlphaBlend';
    }
    
    escapeXML(str) {
        if (!str) return '';
        return String(str).replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    }
    
    // Validate effect data before export
    validateEffect(effect) {
        const errors = [];
        
        if (!effect.name && !effect.effectName) {
            errors.push('Effect must have a name');
        }
        
        if (effect.params) {
            if (effect.params['Particle Lifetime'] !== undefined && effect.params['Particle Lifetime'] <= 0) {
                errors.push('Lifetime must be greater than 0');
            }
            if (effect.params['Count'] !== undefined && effect.params['Count'] < 0) {
                errors.push('Count cannot be negative');
            }
        }
        
        return errors;
    }
    
    // Generate preview of export
    generatePreview(effectsData) {
        let preview = '╔═══════════════════════════════════════════════════╗\n';
        preview += '║   CryEngine Particle Library Export Preview       ║\n';
        preview += '╚═══════════════════════════════════════════════════╝\n\n';
        
        effectsData.forEach((effect, index) => {
            const name = effect.name || effect.effectName || 'Unnamed';
            preview += `📦 Particle ${index + 1}: ${name}\n`;
            preview += `${'─'.repeat(50)}\n`;
            
            const params = effect.params || {};
            const expressions = effect.expressions || {};
            
            preview += `  --- Non-Default Parameters ---\n`;
            let nonDefaultCount = 0;
            for (const [paramName, currentValue] of Object.entries(params)) {
                 const definition = this.parser.getParameter(paramName);
                 if (!definition) continue;
                 
                 const defaultValue = definition.value;
                 if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
                     preview += `    • ${definition.label || paramName}: ${this.formatValue(currentValue)}\n`;
                     nonDefaultCount++;
                 }
            }
            if (nonDefaultCount === 0) {
                preview += `    (All parameters at default)\n`;
            }

            preview += `\n  --- Expressions ---\n`;
            let expressionCount = 0;
            for (const [paramName, expression] of Object.entries(expressions)) {
                 const definition = this.parser.getParameter(paramName);
                 const label = definition ? definition.label : paramName;
                 preview += `    • ${label} = ${expression}\n`;
                 expressionCount++;
            }
            if (expressionCount === 0) {
                preview += `    (No expressions)\n`;
            }
            
            preview += '\n';
        });
        
        preview += `\n✅ Ready to export ${effectsData.length} particle${effectsData.length !== 1 ? 's' : ''} to CryEngine format\n`;
        
        return preview;
    }
}
