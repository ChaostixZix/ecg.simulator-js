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
  const duration = Math.max(0, endTime - startTime);
  const samples = Math.max(1, Math.floor(duration * samplingRate));

  // Smooth the ST onsets/offsets to avoid boxy corners.
  // Use short raised-cosine (Hann) tapers at both ends.
  const maxTaper = 0.04; // 40 ms typical J-point smoothing
  const taper = Math.min(maxTaper, duration * 0.3); // up to 30% of ST duration
  const rampIn = taper;
  const rampOut = taper;

  for (let i = 0; i < samples; i++) {
    const time = startTime + i / samplingRate;
    const rel = time - startTime;

    let w = 1;
    if (rel < rampIn && rampIn > 0) {
      // 0 -> 1 with raised cosine
      const x = rel / rampIn; // 0..1
      w = 0.5 - 0.5 * Math.cos(Math.PI * x);
    } else if (rel > duration - rampOut && rampOut > 0) {
      // 1 -> 0 with raised cosine
      const x = (duration - rel) / rampOut; // 1..0
      w = 0.5 - 0.5 * Math.cos(Math.PI * x);
    }

    points.push({ time, amplitude: elevation * w });
  }

  return points;
}