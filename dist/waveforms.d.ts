import { WaveformConfig, ECGPoint } from './types';
export declare function generateGaussianWave(centerTime: number, amplitude: number, sigma: number, duration: number, samplingRate: number): ECGPoint[];
export declare function generateTriangularWave(centerTime: number, amplitude: number, duration: number, samplingRate: number): ECGPoint[];
export declare function generatePWave(centerTime: number, config: WaveformConfig, samplingRate: number): ECGPoint[];
export declare function generateQRSComplex(centerTime: number, config: WaveformConfig, samplingRate: number): ECGPoint[];
export declare function generateTWave(centerTime: number, config: WaveformConfig, samplingRate: number): ECGPoint[];
type STParams = {
    stModel?: 'hermite' | 'sigmoidArc';
    stTakeoffMs?: number;
    stFallMs?: number;
    stCurvature?: number;
    alphaTakeoff?: number;
    s1Override?: number | null;
};
export declare function generateSTSegment(startTime: number, endTime: number, elevation: number, samplingRate: number, context?: {
    v0?: number;
    vTstart?: number;
    tT?: number;
    tTSigma?: number;
}, params?: STParams): ECGPoint[];
export {};
//# sourceMappingURL=waveforms.d.ts.map