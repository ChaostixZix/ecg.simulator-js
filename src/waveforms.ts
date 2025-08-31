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
  const qc = config.qrs ?? {};
  // Defaults mirror prior behavior
  const qOffsetFrac = qc.qOffsetFrac ?? -0.3;
  const rOffsetFrac = qc.rOffsetFrac ?? 0;
  const sOffsetFrac = qc.sOffsetFrac ?? 0.3;
  const qWidthFrac  = qc.qWidthFrac  ?? 0.2;
  const rWidthFrac  = qc.rWidthFrac  ?? 0.4;
  const sWidthFrac  = qc.sWidthFrac  ?? 0.2;
  const qAmpMul     = qc.qAmpMul     ?? -0.3;
  const rAmpMul     = qc.rAmpMul     ??  1.0;
  const sAmpMul     = qc.sAmpMul     ?? -0.2;

  const qAmplitude = config.amplitude * qAmpMul;
  const rAmplitude = config.amplitude * rAmpMul;
  const sAmplitude = config.amplitude * sAmpMul;

  const qTime = centerTime + qrsWidth * qOffsetFrac;
  const rTime = centerTime + qrsWidth * rOffsetFrac;
  const sTime = centerTime + qrsWidth * sOffsetFrac;

  const qWave = generateTriangularWave(qTime, qAmplitude, qrsWidth * qWidthFrac, samplingRate);
  const rWave = generateTriangularWave(rTime, rAmplitude, qrsWidth * rWidthFrac, samplingRate);
  const sWave = generateTriangularWave(sTime, sAmplitude, qrsWidth * sWidthFrac, samplingRate);
  
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

// Advanced ST segment generator based on prompt-answer.md
// Supports two models: 'hermite' (C1) and 'sigmoidArc' (visual control, can be C2)
type STParams = {
  stModel?: 'hermite' | 'sigmoidArc';
  stTakeoffMs?: number;   // ms
  stFallMs?: number;      // ms
  stCurvature?: number;   // -1..1 (sigmoidArc mid dome shaping)
  alphaTakeoff?: number;  // 0..1 (soften initial slope)
  s1Override?: number | null; // slope at end in mV/s
};

export function generateSTSegment(
  startTime: number,
  endTime: number,
  elevation: number,
  samplingRate: number,
  // Optional context to allow matching derivatives with T-wave if available
  context?: { v0?: number; vTstart?: number; tT?: number; tTSigma?: number },
  params: STParams = {}
): ECGPoint[] {
  const points: ECGPoint[] = [];
  const duration = Math.max(0, endTime - startTime);
  const samples = Math.max(1, Math.floor(duration * samplingRate));

  // Defaults per prompt-answer.md
  const model: 'hermite' | 'sigmoidArc' = params.stModel ?? 'hermite';
  const takeMs = params.stTakeoffMs ?? 30; // 20–40 typical
  const fallMs = params.stFallMs ?? 30;     // 20–40 typical
  const curvature = params.stCurvature ?? 0.6; // convex for STEMI
  const alpha = params.alphaTakeoff ?? 1.0;

  // Value at J-point (end of QRS). If unknown, assume baseline 0 in our model.
  const v0 = context?.v0 ?? 0;
  const vPeak = v0 + elevation; // target elevation level

  // Slope at start (mV/s). If we don't have a measured QRS slope, derive from takeoff.
  let s0 = elevation / Math.max(1, takeMs) * 1000; // (mV) / (ms) -> mV/s
  s0 *= alpha;

  // Slope at end, try from context (Gaussian T) else 0
  let s1 = typeof params.s1Override === 'number' ? params.s1Override : 0;
  if (params.s1Override == null && context?.tT != null && context?.tTSigma != null && context?.vTstart != null) {
    const A = context.vTstart; // approximate T amplitude at stEnd
    const sigma = context.tTSigma;
    const dt = endTime - context.tT;
    s1 = A * (-(dt) / (sigma * sigma)) * Math.exp(- (dt * dt) / (2 * sigma * sigma));
  }

  if (model === 'hermite') {
    // Cubic Hermite interpolation ensuring C1 continuity of value and slope
    const L = Math.max(1e-6, duration);
    const m0 = s0 * L;
    const m1 = s1 * L;

    for (let i = 0; i < samples; i++) {
      const time = startTime + i / samplingRate;
      // normalized u in [0,1]
      const u = samples > 1 ? (i / (samples - 1)) : 0;
      const u2 = u * u;
      const u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;
      const amp = h00 * v0 + h10 * m0 + h01 * vPeak + h11 * m1;
      points.push({ time, amplitude: amp });
    }
  } else {
    // Sigmoid -> Arc -> Sigmoid with curvature control
    const L = Math.max(1e-6, duration);
    const r = Math.min(0.45, (takeMs / 1000) / L);
    const f = Math.min(0.45, (fallMs / 1000) / L);
    const midLen = Math.max(1e-6, 1 - r - f);
    const vEnd = context?.vTstart ?? v0; // target to blend toward T onset if known

    for (let i = 0; i < samples; i++) {
      const time = startTime + i / samplingRate;
      const u = samples > 1 ? (i / (samples - 1)) : 0;
      let amp: number;
      if (u <= r && r > 0) {
        // quintic smoothstep for takeoff
        const w = u / r;
        const S = 6 * w ** 5 - 15 * w ** 4 + 10 * w ** 3; // C2
        amp = v0 + (vPeak - v0) * S;
      } else if (u >= 1 - f && f > 0) {
        // fall toward vEnd
        const w = (u - (1 - f)) / f;
        const S = 6 * w ** 5 - 15 * w ** 4 + 10 * w ** 3; // C2
        amp = vPeak * (1 - S) + vEnd * S;
      } else {
        // mid-arc dome with curvature shaping
        const s = (u - r) / midLen; // 0..1
        const dome = (1 - Math.cos(Math.PI * s)) / 2; // 0..1
        const peakScale = 1 + 0.35 * curvature;
        amp = v0 + (vPeak - v0) * dome * peakScale;
      }
      points.push({ time, amplitude: amp });
    }
  }

  return points;
}
