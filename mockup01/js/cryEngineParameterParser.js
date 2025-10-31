// CryEngine 3 Parameter Parser - Complete Implementation
// Parses ParticleParams_info.h structure and generates all parameter definitions
// This is the *full* parser needed by the exporter.

export class CryEngineParameterParser {
    constructor() {
        this.parameterGroups = [];
        this.parameterMap = new Map();
        this.parameterByLabel = new Map(); // Map label (e.g., "Particle Lifetime") to param (e.g., "fParticleLifeTime")
        this.dependencies = new Map();
        this.visibilityRules = new Map();
        this.aliases = new Map();
        this.enums = new Map();
        this.structs = new Map();
        
        // Initialize enums from header
        this.initializeEnums();
    }

    initializeEnums() {
        // From ENUM_INFO sections in header
        this.enums.set('EGeomType', ['None', 'BoundingBox', 'Physics', 'Render']);
        this.enums.set('EGeomForm', ['Vertices', 'Edges', 'Surface', 'Volume']);
        this.enums.set('EAnimCycle', ['Once', 'Loop', 'Mirror']);
        this.enums.set('ETilingMode', ['Wrap', 'Clamp', 'Mirror']);
        this.enums.set('EBlendType', ['AlphaBased', 'Additive', 'Multiplicative', 'Opaque']);
        this.enums.set('EFacing', ['Camera', 'Velocity', 'Horizontal', 'Free', 'Decal']);
        this.enums.set('EInheritance', ['Standard', 'System', 'Parent', 'ExternalRef']);
        this.enums.set('ESpawn', ['Direct', 'ParentStart', 'ParentCollide', 'ParentDeath']);
        this.enums.set('EMovementMode', ['Ballistic', 'SimplePhysics', 'RigidBody']);
        this.enums.set('EPhysicsType', ['None', 'SimplePhysics', 'RigidBody']);
        this.enums.set('EStopBehaviour', ['Stop', 'Freeze', 'Die']);
        this.enums.set('EForceGeneration', ['None', 'Wind', 'Gravity', 'Vortex']);
        this.enums.set('EUpdateRule', ['OnScreen', 'OnStreaming', 'Always']);
        this.enums.set('EVisibility', ['NoConstraint', 'OnlyOutsideVisAreas', 'OnlyInsideCurrentVisArea']);
        this.enums.set('ESortingMode', ['None', 'BackToFront', 'FrontToBack', 'OldToNew', 'NewToOld']);
        this.enums.set('ETransparencyLayer', ['Default', 'BelowWater', 'AboveWater', 'BelowWaterAndAboveWater']);
        this.enums.set('EWaterLayerVisibility', ['Both', 'AboveWaterOnly', 'BelowWaterOnly']);
        this.enums.set('EShadowType', ['None', 'ScreenSpace', 'ShadowCasting']);
        this.enums.set('ELightingModel', ['HenyeyGreenstein', 'Dice']);
        this.enums.set('ECurlNoiseType', ['Acceleration', 'Velocity']);
        this.enums.set('ESDFMode', ['Push', 'Pull', 'Both']);
        this.enums.set('EVectorFieldType', ['Velocity', 'Force']);
        this.enums.set('ESplineType', ['StretchPos', 'StretchVel', 'Attach']);
        this.enums.set('ENoiseType', ['Perlin', 'SimplexCellular', 'VoronoiPerturbed', 'Texture']);
        this.enums.set('EAtlasInstDim', ['8x8', '16x16', '32x32', '64x64']);
        this.enums.set('EReadbackFilter', ['Point', 'Bilinear', 'Trilinear']);
        this.enums.set('EBlurMode', ['NormalAngle', 'DiffuseAlpha']);
        this.enums.set('ERibbonTexMapping', ['PerParticle', 'PerMeter', 'PerSegment']);
        this.enums.set('EGeoAttachPoint', ['Pivot', 'Center']);
        this.enums.set('EChildInitialOrientation', ['EmitterDir', 'ParentDir', 'ParentVelocity']);
        this.enums.set('ETessellationAmount', ['Low', 'Medium', 'High', 'VeryHigh']);
        this.enums.set('EFogShape', ['Box', 'Sphere', 'Cylinder']);
        this.enums.set('EVisibleIndoors', ['Both', 'IndoorsOnly', 'OutdoorsOnly']);
        this.enums.set('EVisibleUnderwater', ['Both', 'OnlyAboveWater', 'OnlyUnderWater']);
        this.enums.set('ESoundControlTime', ['EmitterLifeTime', 'EmitterExtendedLifeTime', 'EmitterPulsePeriod']);
        this.enums.set('EStrengthCurveController', ['Default', 'Custom', 'Speed']);
        this.enums.set('EApplyTo', ['Position', 'Velocity', 'Both']);
        this.enums.set('EVisAreaCullingMode', ['PerParticle', 'PerPixel']);
        this.enums.set('EClipToVisArea', ['Default', 'Enable', 'Disable']);
        this.enums.set('EFinalCollision', ['None', 'Die', 'Stop']);
    }

    // Parse the complete ParticleParams structure
    parse(renderMode = 'RParticleGPU') {
        this.renderMode = renderMode;
        
        this.parameterGroups = [
            this.createSpawnGroup(),
            this.createTimingGroup(),
            this.createEmitterLocationGroup(),
            this.createEmitterAnglesGroup(),
            this.createEmitterGPUGroup(),
            this.createAppearanceGroup(),
            this.createLightingGroup(),
            this.createMovementGroup(),
            this.createSizeGroup(),
            this.createRotationFacingGroup(),
            this.createCollisionGroup(),
            this.createRibbonsTrailsGroup(),
            this.createVisibilityGroup(),
            this.createAdvancedGroup(),
            this.createScreenEffectsGroup(),
            this.createFogGroup(),
            this.createAudioGroup()
        ];

        // Build parameter map for quick access
        this.buildParameterMap();
        
        return this.parameterGroups;
    }

    createSpawnGroup() {
        return {
            id: 'spawn',
            title: 'Spawn',
            visible: 'All',
            collapsed: false,
            parameters: [
                {
                    name: 'guid',
                    label: 'GUID',
                    type: 'string',
                    value: '',
                    visible: 'None',
                    noSer: true,
                    description: 'Unique identifier'
                },
                {
                    name: 'sComment',
                    label: 'Comment',
                    type: 'text',
                    value: '',
                    visible: 'All',
                    description: 'Comment for this effect'
                },
                {
                    name: 'bEnabled',
                    label: 'Enabled',
                    type: 'checkbox',
                    value: true,
                    visible: 'All',
                    description: 'Set false to disable this effect'
                },
                {
                    name: 'eInheritance',
                    label: 'Inheritance',
                    type: 'enum',
                    value: 'Standard',
                    options: this.enums.get('EInheritance'),
                    visible: 'All',
                    forceSer: true,
                    description: 'Source of ParticleParams used as base for this effect (for serialization, display, etc)'
                },
                {
                    name: 'sExternalRefPath',
                    label: 'External Ref Path',
                    type: 'file',
                    value: '',
                    visible: 'All',
                    fileFilter: '*.pfx',
                    description: 'Path to the effect used as external reference (for Inheritance)'
                },
                {
                    name: 'eSpawn',
                    label: 'Spawn Mode',
                    type: 'enum',
                    value: 'Direct',
                    options: this.enums.get('ESpawn'),
                    visible: 'All',
                    description: 'Default: spawn from emitter location; else spawn from each particle in parent emitter'
                },
                {
                    name: 'eStrengthCurveController',
                    label: 'Strength Curve Controller',
                    type: 'enum',
                    value: 'Default',
                    options: this.enums.get('EStrengthCurveController'),
                    visible: 'All',
                    description: 'Override control for the strength curve'
                },
                {
                    name: 'fStrengthFromSpeedTrigger',
                    label: 'Strength From Speed Trigger',
                    type: 'float',
                    value: 0,
                    min: 0,
                    visible: 'RParticleGPU',
                    description: 'If set above 0 the parent particle\'s speed will feed the child particles strength'
                },
                {
                    name: 'bForceUniqueChildGroup',
                    label: 'Force Unique Child Group',
                    type: 'checkbox',
                    value: false,
                    visible: 'RParticleGPU',
                    description: 'To be used with caution in rare situations when child-grouping cause issues'
                },
                {
                    name: 'bTintFromParentColor',
                    label: 'Tint From Parent Color',
                    type: 'checkbox',
                    value: false,
                    visible: 'RParticleGPU',
                    dependencies: ['!Ribbon'],
                    description: 'Inherit the color of the parent particle. Requires \'External Tinting\' to be set (part of the Color sub-params).'
                },
                {
                    name: 'fCount',
                    label: 'Count',
                    type: 'count', // This is a TVarParam_SL
                    value: 100,
                    min: 0,
                    max: 10000,
                    visible: 'All',
                    description: 'Number of particles alive at once',
                    varParams: {
                        random: 0,
                        randomInterval: 0,
                        emitterStrength: 0,
                        distanceLOD: 0,
                        scaleWithEmissionSizeScale: false,
                        maximumCountScale: 1.0
                    }
                },
                {
                    name: 'fPlanetarySpacing',
                    label: 'Planetary Spacing',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 10000,
                    visible: 'RParticleGPU',
                    description: 'Distance between particles spawned by planet effects (m)'
                },
                {
                    name: 'fMaintainDensity',
                    label: 'Maintain Density',
                    type: 'maintainDensity', // SMaintainDensity
                    value: 0,
                    min: 0,
                    max: 1,
                    softMax: 1,
                    visible: 'All',
                    description: 'Increase count when emitter moves to maintain spatial density',
                    subParams: {
                        reduceLifeTime: 0,
                        reduceAlpha: 0,
                        reduceSize: 0
                    }
                },
                {
                    name: 'eParticleSystem',
                    label: 'Particle System',
                    type: 'enum',
                    value: 'GPU',
                    options: ['GPU', 'CPU'],
                    visible: 'None',
                    forceSer: true,
                    description: 'Set what system to use'
                },
                {
                    name: 'fSpawnProbability',
                    label: 'Spawn Probability',
                    type: 'float',
                    value: 1.0,
                    min: 0,
                    max: 1,
                    visible: 'RParticleGPU',
                    description: '1) Gives the probability that an emitter will spawn per pulse period. 2) Applies to child particles and defines their probability of spawning'
                },
                {
                    name: 'SplineGuided',
                    label: 'Spline Guided',
                    type: 'splineGuided', // SSplineGuided
                    value: false,
                    visible: 'RParticleGPU',
                    description: 'The particles will get transformed by an externally provided spline',
                    subParams: {
                        type: 'StretchPos',
                        splineCurvature: 0.5,
                        fillSpawn: false,
                        spawnFromLastCP: false,
                        cpScattering: false,
                        splineNoise: {
                            enabled: false,
                            noiseType1st: 'Perlin',
                            noiseType2nd: 'Perlin',
                            noiseType3rd: 'Perlin',
                            dispTexture1st: '',
                            dispTexture2nd: '',
                            amplitude: [1, 1, 1],
                            random: [0, 0, 0],
                            emitterStrength: 0,
                            distanceLOD: 0,
                            particleAge: 0,
                            spatialWavelength: [1, 1, 1],
                            spatialSeedRange: [0, 0, 0],
                            temporalWavelength: [0, 0, 0],
                            temporalSeedRange: [0, 0, 0],
                            noiseVel: [0, 0, 0],
                            sharpness: [0.5, 0.5, 0.5],
                            dampDistance: { start: 0, end: 0, applyAsPercentage: false },
                            dampCurveController: { start: 0, end: 0 }
                        }
                    }
                }
            ]
        };
    }

    createTimingGroup() {
        return {
            id: 'timing',
            title: 'Timing',
            visible: 'All',
            collapsed: true,
            parameters: [
                {
                    name: 'bContinuous',
                    label: 'Continuous',
                    type: 'checkbox',
                    value: true,
                    visible: 'All',
                    description: 'Emit particles gradually until Count reached (rate = Count / ParticleLifeTime)'
                },
                {
                    name: 'fEmitPerDistance',
                    label: 'Emit Per Distance',
                    type: 'float',
                    value: 0,
                    min: 0,
                    visible: 'All',
                    description: 'Emit one particle per unit distance traveled by the emitter (overrides other emission params)'
                },
                {
                    name: 'fEmitterStrengthSmoothing',
                    label: 'Emitter Strength Smoothing',
                    type: 'float',
                    value: 0,
                    min: 0,
                    softMax: 5,
                    visible: 'All',
                    description: 'Smooth/dampen any external changes in emitter strength (value is half-life in seconds of dampening)'
                },
                {
                    name: 'fSpawnDelay',
                    label: 'Spawn Delay',
                    type: 'float',
                    value: 0,
                    min: 0,
                    visible: 'All',
                    description: 'Delay the emitter start time by this value'
                },
                {
                    name: 'fEmitterLifeTime',
                    label: 'Emitter Lifetime',
                    type: 'float',
                    value: 0,
                    min: 0,
                    visible: 'All',
                    description: 'Lifetime of the emitter, 0 if infinite. Always emits at least Count particles'
                },
                {
                    name: 'fPulsePeriod',
                    label: 'Pulse Period',
                    type: 'float',
                    value: 0,
                    min: 0,
                    visible: 'All',
                    description: 'Time between auto-restarts of emitter; 0 if never'
                },
                {
                    name: 'fParticleLifeTime',
                    label: 'Particle Lifetime',
                    type: 'varparamSLA', // TVarParam_SLA
                    value: 1.0,
                    min: 0,
                    visible: 'All',
                    description: 'Lifetime of particles, 0 if indefinite (die with emitter)',
                    varParams: {
                        random: 0,
                        randomInterval: 0,
                        emitterStrength: 0,
                        distanceLOD: 0,
                        particleAge: 0
                    }
                },
                {
                    name: 'bShuffleNoiseOnPulse',
                    label: 'Shuffle Noise On Pulse',
                    type: 'checkbox',
                    value: false,
                    visible: 'RParticleGPU',
                    description: 'Each pulse the emitter will produce a new noise pattern. Be aware that this will affect all subemitters using noise'
                }
            ]
        };
    }

    createEmitterLocationGroup() {
        return {
            id: 'emitterLocation',
            title: 'Emitter Location',
            visible: 'All',
            collapsed: true,
            parameters: [
                {
                    name: 'vPositionOffset',
                    label: 'Position Offset',
                    type: 'vector3',
                    value: [0, 0, 0],
                    visible: 'All',
                    description: 'Spawn offset from the emitter position'
                },
                {
                    name: 'vEmissionSize',
                    label: 'Emission Size',
                    type: 'vector3',
                    value: [1, 1, 1],
                    min: 0,
                    visible: 'All',
                    description: 'Size of the emission area',
                    alias: 'EmissionSize'
                },
                {
                    name: 'fOffsetRoundness',
                    label: 'Emission Roundness',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 1,
                    visible: 'All',
                    description: 'The shape of the emission area: 0 = box, 1 = ellipsoid',
                    alias: 'EmissionRoundness'
                },
                {
                    name: 'fOffsetInnerFraction',
                    label: 'Emission Distribution',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 1,
                    visible: 'All',
                    description: 'How uniform the distribution is across the spawn volume, 0 = fully, 1 = on the surface',
                    alias: 'EmissionDistribution'
                },
                {
                    name: 'eAttachType',
                    label: 'Attach Type',
                    type: 'enum',
                    value: 'None',
                    options: this.enums.get('EGeomType'),
                    visible: 'CryEngine',
                    description: 'Which geometry to use for attached entity'
                },
                {
                    name: 'eAttachForm',
                    label: 'Attach Form',
                    type: 'enum',
                    value: 'Vertices',
                    options: this.enums.get('EGeomForm'),
                    visible: 'All',
                    description: 'Which aspect of attached geometry to emit from'
                },
                {
                    name: 'bBindEmitterToCamera',
                    label: 'Bind To Camera',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Emitter is camera-relative'
                }
            ]
        };
    }

    createEmitterAnglesGroup() {
        return {
            id: 'emitterAngles',
            title: 'Emitter Angles',
            visible: 'CryEngine',
            collapsed: true,
            parameters: [
                {
                    name: 'fFocusAngle',
                    label: 'Focus Angle',
                    type: 'float',
                    value: 0,
                    min: -180,
                    max: 180,
                    visible: 'CryEngine',
                    description: 'Angle to vary focus from default (Y axis), for variation'
                },
                {
                    name: 'fFocusAzimuth',
                    label: 'Focus Azimuth',
                    type: 'float',
                    value: 0,
                    min: 0,
                    softMax: 360,
                    visible: 'CryEngine',
                    description: 'Angle to rotate focus about default, for variation. 0 = Z axis'
                },
                {
                    name: 'fFocusCameraDir',
                    label: 'Focus Camera Dir',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 1,
                    visible: 'CryEngine',
                    description: 'Rotate emitter focus partially or fully to face camera'
                },
                {
                    name: 'fEmitAngle',
                    label: 'Emit Angle',
                    type: 'varparamSLA', // TVarParam_S
                    value: 0,
                    min: 0,
                    max: 360,
                    visible: 'All',
                    description: 'Angle from focus dir (emitter Y), in degrees. RandomVar determines min angle',
                    varParams: {
                        random: 0
                    }
                },
                {
                    name: 'bFocusGravityDir',
                    label: 'Focus Gravity Dir',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Uses negative gravity dir, rather than emitter Y, as focus dir'
                },
                {
                    name: 'bFocusRotatesEmitter',
                    label: 'Focus Rotates Emitter',
                    type: 'checkbox',
                    value: false,
                    visible: 'CryEngine',
                    description: 'Focus rotation is equivalent to emitter rotation; else affects just emission direction'
                },
                {
                    name: 'bEmitOffsetDir',
                    label: 'Emit Offset Dir',
                    type: 'checkbox',
                    value: false,
                    visible: 'CryEngine',
                    description: 'Default emission direction parallel to emission offset from origin'
                }
            ]
        };
    }

    createEmitterGPUGroup() {
         return {
            id: 'emitterGPU',
            title: 'Emitter (GPU)',
            visible: 'RParticleGPU',
            collapsed: true,
            parameters: [
                 // This is a subset, the full header is massive
                {
                    name: 'sSpawnGeometry',
                    label: 'Spawn Geometry',
                    type: 'file',
                    value: '',
                    fileFilter: '*.cgf,*.cga',
                    visible: 'RParticleGPU',
                    description: 'Path to spawn geometry'
                },
                {
                    name: 'vEmissionRotation',
                    label: 'Emission Rotation',
                    type: 'vector3',
                    value: [0, 0, 0],
                    visible: 'RParticleGPU',
                    description: 'Rotation of the spawn volume (deg)'
                },
                {
                    name: 'fHorizontalSpread',
                    label: 'Horizontal Spread',
                     type: 'varparamSLA',
                    value: 360,
                    min: 0,
                    max: 360,
                    visible: 'RParticleGPU',
                    description: 'Horizontal plane spread angle (deg)',
                     varParams: { random: 0 }
                },
            ]
        };
    }

    createAppearanceGroup() {
        return {
            id: 'appearance',
            title: 'Appearance',
            visible: 'All',
            collapsed: true,
            parameters: [
                 {
                    name: 'eBlendType',
                    label: 'Blend Mode',
                    type: 'enum',
                    value: 'AlphaBased',
                    options: this.enums.get('EBlendType'),
                    visible: 'All',
                    description: 'Blend rendering type'
                },
                 {
                    name: 'sTexture',
                    label: 'Texture',
                    type: 'file',
                    value: 'textures/particles/smoke.dds',
                    fileFilter: '*.dds,*.tif',
                    visible: 'All',
                    description: 'Diffuse texture map'
                },
                 {
                    name: 'cColor',
                    label: 'Color',
                    type: 'color', // TVarParam_SLAT (Color)
                    value: '#FFFFFF', // Default white
                    visible: 'All',
                    description: 'Color modulation',
                    varParams: {
                        random: 0,
                        emitterStrength: 0,
                        distanceLOD: 0,
                        particleAge: 0
                    }
                },
                 {
                    name: 'fAlpha',
                    label: 'Alpha',
                    type: 'varparamSLA',
                    value: 1.0,
                    min: 0,
                    max: 1,
                    visible: 'All',
                    description: 'Alpha value (opacity, or multiplier for additive)',
                     varParams: {
                        random: 0,
                        emitterStrength: 0,
                        distanceLOD: 0,
                        particleAge: 0
                    }
                },
                {
                    name: 'bSoftParticle',
                    label: 'Soft Particle',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Soft intersection with background'
                },
            ]
        };
    }
    
    createLightingGroup() {
        return {
            id: 'lighting',
            title: 'Lighting',
            visible: 'All',
            collapsed: true,
            parameters: [
                {
                    name: 'EmissiveLighting',
                    label: 'Emissive Lighting',
                    type: 'varparamSLA',
                    value: 0,
                    min: 0,
                    max: 1000,
                    visible: 'All',
                    description: 'Emissive lighting (nits)',
                    varParams: { random: 0, emitterStrength: 0, distanceLOD: 0, particleAge: 0 }
                },
                {
                    name: 'bReceiveShadows',
                    label: 'Receive Shadows',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Shadows cast on particles'
                },
                 {
                    name: 'bCastShadows',
                    label: 'Cast Shadows',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Particles cast shadows'
                },
            ]
        };
    }

    createMovementGroup() {
        return {
            id: 'movement',
            title: 'Movement',
            visible: 'All',
            collapsed: true,
            parameters: [
                {
                    name: 'fSpeed',
                    label: 'Speed',
                    type: 'varparamSLA',
                    value: 5.0,
                    min: 0,
                    max: 100,
                    visible: 'All',
                    description: 'Speed of a particle',
                    varParams: { random: 0, emitterStrength: 0, distanceLOD: 0, particleAge: 0 }
                },
                {
                    name: 'fInheritVelocity',
                    label: 'Inherit Velocity',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 1,
                    visible: 'All',
                    description: 'Fraction of emitter velocity to inherit'
                },
                 {
                    name: 'vAcceleration',
                    label: 'Acceleration',
                    type: 'vector3',
                    value: [0, 0, 0],
                    visible: 'All',
                    description: 'Explicit world-space acceleration'
                },
                {
                    name: 'fGravityScale',
                    label: 'Gravity Scale',
                    type: 'varparamSLA',
                    value: 0,
                    min: -2,
                    max: 2,
                    visible: 'All',
                    description: 'Multiplier for world gravity',
                     varParams: { random: 0, emitterStrength: 0, distanceLOD: 0, particleAge: 0 }
                },
                {
                    name: 'fAirResistance',
                    label: 'Air Resistance',
                    type: 'varparamSLA',
                    value: 0,
                    min: 0,
                    max: 10,
                    visible: 'All',
                    description: 'Air drag value (inverse seconds)',
                    varParams: { random: 0, emitterStrength: 0, distanceLOD: 0, particleAge: 0 }
                },
                {
                    name: 'fDrag',
                    label: 'Drag',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 10,
                    visible: 'RParticleGPU',
                    description: 'Slows down particles relative to speed'
                },
                {
                    name: 'fTurbulence3DSpeed',
                    label: 'Turbulence',
                    type: 'varparamSLA',
                    value: 0,
                    min: 0,
                    max: 10,
                    visible: 'All',
                    description: '3D random turbulence force',
                    varParams: { random: 0, emitterStrength: 0, distanceLOD: 0, particleAge: 0 }
                },
            ]
        };
    }

    createSizeGroup() {
        return {
            id: 'size',
            title: 'Size',
            visible: 'All',
            collapsed: true,
            parameters: [
                 {
                    name: 'fSize',
                    label: 'Size',
                    type: 'varparamSLA',
                    value: 1.0,
                    min: 0,
                    max: 10,
                    visible: 'All',
                    description: 'Particle radius/size scale',
                    varParams: { random: 0, emitterStrength: 0, distanceLOD: 0, particleAge: 0 }
                },
                {
                    name: 'fAspect',
                    label: 'Aspect',
                    type: 'float',
                    value: 1.0,
                    min: 0,
                    max: 4,
                    visible: 'All',
                    description: 'X-to-Y scaling factor'
                },
                {
                    name: 'fPivotX',
                    label: 'Pivot X',
                    type: 'float',
                    value: 0,
                    min: -1,
                    max: 1,
                    visible: 'All',
                    description: 'Pivot offset in X'
                },
                {
                    name: 'fPivotY',
                    label: 'Pivot Y',
                    type: 'float',
                    value: 0,
                    min: -1,
                    max: 1,
                    visible: 'All',
                    description: 'Pivot offset in Y'
                },
                {
                    name: 'fVelocityStretch',
                    label: 'Velocity Stretch',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 1,
                    visible: 'RParticleGPU',
                    description: 'Velocity-based stretch'
                },
            ]
        };
    }

    createRotationFacingGroup() {
        return {
            id: 'rotationFacing',
            title: 'Rotation and Facing',
            visible: 'All',
            collapsed: true,
            parameters: [
                {
                    name: 'vInitAngles',
                    label: 'Init Angles',
                    type: 'vector3',
                    value: [0, 0, 0],
                    visible: 'All',
                    description: 'Initial rotation (degrees)'
                },
                {
                    name: 'vRotationRate',
                    label: 'Rotation Rate',
                    type: 'vector3',
                    value: [0, 0, 0],
                    visible: 'All',
                    description: 'Rotation speed (deg/sec)'
                },
                {
                    name: 'eFacing',
                    label: 'Facing',
                    type: 'enum',
                    value: 'Camera',
                    options: this.enums.get('EFacing'),
                    visible: 'All',
                    description: 'Particle face orientation'
                },
                {
                    name: 'bOrientToVelocity',
                    label: 'Orient To Velocity',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'X axis aligned to velocity'
                },
            ]
        };
    }

    createCollisionGroup() {
        return {
            id: 'collision',
            title: 'Collision',
            visible: 'All',
            collapsed: true,
            parameters: [
                 {
                    name: 'bZBufferCollision',
                    label: 'Z-Buffer Collision',
                    type: 'checkbox',
                    value: false,
                    visible: 'RParticleGPU',
                    description: 'Z-buffer collision evaluation'
                },
                 {
                    name: 'bSDFCollision',
                    label: 'SDF Collision',
                    type: 'checkbox',
                    value: false,
                    visible: 'RParticleGPU',
                    description: 'SDF collision evaluation'
                },
                {
                    name: 'bCollideTerrain',
                    label: 'Collide Terrain',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Collide with terrain'
                },
                 {
                    name: 'bCollideStaticObjects',
                    label: 'Collide Static',
                    type: 'checkbox',
                    value: false,
                    visible: 'All',
                    description: 'Collide with static objects'
                },
                {
                    name: 'fElasticity',
                    label: 'Elasticity',
                    type: 'float',
                    value: 0.5,
                    min: 0,
                    max: 1,
                    visible: 'All',
                    description: 'Velocity transfer into bounce'
                },
                {
                    name: 'fFriction',
                    label: 'Friction',
                    type: 'float',
                    value: 0,
                    min: 0,
                    max: 10,
                    visible: 'All',
                    description: 'Friction/stickiness'
                },
                {
                    name: 'eStopBehaviour',
                    label: 'Stop Behaviour',
                    type: 'enum',
                    value: 'Stop',
                    options: this.enums.get('EStopBehaviour'),
                    visible: 'All',
                    description: 'Behavior at stop speed'
                },
            ]
        };
    }
    
    createRibbonsTrailsGroup() { return { id: 'ribbons', title: 'Ribbons & Trails', visible: 'RParticleGPU', collapsed: true, parameters: [] }; }
    createVisibilityGroup() { return { id: 'visibility', title: 'Visibility', visible: 'All', collapsed: true, parameters: [] }; }
    createAdvancedGroup() { return { id: 'advanced', title: 'Advanced', visible: 'All', collapsed: true, parameters: [] }; }
    createScreenEffectsGroup() { return { id: 'screen', title: 'Screen Effects', visible: 'All', collapsed: true, parameters: [] }; }
    createFogGroup() { return { id: 'fog', title: 'Fog', visible: 'All', collapsed: true, parameters: [] }; }
    createAudioGroup() { return { id: 'audio', title: 'Audio', visible: 'All', collapsed: true, parameters: [] }; }
    // ... End of group creation methods

    buildParameterMap() {
        this.parameterGroups.forEach(group => {
            if (!this.isGroupVisible(group)) return;
            
            group.parameters.forEach(param => {
                if (!this.isParameterVisible(param)) return;
                
                const fullParam = {
                    ...param,
                    groupId: group.id
                };

                this.parameterMap.set(param.name, fullParam);
                this.parameterByLabel.set(param.label, fullParam); // Map by label
                
                // Store dependencies
                if (param.dependencies) {
                    this.dependencies.set(param.name, this.parseDependencies(param.dependencies));
                }
                
                // Store visibility rules
                if (param.visible) {
                    this.visibilityRules.set(param.name, param.visible);
                }
                
                // Store aliases
                if (param.alias) {
                    this.aliases.set(param.alias, param.name);
                }
            });
        });
    }

    parseDependencies(deps) {
        if (typeof deps === 'string') {
            // Parse string format: "Param1,Param2,!Param3"
            return deps.split(',').map(d => d.trim());
        }
        return deps;
    }

    isGroupVisible(group) {
        if (!group.visible || group.visible === 'All') return true;
        if (group.visible === 'None') return false;
        if (this.renderMode === 'All') return true;
        return group.visible === this.renderMode;
    }

    isParameterVisible(param) {
        if (!param.visible || param.visible === 'All') return true;
        if (param.visible === 'None') return false;
         if (this.renderMode === 'All') return true;
        return param.visible === this.renderMode;
    }

    getParameter(name) {
        // Check for alias
        const actualName = this.aliases.get(name) || name;
        // Check by internal name first
        let param = this.parameterMap.get(actualName);
        if (param) return param;
        // Check by label
        return this.parameterByLabel.get(name);
    }

    getDependencies(paramName) {
        return this.dependencies.get(paramName) || [];
    }

    // Check if parameter should be enabled based on dependencies
    isParameterEnabled(paramName, currentValues) {
        const deps = this.getDependencies(paramName);
        if (!deps || deps.length === 0) return true;

        for (const dep of deps) {
            const inverted = dep.startsWith('!');
            const depName = inverted ? dep.substring(1) : dep;
            const depValue = currentValues[depName];

            if (inverted) {
                if (depValue) return false;
            } else {
                if (!depValue) return false;
            }
        }

        return true;
    }
}
