// CryEngine 3 Parameter Parser - XML Edition
// Parses an external XML file to generate parameter definitions.
// This is now the single source of truth for both UI and Export.

export class CryEngineParameterParser {
    constructor() {
        this.parameterGroups = [];
        this.parameterMap = new Map();
        this.parameterByLabel = new Map(); // Map label to param
        this.aliases = new Map();
        
        // This class will be initialized with loadDefinitions
    }

    /**
     * Loads and parses the parameter definitions from an XML file.
     * @param {string} xmlPath - The path to the parameters.xml file.
     */
    async loadDefinitions(xmlPath) {
        try {
            const response = await fetch(xmlPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch parameters.xml: ${response.statusText}`);
            }
            const xmlString = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");

            const groups = xmlDoc.querySelectorAll('Group');
            groups.forEach(groupNode => {
                const group = {
                    id: groupNode.getAttribute('name').toLowerCase(),
                    title: groupNode.getAttribute('displayName') || groupNode.getAttribute('name'),
                    visible: 'All', // Assuming all are visible
                    collapsed: groupNode.getAttribute('name') !== 'Spawn', // Collapse all but Spawn
                    parameters: []
                };

                const params = groupNode.querySelectorAll('Param');
                params.forEach(paramNode => {
                    const param = {
                        name: paramNode.getAttribute('name'),
                        label: paramNode.getAttribute('displayName'),
                        type: paramNode.getAttribute('type'),
                        default: paramNode.getAttribute('default'),
                        widget: paramNode.getAttribute('widget'),
                        // Widget hints
                        min: paramNode.getAttribute('min'),
                        max: paramNode.getAttribute('max'),
                        step: paramNode.getAttribute('step'),
                        labels: paramNode.getAttribute('labels'),
                        options: Array.from(paramNode.querySelectorAll('Option')).map(opt => opt.textContent)
                    };
                    
                    // Add to group
                    group.parameters.push(param);
                    
                    // Add to maps
                    this.parameterMap.set(param.name, param);
                    this.parameterByLabel.set(param.label, param);
                    
                    // Store aliases (e.g., EmissionSize for vEmissionSize)
                    if (param.alias) {
                        this.aliases.set(param.alias, param.name);
                    }
                });
                
                this.parameterGroups.push(group);
            });
            
            console.log(`📦 Parsed ${this.parameterGroups.length} parameter groups from XML.`);
            return this.parameterGroups;

        } catch (error) {
            console.error("Error loading or parsing parameters.xml:", error);
            return [];
        }
    }

    /**
     * Returns all loaded parameter groups.
     */
    getGroups() {
        return this.parameterGroups;
    }

    /**
     * Gets a parameter definition by its name (e.g., fParticleLifeTime) or label (e.g., Particle Lifetime).
     * @param {string} name - The name or label of the parameter.
     * @returns {Object | undefined} The parameter definition.
     */
    getParameter(name) {
        // Check for alias
        const actualName = this.aliases.get(name) || name;
        // Check by internal name first
        let param = this.parameterMap.get(actualName);
        if (param) return param;
        // Check by label
        return this.parameterByLabel.get(name);
    }
    
    // --- Other methods required by Exporter ---
    // (These are simplified as the XML doesn't contain visibility/dependency rules yet)

    isParameterVisible(paramName, renderMode = 'All') {
        // TODO: This logic could be moved into the XML definition
        return true; 
    }

    isParameterEnabled(paramName, currentValues) {
        // TODO: This logic could be moved into the XML definition
        return true;
    }
}

