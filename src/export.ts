import { ECGData } from './types';

export class ECGExporter {
  static toJSON(ecgData: ECGData): string {
    return JSON.stringify(ecgData, null, 2);
  }

  static fromJSON(jsonString: string): ECGData {
    try {
      const data = JSON.parse(jsonString);
      this.validateECGData(data);
      return data;
    } catch (error) {
      throw new Error(`Invalid ECG JSON data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static validateECGData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be an object');
    }

    if (!Array.isArray(data.leads)) {
      throw new Error('leads must be an array');
    }

    if (!data.configuration || typeof data.configuration !== 'object') {
      throw new Error('configuration must be an object');
    }

    if (typeof data.timestamp !== 'number') {
      throw new Error('timestamp must be a number');
    }

    for (const lead of data.leads) {
      if (!lead.lead || typeof lead.lead !== 'string') {
        throw new Error('Each lead must have a valid lead name');
      }

      if (!Array.isArray(lead.data)) {
        throw new Error('Each lead must have a data array');
      }

      for (const point of lead.data) {
        if (typeof point.time !== 'number' || typeof point.amplitude !== 'number') {
          throw new Error('Each data point must have numeric time and amplitude');
        }
      }
    }
  }

  static toCSV(ecgData: ECGData): string {
    const leads = ecgData.leads;
    if (leads.length === 0) return '';

    const maxLength = Math.max(...leads.map(lead => lead.data.length));
    const headers = ['time', ...leads.map(lead => lead.lead)];
    
    let csv = headers.join(',') + '\n';

    for (let i = 0; i < maxLength; i++) {
      const row: string[] = [];
      
      const time = leads[0].data[i]?.time?.toFixed(6) || '';
      row.push(time);

      for (const lead of leads) {
        const amplitude = lead.data[i]?.amplitude?.toFixed(6) || '';
        row.push(amplitude);
      }

      csv += row.join(',') + '\n';
    }

    return csv;
  }

  static toFHIR(ecgData: ECGData, patientId?: string): object {
    const fhirResource = {
      resourceType: 'Observation',
      id: `ecg-${Date.now()}`,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'survey',
          display: 'Survey'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '11524-6',
          display: '12-lead EKG'
        }]
      },
      subject: patientId ? { reference: `Patient/${patientId}` } : undefined,
      effectiveDateTime: new Date(ecgData.timestamp).toISOString(),
      component: ecgData.leads.map(leadData => ({
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: this.getLeadSnomedCode(leadData.lead),
            display: `Lead ${leadData.lead}`
          }]
        },
        valueSampledData: {
          origin: {
            value: 0,
            unit: 'mV',
            system: 'http://unitsofmeasure.org',
            code: 'mV'
          },
          period: 1000 / ecgData.configuration.samplingRate,
          factor: 1,
          lowerLimit: -5,
          upperLimit: 5,
          dimensions: 1,
          data: leadData.data.map(point => point.amplitude.toFixed(3)).join(' ')
        }
      })),
      note: [{
        text: `Generated ECG with heart rate ${ecgData.configuration.heartRate} bpm, duration ${ecgData.configuration.duration}s`
      }]
    };

    return fhirResource;
  }

  private static getLeadSnomedCode(lead: string): string {
    const codes: Record<string, string> = {
      'I': '251199002',
      'II': '251200004',
      'III': '251201000',
      'aVR': '251202007',
      'aVL': '251203002',
      'aVF': '251204008',
      'V1': '251205009',
      'V2': '251206005',
      'V3': '251207001',
      'V4': '251208006',
      'V5': '251209003',
      'V6': '251210008'
    };
    return codes[lead] || '251199002';
  }

  static downloadFile(content: string, filename: string, contentType: string = 'application/json'): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}