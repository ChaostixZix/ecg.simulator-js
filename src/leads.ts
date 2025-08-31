import { ECGLead } from './types';

export const LEADS: ECGLead[] = [
  'I', 'II', 'III',
  'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6'
];

export const LIMB_LEADS: ECGLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
export const PRECORDIAL_LEADS: ECGLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export function getLeadAmplitudeMultiplier(lead: ECGLead): number {
  const multipliers: Record<ECGLead, number> = {
    'I': 1.0,
    'II': 1.2,
    'III': 0.8,
    'aVR': -0.5,
    'aVL': 0.6,
    'aVF': 0.9,
    'V1': 0.4,
    'V2': 0.8,
    'V3': 1.3,
    'V4': 1.5,
    'V5': 1.2,
    'V6': 0.9
  };
  
  return multipliers[lead];
}

export function getLeadVector(lead: ECGLead): { x: number; y: number; z: number } {
  const vectors: Record<ECGLead, { x: number; y: number; z: number }> = {
    'I': { x: 1, y: 0, z: 0 },
    'II': { x: 0.5, y: -0.866, z: 0 },
    'III': { x: -0.5, y: -0.866, z: 0 },
    'aVR': { x: -0.866, y: 0.5, z: 0 },
    'aVL': { x: 0.866, y: 0.5, z: 0 },
    'aVF': { x: 0, y: -1, z: 0 },
    'V1': { x: 0.1, y: 0, z: -0.9 },
    'V2': { x: 0.3, y: 0, z: -0.8 },
    'V3': { x: 0.5, y: 0, z: -0.5 },
    'V4': { x: 0.7, y: 0, z: 0 },
    'V5': { x: 0.8, y: 0.2, z: 0.3 },
    'V6': { x: 0.9, y: 0.4, z: 0.2 }
  };
  
  return vectors[lead];
}

export function getAnatomicalRegion(lead: ECGLead): string {
  const regions: Record<ECGLead, string> = {
    'I': 'lateral',
    'II': 'inferior',
    'III': 'inferior',
    'aVR': 'right',
    'aVL': 'lateral',
    'aVF': 'inferior',
    'V1': 'septal',
    'V2': 'septal',
    'V3': 'anterior',
    'V4': 'anterior',
    'V5': 'lateral',
    'V6': 'lateral'
  };
  
  return regions[lead];
}