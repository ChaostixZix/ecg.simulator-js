import { ECGConfiguration, ClinicalPattern, STSegmentConfig } from './types';

export class ClinicalPatterns {
  static getPattern(pattern: ClinicalPattern): Partial<ECGConfiguration> {
    const patterns: Record<ClinicalPattern, Partial<ECGConfiguration>> = {
      normal: {
        heartRate: 75,
        stSegment: { elevation: {}, depression: {} },
        pWave: { amplitude: 0.2, duration: 0.08, shape: 'gaussian' },
        qrsComplex: { amplitude: 1.0, duration: 0.08, shape: 'triangular' },
        tWave: { amplitude: 0.3, duration: 0.16, shape: 'gaussian' }
      },

      'stemi-anterior': {
        heartRate: 85,
        stSegment: {
          elevation: { V1: 0.3, V2: 0.4, V3: 0.5, V4: 0.4 },
          depression: { II: 0.1, III: 0.1, aVF: 0.1 }
        },
        qrsComplex: { 
          amplitude: 1.2, duration: 0.08, shape: 'triangular',
          // Raise S-wave (less negative) to visually match early ST elevation takeoff
          qrs: { sAmpMul: -0.05 }
        },
        tWave: { amplitude: 0.5, duration: 0.18, shape: 'gaussian' }
      },

      'stemi-inferior': {
        heartRate: 65,
        stSegment: {
          elevation: { II: 0.4, III: 0.5, aVF: 0.4 },
          depression: { I: 0.1, aVL: 0.15, V2: 0.1 }
        },
        qrsComplex: { 
          amplitude: 1.1, duration: 0.08, shape: 'triangular',
          qrs: { sAmpMul: -0.05 }
        },
        tWave: { amplitude: 0.4, duration: 0.17, shape: 'gaussian' }
      },

      'stemi-lateral': {
        heartRate: 90,
        stSegment: {
          elevation: { I: 0.3, aVL: 0.4, V5: 0.4, V6: 0.3 },
          depression: { II: 0.1, III: 0.1, aVF: 0.1 }
        },
        qrsComplex: { 
          amplitude: 1.3, duration: 0.08, shape: 'triangular',
          qrs: { sAmpMul: -0.05 }
        },
        tWave: { amplitude: 0.4, duration: 0.16, shape: 'gaussian' }
      },

      nstemi: {
        heartRate: 88,
        stSegment: {
          elevation: {},
          depression: { V4: 0.2, V5: 0.2, V6: 0.15 }
        },
        tWave: { amplitude: -0.2, duration: 0.16, shape: 'gaussian' },
        qrsComplex: { amplitude: 1.0, duration: 0.08, shape: 'triangular' }
      },

      pericarditis: {
        heartRate: 95,
        stSegment: {
          elevation: { 
            I: 0.15, II: 0.2, III: 0.15,
            aVL: 0.1, aVF: 0.2,
            V2: 0.2, V3: 0.25, V4: 0.2, V5: 0.15, V6: 0.1
          },
          depression: { aVR: 0.1 }
        },
        prInterval: 0.18,
        tWave: { amplitude: 0.25, duration: 0.16, shape: 'gaussian' }
      },

      lvh: {
        heartRate: 70,
        stSegment: {
          elevation: {},
          depression: { V5: 0.1, V6: 0.1 }
        },
        qrsComplex: { amplitude: 1.8, duration: 0.10, shape: 'triangular' },
        tWave: { amplitude: -0.3, duration: 0.16, shape: 'gaussian' }
      },

      rbbb: {
        heartRate: 75,
        stSegment: { elevation: {}, depression: {} },
        qrsComplex: { amplitude: 1.0, duration: 0.12, shape: 'triangular' },
        tWave: { amplitude: -0.2, duration: 0.16, shape: 'gaussian' }
      },

      lbbb: {
        heartRate: 75,
        stSegment: { elevation: {}, depression: {} },
        qrsComplex: { amplitude: 1.0, duration: 0.14, shape: 'triangular' },
        tWave: { amplitude: -0.3, duration: 0.16, shape: 'gaussian' },
        prInterval: 0.18
      }
    };

    return patterns[pattern];
  }

  static applyPattern(baseConfig: ECGConfiguration, pattern: ClinicalPattern): ECGConfiguration {
    const patternConfig = this.getPattern(pattern);
    return {
      ...baseConfig,
      ...patternConfig,
      stSegment: {
        ...baseConfig.stSegment,
        ...patternConfig.stSegment
      }
    };
  }

  static getPatternDescription(pattern: ClinicalPattern): string {
    const descriptions: Record<ClinicalPattern, string> = {
      normal: 'Normal sinus rhythm with typical PQRST morphology',
      'stemi-anterior': 'ST-elevation myocardial infarction affecting anterior wall (V1-V4)',
      'stemi-inferior': 'ST-elevation myocardial infarction affecting inferior wall (II, III, aVF)',
      'stemi-lateral': 'ST-elevation myocardial infarction affecting lateral wall (I, aVL, V5-V6)',
      nstemi: 'Non-ST elevation myocardial infarction with T-wave inversions',
      pericarditis: 'Acute pericarditis with widespread ST elevation and PR depression',
      lvh: 'Left ventricular hypertrophy with increased QRS amplitude',
      rbbb: 'Right bundle branch block with widened QRS complex',
      lbbb: 'Left bundle branch block with widened QRS complex and T-wave inversions'
    };

    return descriptions[pattern];
  }

  static setSTSegmentOffsets(elevation: Record<string, number>, depression: Record<string, number>): STSegmentConfig {
    return {
      elevation: elevation as any,
      depression: depression as any
    };
  }
}
