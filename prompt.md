📌 AI Prompt: Design Mathematical ST-Segment Morphology (No Smoothing Hacks)

Goal
- Replace our current boxy ST elevation with a mathematically grounded, clinically realistic model. Do not use generic smoothing tricks; propose explicit analytic/parametric functions that produce the characteristic STEMI shapes with proper continuity at the J-point and T-onset.

What You Will Receive
- Two images:
  - A: Our current rendered ECG strip (with STEMI template) showing "boxy" ST elevation.
  - B: A real ECG strip with ST elevation for comparison.
- Your task: Compare A vs B and propose concise mathematical models and parameters that make our ST morphology match clinical reality.

Prior Attempt (Hann-Taper Smoothing)
- We tried a raised-cosine (Hann) taper at ST start/end to remove the square corners.
- Outcome: visually softer corners but still not clinically accurate; it is a post-hoc filter, not a morphology model.
- Issues: lacks parameterized control of J-point takeoff slope/curvature, can alter perceived plateau amplitude/length, and does not ensure consistent endpoint derivatives.
- Direction: abandon smoothing hacks and design an explicit, parametric ST function with clear clinical parameters.

How Our System Generates Waves (Current Model)
- Representation: Each lead is a sampled time series (mV) at `samplingRate` Hz; we render with clinical scales (10 mm/mV, 25 mm/s).
- Composition (additive): baseline + P + QRS + ST + T.
- Timing (per beat), from `src/generator.ts`:
  - `beatDuration = 60 / heartRate`.
  - `pTime = beatStart + 0.02`.
  - `qrsTime = beatStart + prInterval`.
  - `stStart = qrsTime + qrsWidth / 2` (J-point to ST start).
  - `stEnd = beatStart + qtInterval - tWave.duration / 2` (ST end before T onset).
  - `tTime = beatStart + qtInterval`.
- Waveforms, from `src/waveforms.ts`:
  - P wave: Gaussian centered at `pTime` with `sigma = duration/6`.
  - QRS complex: Sum of three triangular lobes (Q, R, S) around `qrsTime`.
  - T wave: Gaussian centered at `tTime` with `sigma = duration/4`.
  - ST segment (problem area): currently generated as a flat plateau of constant amplitude from `stStart` to `stEnd`:
    - `elevation` per-lead is taken from patterns and applied additively.
    - We previously experimented with a Hann taper to soften corners; this is not desired. We want a true mathematical morphology instead.
- Patterns, from `src/patterns.ts`:
  - STEMI patterns specify per-lead ST elevation/depression in mV (e.g., V2/V3 higher for anterior STEMI), plus typical HR and T-wave adjustments.
- Leads, from `src/leads.ts`:
  - We apply a simple per-lead amplitude multiplier.

Constraints For Your Proposal
- Mathematical, parametric, and efficient: closed-form or short piecewise functions, O(N) sampling. No iterative solvers or heavy optimization at render time.
- Continuity: At least C1 continuity (value and slope) at J-point (end of QRS) and at ST→T transition. C2 is a plus if feasible.
- Parametrizable morphology: Allow control of:
  - ST amplitude (mV) per lead (input already exists),
  - J-point takeoff slope (ms),
  - ST curvature (convex vs concave),
  - Optional mid-ST arc/plateau length (s),
  - Lead-specific variants (e.g., more convex in V2–V3 for anterior STEMI),
  - Optional J-point notch/shoulder for early repolarization vs STEMI.
- Realistic ranges: Provide default parameter ranges in seconds and mV consistent with clinical norms.
- Additive: Output should remain additive with other waves (we sum P, QRS, ST, T).
- Sampling: Input `samplingRate` will be 500–1000 Hz; please define functions in continuous time and we will sample them.

Deliverables From You
- A concise mathematical definition for ST morphology f_ST(t; θ) on [stStart, stEnd]. Provide 1–2 candidate families, for example:
  - Cubic Hermite spline specified by values and slopes at endpoints, with an optional mid-control to enforce convexity.
  - Logistic/tanh S-shaped takeoff into a quadratic/circular arc plateau, with C1/C2 continuity.
- Parameter mapping to our config:
  - Which new parameters to add (e.g., `stTakeoffMs`, `stCurvature`, `stArcShape`, `stNotchDepth`), including recommended defaults and bounds.
  - How to derive per-lead variants from our existing `stSegment.elevation[lead]`.
- Implementation sketch for `src/waveforms.ts`:
  - Replace current `generateSTSegment(startTime, endTime, elevation, samplingRate)` with your analytic model. Provide pseudocode that samples the function at `samplingRate` and returns `{time, amplitude}` points.
  - Ensure endpoint continuity with QRS end and T-wave start. State the boundary conditions (values/slopes) you assume.
- STEMI morphology guidance:
  - Anterior STEMI: convex-up ST elevation, greatest in V2–V3, possible slight upward concavity in lateral leads.
  - Inferior STEMI: elevation in II/III/aVF; consider reciprocal depression in I/aVL/V2.
  - Pericarditis/early repol: diffuse elevation with concave-up ST and J-notch; specify parameter differences vs STEMI.
- Verification checklist:
  - With `paperSpeed=25` mm/s and `gridSize=5 px/mm`: small box 40 ms, 1 mV = 50 px.
  - Visual: smooth takeoff at J-point, target curvature matches image B within reason.
  - Quantitative: duration of elevated segment and peak displacement align with specified parameters.

Useful Code References (read-only)
- `src/generator.ts` (timing of P/QRS/ST/T, amplitude composition)
- `src/waveforms.ts` (current waveform generators)
- `src/patterns.ts` (per-lead ST elevation defaults for STEMI variants)

Important Notes
- Please do not recommend generic post-hoc smoothing. We need explicit morphology defined by math with interpretable parameters.
- Keep the solution concise and implementable in our current structure without large refactors.
- Output should be a precise mathematical specification plus a minimal code plan (function signatures and sampling loop) to replace the current flat ST plateau.
