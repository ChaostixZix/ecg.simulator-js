# ECG Waveform Accuracy Issue: STEMI Pattern Analysis

## Problem Statement

The current ECG simulator produces STEMI (ST-Elevation Myocardial Infarction) patterns that do not accurately represent real-life ECG morphology. The main issues are:

1. **ST Elevation appears like T-wave elevation only** - The current implementation looks more like isolated T-wave elevation rather than proper ST segment elevation
2. **Missing S-wave elevation** - In real STEMI, the S-wave should be elevated (less negative) to create smooth transition to ST elevation
3. **T-wave not properly coordinated** - T-waves should be elevated and coordinated with ST changes
4. **ST segment morphology** - Should show characteristic convex (dome-shaped) morphology in STEMI

## Current Mathematical Implementation

### QRS Complex Generation (S-wave)
```typescript
// From waveforms.ts - generateQRSComplex()
const sAmpMul = qc.sAmpMul ?? -0.2;  // Default S-wave amplitude multiplier
const sAmplitude = config.amplitude * sAmpMul;  // Usually negative
```

### ST Segment Generation
```typescript
// From waveforms.ts - generateSTSegment()
// Uses Hermite interpolation or sigmoid-arc model
const v0 = context?.v0 ?? 0;  // J-point (end of QRS)
const vPeak = v0 + elevation;  // Target elevation level
```

### T-wave Generation
```typescript
// From waveforms.ts - generateTWave()
const sigma = config.duration / 4;
return generateGaussianWave(centerTime, config.amplitude, sigma, config.duration, samplingRate);
```

### Current STEMI Patterns Configuration
```typescript
// From patterns.ts
'stemi-anterior': {
  stSegment: {
    elevation: { V1: 0.3, V2: 0.4, V3: 0.5, V4: 0.4 },
    depression: { II: 0.1, III: 0.1, aVF: 0.1 }
  },
  qrsComplex: { 
    qrs: { sAmpMul: -0.05 }  // Slightly raised S-wave but not enough
  },
  tWave: { amplitude: 0.5 }  // Not coordinated with ST elevation
}
```

## Issues with Current Approach

1. **Independent Waveform Generation**: Each waveform (QRS, ST, T) is generated independently and then added together, but this doesn't create the smooth morphological transitions seen in real STEMI

2. **S-wave Elevation Insufficient**: Current `sAmpMul: -0.05` only slightly reduces S-wave negativity, but doesn't create proper elevation that merges smoothly with ST segment

3. **T-wave Not Elevated in STEMI Leads**: Real STEMI shows elevated T-waves that are often merged with the ST elevation, creating a "tombstone" or "hyperacute T-wave" appearance

4. **ST-T Wave Integration Missing**: The ST segment and T-wave should form a continuous elevated complex, not separate components

## Real STEMI ECG Morphology Should Show:

1. **S-wave elevation**: S-wave becomes less negative or even positive in affected leads
2. **ST elevation with convex morphology**: Characteristic dome or tombstone shape
3. **Elevated T-waves**: Often tall, peaked, and merged with ST elevation
4. **Smooth transitions**: QRS → ST → T should flow smoothly without discontinuities

## Questions for ChatGPT/AI Assistant:

1. **What mathematical formulas would better model the integrated QRS-ST-T complex in STEMI?**
   - Should we use a single mathematical function that describes the entire post-QRS morphology?
   - How can we model the smooth transition from elevated S-wave through ST segment to T-wave?

2. **How should S-wave elevation be calculated in STEMI patterns?**
   - What's the relationship between ST elevation magnitude and S-wave elevation?
   - Should S-wave amplitude become progressively less negative or even positive?

3. **What's the proper mathematical relationship between ST elevation and T-wave amplitude?**
   - Should T-wave amplitude increase proportionally with ST elevation?
   - How should the T-wave width/duration change with ST elevation?

4. **For the convex ST segment morphology in STEMI:**
   - What mathematical function best describes the "tombstone" or "dome" shape?
   - Should we use polynomial, exponential, or trigonometric functions?
   - How should the curvature parameter be related to the degree of ST elevation?

5. **Integration approach:**
   - Should we generate QRS-ST-T as a single continuous function rather than separate components?
   - What's the best way to ensure C1 or C2 continuity between segments?
   - How do we maintain the ability to adjust individual wave parameters while ensuring realistic morphology?

## Proposed Solution Direction:

We need to move from additive waveform combination to an integrated morphological approach where:
- S-wave elevation is calculated as a function of ST elevation
- T-wave characteristics are adjusted based on ST elevation
- The ST segment uses proper convex morphology
- All components blend smoothly with mathematical continuity

Please provide specific mathematical formulas and implementation approaches for these improvements.