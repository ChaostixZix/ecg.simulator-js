import React from 'react';
import { ECGConfiguration, ECGData, RenderOptions, ClinicalPattern } from './types';
export interface ECGCanvasProps {
    configuration?: Partial<ECGConfiguration>;
    renderOptions?: Partial<RenderOptions>;
    pattern?: ClinicalPattern;
    width?: number;
    height?: number;
    onECGGenerated?: (data: ECGData) => void;
    className?: string;
    style?: React.CSSProperties;
}
export interface ECGCanvasRef {
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
export declare const ECGCanvas: any;
export interface ECGControlPanelProps {
    onConfigurationChange?: (config: Partial<ECGConfiguration>) => void;
    onPatternChange?: (pattern: ClinicalPattern) => void;
    onRenderOptionsChange?: (options: Partial<RenderOptions>) => void;
    initialConfiguration?: Partial<ECGConfiguration>;
    initialPattern?: ClinicalPattern;
    initialRenderOptions?: Partial<RenderOptions>;
    className?: string;
    style?: React.CSSProperties;
}
export declare const ECGControlPanel: React.FC<ECGControlPanelProps>;
export interface ECGSimulatorProps {
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
export declare const ECGSimulator: React.FC<ECGSimulatorProps>;
//# sourceMappingURL=react.d.ts.map