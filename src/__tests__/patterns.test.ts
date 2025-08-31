import { ClinicalPatterns } from '../patterns';
import { ClinicalPattern, ECGConfiguration } from '../types';

describe('ClinicalPatterns', () => {
  const baseConfig: ECGConfiguration = {
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
    qrsWidth: 0.08
  };

  describe('getPattern', () => {
    it('should return normal pattern configuration', () => {
      const pattern = ClinicalPatterns.getPattern('normal');
      expect(pattern.heartRate).toBe(75);
      expect(pattern.stSegment?.elevation).toEqual({});
      expect(pattern.stSegment?.depression).toEqual({});
    });

    it('should return STEMI anterior pattern with appropriate ST elevations', () => {
      const pattern = ClinicalPatterns.getPattern('stemi-anterior');
      expect(pattern.stSegment?.elevation).toHaveProperty('V1');
      expect(pattern.stSegment?.elevation).toHaveProperty('V2');
      expect(pattern.stSegment?.elevation).toHaveProperty('V3');
      expect(pattern.stSegment?.elevation).toHaveProperty('V4');
    });

    it('should return STEMI inferior pattern with appropriate ST elevations', () => {
      const pattern = ClinicalPatterns.getPattern('stemi-inferior');
      expect(pattern.stSegment?.elevation).toHaveProperty('II');
      expect(pattern.stSegment?.elevation).toHaveProperty('III');
      expect(pattern.stSegment?.elevation).toHaveProperty('aVF');
    });

    it('should return NSTEMI pattern with T-wave inversions', () => {
      const pattern = ClinicalPatterns.getPattern('nstemi');
      expect(pattern.tWave?.amplitude).toBeLessThan(0);
      expect(pattern.stSegment?.depression).toHaveProperty('V4');
    });

    it('should return pericarditis pattern with widespread ST elevation', () => {
      const pattern = ClinicalPatterns.getPattern('pericarditis');
      expect(Object.keys(pattern.stSegment?.elevation || {})).toHaveLength(10);
      expect(pattern.prInterval).toBeGreaterThan(0.16);
    });

    it('should return LVH pattern with increased QRS amplitude', () => {
      const pattern = ClinicalPatterns.getPattern('lvh');
      expect(pattern.qrsComplex?.amplitude).toBeGreaterThan(1.5);
    });

    it('should return RBBB pattern with widened QRS', () => {
      const pattern = ClinicalPatterns.getPattern('rbbb');
      expect(pattern.qrsComplex?.duration).toBeGreaterThan(0.10);
    });

    it('should return LBBB pattern with widened QRS and T-wave changes', () => {
      const pattern = ClinicalPatterns.getPattern('lbbb');
      expect(pattern.qrsComplex?.duration).toBeGreaterThan(0.12);
      expect(pattern.tWave?.amplitude).toBeLessThan(0);
    });
  });

  describe('applyPattern', () => {
    it('should merge base configuration with pattern configuration', () => {
      const result = ClinicalPatterns.applyPattern(baseConfig, 'stemi-anterior');
      expect(result.heartRate).toBe(85); // from pattern
      expect(result.duration).toBe(10); // from base
      expect(result.stSegment.elevation).toHaveProperty('V1');
    });

    it('should preserve base configuration when pattern has no overrides', () => {
      const result = ClinicalPatterns.applyPattern(baseConfig, 'normal');
      expect(result.duration).toBe(baseConfig.duration);
      expect(result.samplingRate).toBe(baseConfig.samplingRate);
    });

    it('should properly merge ST segment configurations', () => {
      const configWithST = {
        ...baseConfig,
        stSegment: { 
          elevation: { 'I': 0.1 }, 
          depression: { 'V6': 0.1 } 
        }
      };

      const result = ClinicalPatterns.applyPattern(configWithST, 'stemi-anterior');
      expect(result.stSegment.elevation).toHaveProperty('V1'); // from pattern
      expect(result.stSegment.depression).toHaveProperty('II'); // from pattern
    });
  });

  describe('getPatternDescription', () => {
    const patterns: ClinicalPattern[] = [
      'normal', 'stemi-anterior', 'stemi-inferior', 'stemi-lateral',
      'nstemi', 'pericarditis', 'lvh', 'rbbb', 'lbbb'
    ];

    patterns.forEach(pattern => {
      it(`should return description for ${pattern}`, () => {
        const description = ClinicalPatterns.getPatternDescription(pattern);
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it('should return specific description for STEMI patterns', () => {
      const anteriorDesc = ClinicalPatterns.getPatternDescription('stemi-anterior');
      const inferiorDesc = ClinicalPatterns.getPatternDescription('stemi-inferior');
      
      expect(anteriorDesc).toContain('anterior');
      expect(inferiorDesc).toContain('inferior');
    });
  });

  describe('setSTSegmentOffsets', () => {
    it('should create ST segment configuration with elevation and depression', () => {
      const elevation = { 'V1': 0.3, 'V2': 0.4 };
      const depression = { 'II': 0.2 };

      const stConfig = ClinicalPatterns.setSTSegmentOffsets(elevation, depression);
      
      expect(stConfig.elevation).toEqual(elevation);
      expect(stConfig.depression).toEqual(depression);
    });

    it('should handle empty elevation and depression objects', () => {
      const stConfig = ClinicalPatterns.setSTSegmentOffsets({}, {});
      
      expect(stConfig.elevation).toEqual({});
      expect(stConfig.depression).toEqual({});
    });
  });

  describe('pattern validation', () => {
    it('should have valid heart rate ranges for all patterns', () => {
      const patterns: ClinicalPattern[] = [
        'normal', 'stemi-anterior', 'stemi-inferior', 'stemi-lateral',
        'nstemi', 'pericarditis', 'lvh', 'rbbb', 'lbbb'
      ];

      patterns.forEach(pattern => {
        const config = ClinicalPatterns.getPattern(pattern);
        if (config.heartRate) {
          expect(config.heartRate).toBeGreaterThanOrEqual(40);
          expect(config.heartRate).toBeLessThanOrEqual(150);
        }
      });
    });

    it('should have reasonable amplitude values', () => {
      const patterns: ClinicalPattern[] = [
        'stemi-anterior', 'stemi-inferior', 'nstemi', 'lvh'
      ];

      patterns.forEach(pattern => {
        const config = ClinicalPatterns.getPattern(pattern);
        if (config.qrsComplex?.amplitude) {
          expect(config.qrsComplex.amplitude).toBeGreaterThan(0);
          expect(config.qrsComplex.amplitude).toBeLessThan(3.0);
        }
      });
    });

    it('should have valid ST segment values', () => {
      const patterns: ClinicalPattern[] = [
        'stemi-anterior', 'stemi-inferior', 'pericarditis'
      ];

      patterns.forEach(pattern => {
        const config = ClinicalPatterns.getPattern(pattern);
        if (config.stSegment?.elevation) {
          Object.values(config.stSegment.elevation).forEach(value => {
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(1.0);
          });
        }
      });
    });
  });
});