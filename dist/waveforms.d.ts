import { WaveformConfig, ECGPoint } from './types';
export declare function generateGaussianWave(centerTime: number, amplitude: number, sigma: number, duration: number, samplingRate: number): ECGPoint[];
export declare function generateTriangularWave(centerTime: number, amplitude: number, duration: number, samplingRate: number): ECGPoint[];
export declare function generatePWave(centerTime: number, config: WaveformConfig, samplingRate: number): ECGPoint[];
export declare function generateQRSComplex(centerTime: number, config: WaveformConfig, samplingRate: number): ECGPoint[];
export declare function generateTWave(centerTime: number, config: WaveformConfig, samplingRate: number): ECGPoint[];
export declare function generateSTSegment(startTime: number, endTime: number, elevation: number, samplingRate: number): ECGPoint[];
//# sourceMappingURL=waveforms.d.ts.map