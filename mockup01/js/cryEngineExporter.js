// CryEngine Particle Effect Exporter - Correct Format
// Exports to actual CryEngine particle library XML format
// ***** UPDATED to export ALL non-default parameters and expressions *****
// ***** UPDATED with async init to load XML definitions *****
// ***** UPDATED with exportAllParameters toggle *****

import { CryEngineParameterParser } from './cryEngineParameterParser.js';

export class CryEngineExporter {
    constructor() {
        this.sandboxVersion = '1.0.151.20733';
        this.particleVersion = '53';
        
        // ***** SET THIS TO TRUE TO WRITE ALL PARAMETERS *****
        // This is the toggle you asked about.
        // Set to true: Writes all parameters from the XML definition.
        // Set to false: Writes only parameters that are not at their default value.
        this.exportAllParameters = false; 
        // ******************************************************
        
        // Initialize the parser, but DO NOT load definitions here
        this.parser = new CryEngineParameterParser();
        console.log('CryEngineExporter created.');
    }

    /**
     * Asynchronously loads the parameter definitions from the XML file.
     * This MUST be called before any export operations.
     */
    async init() {
        // Load definitions from the same XML file as the parameter manager
        await this.parser.loadDefinitions('parameters.xml');
        console.log('CryEngineExporter initialized with full parameter parser definitions.');
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
        // TODO: This should be dynamic based on the parameter definition
        attrs += ' ParticleSystem="RParticleGPU"'; 
        
        // --- Export All Non-Default Values ---
        for (const [paramName, currentValue] of Object.entries(params)) {
            const definition = this.parser.getParameter(paramName);
            
            if (!definition) {
                // This could be a param from a label, try finding it
                const defByLabel = this.parser.getParameter(paramName);
                if (defByLabel) {
                     // We found it by label, but we need to use its *internal name*
                     // This block is unlikely to be hit now, but good for safety.
                } else {
                    console.warn(`Export warning: Parameter "${paramName}" not found in XML definitions. Skipping.`);
                    continue;
                }
            }

            // Get the *actual* parameter name from the definition (e.g., "fParticleLifeTime")
            const actualParamName = definition.name;
            let defaultValue = definition.default;

            // Convert default value from string to the correct type for comparison
            switch (definition.type) {
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

            // Compare current value to default value
            // We use JSON.stringify for a decent deep-ish comparison
            const isDefault = JSON.stringify(currentValue) === JSON.stringify(defaultValue);
            
            if (!isDefault || this.exportAllParameters)
			{
                // Value is non-default OR exportAll is true, write it to XML
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
     * Formats a JavaScript value into a string suitable for CryEngine XML.
     * @param {*} value - The value to format.
     */
    formatValue(value) {
        if (typeof value === 'string') {
            // Handle color strings
            if (value.startsWith('#')) {
                return this.formatValue(this.hexToRgb(value));
            }
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
            // Use the correct parameter name from XML
            if (effect.params['fParticleLifeTime'] !== undefined && effect.params['fParticleLifeTime'] <= 0) {
                errors.push('Lifetime must be greater than 0');
            }
            if (effect.params['fCount'] !== undefined && effect.params['fCount'] < 0) {
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
                 
                 let defaultValue = definition.default;
                 // Convert default value from string to the correct type for comparison
                 switch (definition.type) {
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
                 
                 const isDefault = JSON.stringify(currentValue) === JSON.stringify(defaultValue);
                 
                 if (!isDefault || this.exportAllParameters) {
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
