import { ECGLead } from './types';
export declare const LEADS: ECGLead[];
export declare const LIMB_LEADS: ECGLead[];
export declare const PRECORDIAL_LEADS: ECGLead[];
export declare function getLeadAmplitudeMultiplier(lead: ECGLead): number;
export declare function getLeadVector(lead: ECGLead): {
    x: number;
    y: number;
    z: number;
};
export declare function getAnatomicalRegion(lead: ECGLead): string;
//# sourceMappingURL=leads.d.ts.map