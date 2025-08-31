export type ECGLead = 
  | 'I' | 'II' | 'III' 
  | 'aVR' | 'aVL' | 'aVF'
  | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export interface ECGPoint {
  time: number;
  amplitude: number;
}

export interface ECGLeadData {
  lead: ECGLead;
  data: ECGPoint[];
}

export interface ECGConfiguration {
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

export interface WaveformConfig {
  amplitude: number;
  duration: number;
  shape: 'gaussian' | 'triangular' | 'custom';
  // Optional fine control for QRS only (ignored by P/T)
  qrs?: {
    // Time offsets relative to center in fractions of duration (e.g., -0.3 means 30% of duration before center)
    qOffsetFrac?: number; // default -0.3
    rOffsetFrac?: number; // default 0
    sOffsetFrac?: number; // default +0.3
    // Widths as fractions of total QRS duration that shape each component
    qWidthFrac?: number;  // default 0.2
    rWidthFrac?: number;  // default 0.4
    sWidthFrac?: number;  // default 0.2
    // Amplitude multipliers relative to base amplitude (Q/S negative by default)
    qAmpMul?: number;     // default -0.3
    rAmpMul?: number;     // default +1.0
    sAmpMul?: number;     // default -0.2
  };
}

export interface STSegmentConfig {
  elevation: Partial<Record<ECGLead, number>>;
  depression: Partial<Record<ECGLead, number>>;
}

export interface ECGData {
  leads: ECGLeadData[];
  configuration: ECGConfiguration;
  timestamp: number;
}

export type ClinicalPattern = 
  | 'normal'
  | 'stemi-anterior'
  | 'stemi-inferior'
  | 'stemi-lateral'
  | 'nstemi'
  | 'pericarditis'
  | 'lvh'
  | 'rbbb'
  | 'lbbb';

export interface RenderOptions {
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
  startTime?: number; // seconds; clinical window start
}
