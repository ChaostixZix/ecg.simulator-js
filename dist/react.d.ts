import React from 'react';

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
    qrs?: {
        qOffsetFrac?: number;
        rOffsetFrac?: number;
        sOffsetFrac?: number;
        qWidthFrac?: number;
        rWidthFrac?: number;
        sWidthFrac?: number;
        qAmpMul?: number;
        rAmpMul?: number;
        sAmpMul?: number;
    };
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

interface ECGCanvasProps {
    configuration?: Partial<ECGConfiguration>;
    renderOptions?: Partial<RenderOptions>;
    pattern?: ClinicalPattern;
    width?: number;
    height?: number;
    onECGGenerated?: (data: ECGData) => void;
    className?: string;
    style?: React.CSSProperties;
}
interface ECGCanvasRef {
    generateECG: () => ECGData;
    exportAsJSON: () => string;
    exportAsCSV: () => string;
    exportAsSVG: () => string;
    downloadJSON: (filename?: string) => void;
    downloadCSV: (filename?: string) => void;
    downloadSVG: (filename?: string) => void;
    getECGData: () => ECGData | null;
    updateConfiguration: (config: Partial<ECGConfiguration>) => void;
    updateRenderOptions: (options: Partial<RenderOptions>) => void;
}
declare const ECGCanvas: any;
interface ECGControlPanelProps {
    onConfigurationChange?: (config: Partial<ECGConfiguration>) => void;
    onPatternChange?: (pattern: ClinicalPattern) => void;
    onRenderOptionsChange?: (options: Partial<RenderOptions>) => void;
    initialConfiguration?: Partial<ECGConfiguration>;
    initialPattern?: ClinicalPattern;
    initialRenderOptions?: Partial<RenderOptions>;
    className?: string;
    style?: React.CSSProperties;
}
declare const ECGControlPanel: React.FC<ECGControlPanelProps>;
interface ECGSimulatorProps {
    width?: number;
    height?: number;
    initialConfiguration?: Partial<ECGConfiguration>;
    initialPattern?: ClinicalPattern;
    initialRenderOptions?: Partial<RenderOptions>;
    onECGGenerated?: (data: ECGData) => void;
    showControls?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
declare const ECGSimulator: React.FC<ECGSimulatorProps>;

export { ECGCanvas, ECGCanvasProps, ECGCanvasRef, ECGControlPanel, ECGControlPanelProps, ECGSimulator, ECGSimulatorProps };
