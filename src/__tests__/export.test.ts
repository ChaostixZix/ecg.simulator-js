import { ECGExporter } from '../export';
import { ECGData, ECGLeadData } from '../types';

describe('ECGExporter', () => {
  let mockECGData: ECGData;

  beforeEach(() => {
    mockECGData = {
      leads: [
        {
          lead: 'I' as const,
          data: [
            { time: 0, amplitude: 0 },
            { time: 0.001, amplitude: 0.5 },
            { time: 0.002, amplitude: 0 }
          ]
        },
        {
          lead: 'II' as const,
          data: [
            { time: 0, amplitude: 0 },
            { time: 0.001, amplitude: 0.8 },
            { time: 0.002, amplitude: 0 }
          ]
        }
      ],
      configuration: {
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
      },
      timestamp: 1642800000000
    };
  });

  describe('toJSON', () => {
    it('should export ECG data as formatted JSON string', () => {
      const jsonString = ECGExporter.toJSON(mockECGData);
      expect(typeof jsonString).toBe('string');
      
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(mockECGData);
    });

    it('should format JSON with proper indentation', () => {
      const jsonString = ECGExporter.toJSON(mockECGData);
      expect(jsonString).toContain('  "leads": [');
      expect(jsonString).toContain('    {');
    });
  });

  describe('fromJSON', () => {
    it('should import valid JSON string to ECG data', () => {
      const jsonString = ECGExporter.toJSON(mockECGData);
      const imported = ECGExporter.fromJSON(jsonString);
      expect(imported).toEqual(mockECGData);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      expect(() => ECGExporter.fromJSON(invalidJson)).toThrow('Invalid ECG JSON data');
    });

    it('should throw error for missing leads array', () => {
      const invalidData = JSON.stringify({ configuration: {}, timestamp: 123 });
      expect(() => ECGExporter.fromJSON(invalidData)).toThrow('leads must be an array');
    });

    it('should throw error for missing configuration', () => {
      const invalidData = JSON.stringify({ leads: [], timestamp: 123 });
      expect(() => ECGExporter.fromJSON(invalidData)).toThrow('configuration must be an object');
    });

    it('should throw error for invalid timestamp', () => {
      const invalidData = JSON.stringify({ 
        leads: [], 
        configuration: {},
        timestamp: 'invalid'
      });
      expect(() => ECGExporter.fromJSON(invalidData)).toThrow('timestamp must be a number');
    });
  });

  describe('toCSV', () => {
    it('should export ECG data as CSV format', () => {
      const csv = ECGExporter.toCSV(mockECGData);
      const lines = csv.trim().split('\n');
      
      expect(lines[0]).toBe('time,I,II');
      expect(lines[1]).toBe('0.000000,0.000000,0.000000');
      expect(lines[2]).toBe('0.001000,0.500000,0.800000');
    });

    it('should handle empty data gracefully', () => {
      const emptyData = { ...mockECGData, leads: [] };
      const csv = ECGExporter.toCSV(emptyData);
      expect(csv).toBe('');
    });

    it('should pad missing values with empty strings', () => {
      const unevenData = {
        ...mockECGData,
        leads: [
          {
            lead: 'I' as const,
            data: [{ time: 0, amplitude: 0.1 }, { time: 0.001, amplitude: 0.2 }]
          },
          {
            lead: 'II' as const,
            data: [{ time: 0, amplitude: 0.3 }]
          }
        ]
      };
      
      const csv = ECGExporter.toCSV(unevenData);
      const lines = csv.trim().split('\n');
      expect(lines[2]).toBe('0.001000,0.200000,');
    });
  });

  describe('toFHIR', () => {
    it('should export ECG data in FHIR format', () => {
      const fhirResource = ECGExporter.toFHIR(mockECGData);
      
      expect(fhirResource).toHaveProperty('resourceType', 'Observation');
      expect(fhirResource).toHaveProperty('status', 'final');
      expect(fhirResource).toHaveProperty('code');
      expect(fhirResource).toHaveProperty('component');
    });

    it('should include patient reference when provided', () => {
      const fhirResource = ECGExporter.toFHIR(mockECGData, 'patient123');
      expect(fhirResource).toHaveProperty('subject');
      expect((fhirResource as any).subject.reference).toBe('Patient/patient123');
    });

    it('should convert timestamp to ISO format', () => {
      const fhirResource = ECGExporter.toFHIR(mockECGData);
      expect((fhirResource as any).effectiveDateTime).toBe(new Date(mockECGData.timestamp).toISOString());
    });

    it('should create component for each lead', () => {
      const fhirResource = ECGExporter.toFHIR(mockECGData) as any;
      expect(fhirResource.component).toHaveLength(2);
      
      expect(fhirResource.component[0].code.coding[0].display).toBe('Lead I');
      expect(fhirResource.component[1].code.coding[0].display).toBe('Lead II');
    });

    it('should format sampled data correctly', () => {
      const fhirResource = ECGExporter.toFHIR(mockECGData) as any;
      const component = fhirResource.component[0];
      
      expect(component.valueSampledData.origin.value).toBe(0);
      expect(component.valueSampledData.origin.unit).toBe('mV');
      expect(component.valueSampledData.data).toBe('0.000 0.500 0.000');
    });
  });

  describe('downloadFile', () => {
    let mockCreateElement: jest.SpyInstance;
    let mockAppendChild: jest.SpyInstance;
    let mockRemoveChild: jest.SpyInstance;
    let mockClick: jest.SpyInstance;
    let mockCreateObjectURL: jest.Mock;
    let mockRevokeObjectURL: jest.Mock;

    beforeEach(() => {
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };

      mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
      mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation();
      mockClick = mockLink.click;
      
      mockCreateObjectURL = jest.fn(() => 'blob:url');
      mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create download link and trigger download', () => {
      ECGExporter.downloadFile('test content', 'test.json', 'application/json');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('should create blob with correct content and type', () => {
      global.Blob = jest.fn().mockImplementation((content, options) => ({
        content,
        options
      }));

      ECGExporter.downloadFile('test content', 'test.json', 'application/json');

      expect(Blob).toHaveBeenCalledWith(['test content'], { type: 'application/json' });
    });

    it('should clean up object URL after download', () => {
      ECGExporter.downloadFile('test content', 'test.json');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
    });
  });

  describe('integration tests', () => {
    it('should maintain data integrity through JSON export/import cycle', () => {
      const exported = ECGExporter.toJSON(mockECGData);
      const imported = ECGExporter.fromJSON(exported);
      
      expect(imported.leads).toHaveLength(mockECGData.leads.length);
      expect(imported.configuration.heartRate).toBe(mockECGData.configuration.heartRate);
      expect(imported.timestamp).toBe(mockECGData.timestamp);
    });

    it('should handle complex ECG data with ST changes', () => {
      const complexData = {
        ...mockECGData,
        configuration: {
          ...mockECGData.configuration,
          stSegment: {
            elevation: { 'V1': 0.3, 'V2': 0.4 },
            depression: { 'II': 0.2 }
          }
        }
      };

      const exported = ECGExporter.toJSON(complexData);
      const imported = ECGExporter.fromJSON(exported);
      
      expect(imported.configuration.stSegment.elevation).toEqual({ 'V1': 0.3, 'V2': 0.4 });
      expect(imported.configuration.stSegment.depression).toEqual({ 'II': 0.2 });
    });
  });
});