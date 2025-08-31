import { ECGConfiguration, ECGData, ECGLeadData, ECGPoint, ECGLead } from './types';
export declare class ECGGenerator {
    private config;
    constructor(config?: Partial<ECGConfiguration>);
    updateConfiguration(config: Partial<ECGConfiguration>): void;
    generateBeat(startTime: number, lead: ECGLead): ECGPoint[];
    generateLead(lead: ECGLead): ECGPoint[];
    generate(): ECGData;
    generateSingleLead(lead: ECGLead): ECGLeadData;
}
//# sourceMappingURL=generator.d.ts.map