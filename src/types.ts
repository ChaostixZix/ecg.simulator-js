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
}
