import { WaveformConfig, ECGPoint } from './types';

export function generateGaussianWave(
  centerTime: number,
  amplitude: number,
  sigma: number,
  duration: number,
  samplingRate: number
): ECGPoint[] {
  const points: ECGPoint[] = [];
  const samples = Math.floor(duration * samplingRate);
  const startTime = centerTime - duration / 2;
  
  for (let i = 0; i < samples; i++) {
    const time = startTime + (i / samplingRate);
    const x = time - centerTime;
    const y = amplitude * Math.exp(-(x * x) / (2 * sigma * sigma));
    points.push({ time, amplitude: y });
  }
  
  return points;
}

export function generateTriangularWave(
  centerTime: number,
  amplitude: number,
  duration: number,
  samplingRate: number
): ECGPoint[] {
  const points: ECGPoint[] = [];
  const samples = Math.floor(duration * samplingRate);
  const startTime = centerTime - duration / 2;
  const halfDuration = duration / 2;
  
  for (let i = 0; i < samples; i++) {
    const time = startTime + (i / samplingRate);
    const x = Math.abs(time - centerTime);
    const y = x <= halfDuration ? amplitude * (1 - x / halfDuration) : 0;
    points.push({ time, amplitude: y });
  }
  
  return points;
}

export function generatePWave(
  centerTime: number,
  config: WaveformConfig,
  samplingRate: number
): ECGPoint[] {
  const sigma = config.duration / 6;
  return generateGaussianWave(centerTime, config.amplitude, sigma, config.duration, samplingRate);
}

export function generateQRSComplex(
  centerTime: number,
  config: WaveformConfig,
  samplingRate: number
): ECGPoint[] {
  const points: ECGPoint[] = [];
  const qrsWidth = config.duration;
  const qAmplitude = -config.amplitude * 0.3;
  const rAmplitude = config.amplitude;
  const sAmplitude = -config.amplitude * 0.2;
  
  const qTime = centerTime - qrsWidth * 0.3;
  const rTime = centerTime;
  const sTime = centerTime + qrsWidth * 0.3;
  
  const qWave = generateTriangularWave(qTime, qAmplitude, qrsWidth * 0.2, samplingRate);
  const rWave = generateTriangularWave(rTime, rAmplitude, qrsWidth * 0.4, samplingRate);
  const sWave = generateTriangularWave(sTime, sAmplitude, qrsWidth * 0.2, samplingRate);
  
  points.push(...qWave, ...rWave, ...sWave);
  return points.sort((a, b) => a.time - b.time);
}

export function generateTWave(
  centerTime: number,
  config: WaveformConfig,
  samplingRate: number
): ECGPoint[] {
  const sigma = config.duration / 4;
  return generateGaussianWave(centerTime, config.amplitude, sigma, config.duration, samplingRate);
}

export function generateSTSegment(
  startTime: number,
  endTime: number,
  elevation: number,
  samplingRate: number
): ECGPoint[] {
  const points: ECGPoint[] = [];
  const duration = endTime - startTime;
  const samples = Math.floor(duration * samplingRate);
  
  for (let i = 0; i < samples; i++) {
    const time = startTime + (i / samplingRate);
    points.push({ time, amplitude: elevation });
  }
  
  return points;
}