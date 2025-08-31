import { ECGConfiguration, ECGData, ECGLeadData, ECGPoint, ECGLead } from './types';
import { generatePWave, generateQRSComplex, generateTWave, generateSTSegment } from './waveforms';
import { LEADS, getLeadAmplitudeMultiplier } from './leads';

export class ECGGenerator {
  private config: ECGConfiguration;

  constructor(config: Partial<ECGConfiguration> = {}) {
    this.config = {
      heartRate: 75,
      duration: 10,
      samplingRate: 1000,
      amplitude: 1.0,
      pWave: { amplitude: 0.2, duration: 0.08, shape: 'gaussian' },
      qrsComplex: { amplitude: 1.0, duration: 0.08, shape: 'triangular' },
      tWave: { amplitude: 0.3, duration: 0.16, shape: 'gaussian' },
      stSegment: { elevation: {}, depression: {} },
      prInterval: 0.16,
      qtInterval: 0.40,
      qrsWidth: 0.08,
      ...config
    };
  }

  updateConfiguration(config: Partial<ECGConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  generateBeat(startTime: number, lead: ECGLead): ECGPoint[] {
    const points: ECGPoint[] = [];
    const leadMultiplier = getLeadAmplitudeMultiplier(lead);
    const beatDuration = 60 / this.config.heartRate;
    
    const pTime = startTime + 0.02;
    const qrsTime = startTime + this.config.prInterval;
    const stStart = qrsTime + this.config.qrsWidth / 2;
    const stEnd = startTime + this.config.qtInterval - this.config.tWave.duration / 2;
    const tTime = startTime + this.config.qtInterval;

    const pWave = generatePWave(pTime, {
      ...this.config.pWave,
      amplitude: this.config.pWave.amplitude * this.config.amplitude * leadMultiplier
    }, this.config.samplingRate);

    const qrsWave = generateQRSComplex(qrsTime, {
      ...this.config.qrsComplex,
      amplitude: this.config.qrsComplex.amplitude * this.config.amplitude * leadMultiplier
    }, this.config.samplingRate);

    const stElevation = this.config.stSegment.elevation[lead] || 0;
    const stDepression = this.config.stSegment.depression[lead] || 0;
    const stOffset = (stElevation - stDepression) * this.config.amplitude * leadMultiplier;
    
    const stSegment = generateSTSegment(stStart, stEnd, stOffset, this.config.samplingRate);

    const tWave = generateTWave(tTime, {
      ...this.config.tWave,
      amplitude: this.config.tWave.amplitude * this.config.amplitude * leadMultiplier
    }, this.config.samplingRate);

    const baseline = Array.from({ length: Math.floor(beatDuration * this.config.samplingRate) }, (_, i) => ({
      time: startTime + i / this.config.samplingRate,
      amplitude: 0
    }));

    points.push(...baseline);

    const addWaveToBaseline = (wave: ECGPoint[]) => {
      wave.forEach(point => {
        const index = points.findIndex(p => Math.abs(p.time - point.time) < 1 / (2 * this.config.samplingRate));
        if (index >= 0) {
          points[index].amplitude += point.amplitude;
        }
      });
    };

    addWaveToBaseline(pWave);
    addWaveToBaseline(qrsWave);
    addWaveToBaseline(stSegment);
    addWaveToBaseline(tWave);

    return points.sort((a, b) => a.time - b.time);
  }

  generateLead(lead: ECGLead): ECGPoint[] {
    const points: ECGPoint[] = [];
    const beatDuration = 60 / this.config.heartRate;
    const numBeats = Math.ceil(this.config.duration / beatDuration);

    for (let i = 0; i < numBeats; i++) {
      const beatStartTime = i * beatDuration;
      const beatPoints = this.generateBeat(beatStartTime, lead);
      points.push(...beatPoints.filter(p => p.time <= this.config.duration));
    }

    return points;
  }

  generate(): ECGData {
    const leads: ECGLeadData[] = LEADS.map(lead => ({
      lead,
      data: this.generateLead(lead)
    }));

    return {
      leads,
      configuration: this.config,
      timestamp: Date.now()
    };
  }

  generateSingleLead(lead: ECGLead): ECGLeadData {
    return {
      lead,
      data: this.generateLead(lead)
    };
  }
}