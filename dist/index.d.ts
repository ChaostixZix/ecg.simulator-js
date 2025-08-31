type ECGLead = 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
interface ECGPoint {
    time: number;
    amplitude: number;
}
interface ECGLeadData {
    lead: ECGLead;
    data: ECGPoint[];
}
interface ECGConfiguration {
    heartRate: number;
    duration: number;
    samplingRate: number;
    amplitude: number;
    pWave: WaveformConfig;
    qrsComplex: WaveformConfig;
    tWave: WaveformConfig;
    stSegment: STSegmentConfig;
    prInterval: number;
    qtInterval: number;
    qrsWidth: number;
}
interface WaveformConfig {
    amplitude: number;
    duration: number;
    shape: 'gaussian' | 'triangular' | 'custom';
}
interface STSegmentConfig {
    elevation: Partial<Record<ECGLead, number>>;
    depression: Partial<Record<ECGLead, number>>;
}
interface ECGData {
    leads: ECGLeadData[];
    configuration: ECGConfiguration;
    timestamp: number;
}
type ClinicalPattern = 'normal' | 'stemi-anterior' | 'stemi-inferior' | 'stemi-lateral' | 'nstemi' | 'pericarditis' | 'lvh' | 'rbbb' | 'lbbb';
interface RenderOptions {
    width: number;
    height: number;
    gridSize: number;
    gridColor: string;
    traceColor: string;
    backgroundColor: string;
    showGrid: boolean;
    showLabels: boolean;
    gain: number;
    paperSpeed: number;
    panelPadding: number;
    panelGapX: number;
    panelGapY: number;
    startTime?: number;
}

declare class ECGGenerator {
    private config;
    constructor(config?: Partial<ECGConfiguration>);
    updateConfiguration(config: Partial<ECGConfiguration>): void;
    generateBeat(startTime: number, lead: ECGLead): ECGPoint[];
    generateLead(lead: ECGLead): ECGPoint[];
    generate(): ECGData;
    generateSingleLead(lead: ECGLead): ECGLeadData;
}

declare class ECGRenderer {
    private canvas;
    private ctx;
    private options;
    constructor(canvas: HTMLCanvasElement, options?: Partial<RenderOptions>);
    private drawGrid;
    private drawTrace;
    private drawLabel;
    render(ecgData: ECGData): void;
    exportAsSVG(ecgData: ECGData): string;
    updateOptions(newOptions: Partial<RenderOptions>): void;
}

declare class ECGExporter {
    static toJSON(ecgData: ECGData): string;
    static fromJSON(jsonString: string): ECGData;
    private static validateECGData;
    static toCSV(ecgData: ECGData): string;
    static toFHIR(ecgData: ECGData, patientId?: string): object;
    private static getLeadSnomedCode;
    static downloadFile(content: string, filename: string, contentType?: string): void;
}

declare class ClinicalPatterns {
    static getPattern(pattern: ClinicalPattern): Partial<ECGConfiguration>;
    static applyPattern(baseConfig: ECGConfiguration, pattern: ClinicalPattern): ECGConfiguration;
    static getPatternDescription(pattern: ClinicalPattern): string;
    static setSTSegmentOffsets(elevation: Record<string, number>, depression: Record<string, number>): STSegmentConfig;
}

declare const LEADS: ECGLead[];
declare const LIMB_LEADS: ECGLead[];
declare const PRECORDIAL_LEADS: ECGLead[];
declare function getLeadAmplitudeMultiplier(lead: ECGLead): number;
declare function getLeadVector(lead: ECGLead): {
    x: number;
    y: number;
    z: number;
};
declare function getAnatomicalRegion(lead: ECGLead): string;

export { ClinicalPattern, ClinicalPatterns, ECGConfiguration, ECGData, ECGExporter, ECGGenerator, ECGLead, ECGLeadData, ECGPoint, ECGRenderer, LEADS, LIMB_LEADS, PRECORDIAL_LEADS, RenderOptions, STSegmentConfig, WaveformConfig, getAnatomicalRegion, getLeadAmplitudeMultiplier, getLeadVector };
