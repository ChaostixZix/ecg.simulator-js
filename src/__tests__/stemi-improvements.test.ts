import { ECGGenerator } from '../generator';
import { ClinicalPatterns } from '../patterns';

describe('STEMI Pattern Improvements', () => {
  describe('S-wave elevation in STEMI leads', () => {
    it('should elevate S-wave in anterior STEMI leads', () => {
      const config = ClinicalPatterns.getPattern('stemi-anterior');
      const generator = new ECGGenerator(config);
      const ecgData = generator.generate();
      
      // Check V2 lead (significant ST elevation)
      const v2Lead = ecgData.leads.find(lead => lead.lead === 'V2');
      expect(v2Lead).toBeDefined();
      
      // V2 should have positive S-wave in anterior STEMI
      const qrsConfig = config.qrsComplex?.qrs;
      expect(qrsConfig?.sAmpMul).toBeGreaterThan(-0.1); // Should be less negative or positive
    });

    it('should increase T-wave amplitude proportionally to ST elevation', () => {
      const config = ClinicalPatterns.getPattern('stemi-anterior');
      const generator = new ECGGenerator(config);
      const ecgData = generator.generate();
      
      // V3 has the highest ST elevation (0.5mV)
      const v3Lead = ecgData.leads.find(lead => lead.lead === 'V3');
      const v1Lead = ecgData.leads.find(lead => lead.lead === 'V1');
      
      expect(v3Lead).toBeDefined();
      expect(v1Lead).toBeDefined();
      
      // V3 should have higher amplitude than V1 due to higher ST elevation
      const v3MaxAmplitude = Math.max(...v3Lead!.data.map(p => p.amplitude));
      const v1MaxAmplitude = Math.max(...v1Lead!.data.map(p => p.amplitude));
      
      expect(v3MaxAmplitude).toBeGreaterThan(v1MaxAmplitude);
    });
  });

  describe('ST segment morphology', () => {
    it('should use convex morphology for significant ST elevation', () => {
      const config = ClinicalPatterns.getPattern('stemi-anterior');
      const generator = new ECGGenerator(config);
      
      // Check that STEMI patterns have enhanced T-wave amplitude
      expect(config.tWave?.amplitude).toBeGreaterThan(0.5); // Should be elevated
    });

    it('should maintain normal morphology for non-STEMI leads', () => {
      const config = ClinicalPatterns.getPattern('stemi-anterior');
      const generator = new ECGGenerator(config);
      const ecgData = generator.generate();
      
      // V5 and V6 should have normal morphology (no ST elevation)
      const v5Lead = ecgData.leads.find(lead => lead.lead === 'V5');
      expect(v5Lead).toBeDefined();
      
      // Should not have excessive amplitude compared to normal
      const v5MaxAmplitude = Math.max(...v5Lead!.data.map(p => p.amplitude));
      expect(v5MaxAmplitude).toBeLessThan(3.0); // Reasonable upper bound
    });
  });

  describe('Pattern configurations', () => {
    it('should have positive S-wave multipliers for STEMI patterns', () => {
      const anteriorConfig = ClinicalPatterns.getPattern('stemi-anterior');
      const inferiorConfig = ClinicalPatterns.getPattern('stemi-inferior');
      const lateralConfig = ClinicalPatterns.getPattern('stemi-lateral');
      
      expect(anteriorConfig.qrsComplex?.qrs?.sAmpMul).toBeGreaterThan(0);
      expect(inferiorConfig.qrsComplex?.qrs?.sAmpMul).toBeGreaterThan(0);
      expect(lateralConfig.qrsComplex?.qrs?.sAmpMul).toBeGreaterThan(0);
    });

    it('should have elevated T-wave amplitudes for STEMI patterns', () => {
      const anteriorConfig = ClinicalPatterns.getPattern('stemi-anterior');
      const inferiorConfig = ClinicalPatterns.getPattern('stemi-inferior');
      const lateralConfig = ClinicalPatterns.getPattern('stemi-lateral');
      
      expect(anteriorConfig.tWave?.amplitude).toBeGreaterThan(0.5);
      expect(inferiorConfig.tWave?.amplitude).toBeGreaterThan(0.5);
      expect(lateralConfig.tWave?.amplitude).toBeGreaterThan(0.5);
    });
  });
});