Ringkasan singkat keputusan

Dua keluarga model yang layak: Cubic Hermite (rekomendasi utama: sederhana, pasti C¹, mudah dikontrol) dan Sigmoid→Arc→Sigmoid (rekomendasi visual: kontrol curvature/plateau lebih intuitif, bisa C² dengan smoothstep kuintik).

Implementasi: tambahkan fungsi generateSTSegment(stStart, stEnd, elevationMv, fs, context, params) yang:

mengambil nilai baseline v0 dari akhir QRS,

menghitung nilai & turunan akhir (vEnd, s1) dari model T (atau set ke 0 jika tak ada info),

membangkitkan sampel ST pada fs menggunakan Hermite atau SigmoidArc,

mengembalikan array mV yang dapat ditambahkan ke lead.

Default parameter STEMI: elevation 0.1–0.3 mV, takeoff 20–40 ms, fall 20–40 ms, curvature +0.4..+0.8.

Untuk pericarditis: concave-up (negatif curvature), diffuse elevation, dan stNotch bisa dipakai.

Matematika & kontinuitas (detail)

Notation:

t ∈ [stStart, stEnd], L = stEnd - stStart (s), u = (t - stStart)/L ∈ [0,1].

v0 = value at stStart (mV) (ambil dari sample terakhir QRS).

vPeak = v0 + elevationMv.

vTstart = value T-gaussian at t = stEnd (jika ada).

Derivatif satu sisi: s0 = dv/dt at stStart (mV/s); s1 = dv/dt at stEnd (mV/s).

Cubic Hermite (C¹ guaranteed)

Cubic Hermite pada u:

tangents (skala u): m0 = s0 * L, m1 = s1 * L.

basis:

h00 = 2u^3 - 3u^2 + 1

h10 = u^3 - 2u^2 + u

h01 = -2u^3 + 3u^2

h11 = u^3 - u^2

fungsi:

f_ST(u) = h00*v0 + h10*m0 + h01*vPeak + h11*m1


Mapping takeoffMs → s0:

jika user menyetel stTakeoffMs (ms) berarti: ingin v0→vPeak naik dalam stTakeoffMs.

approximate slope: s0 = (vPeak - v0) / (stTakeoffMs/1000) (mV/s).

untuk smoothing, multiply by alpha ∈ (0,1) to soften.

Mapping ke T (s1):

jika T adalah gaussian T(t) = A * exp(-(t-tT)^2/(2σ^2)), derivative T'(t) = A * (-(t-tT)/σ^2) * exp(...).

set s1 = T'(stEnd). Jika T unknown, s1 = 0 or small negative to slope down.

Sigmoid→Arc→Sigmoid (visual control, can be C²)

Piecewise with fractions r = stTakeoffMs/L, f = stFallMs/L.

Takeoff (0..r) use quintic smoothstep S(w) = 6w^5 - 15w^4 + 10w^3 (C²).

Mid-arc (r..1-f) use dome(s) = (1 - cos(pi*s))/2 scaled by curvature factor c ∈ [-1,1]:

convex (STEMI): c>0 => taller/more dome-like

concave (pericarditis): c<0

Fall (1-f..1) mirrored smoothstep to target vTstart.

This design yields smooth derivatives at junctions if same smoothstep family (use quintic to be C²).

Cara mendapat v0 dan s0 / s1 dari QRS/T

v0: ambil samples[qrsEndIdx] — bukan asumsi 0. Ini menjaga continuity nilai.

s0: approx (samples[qrsEndIdx] - samples[qrsEndIdx-Δ]) / (Δ / fs) dengan Δ = min(3, qrsSampleCount-1). Jika QRS dibuat dari triangles (discrete), slope mungkin noisy — fallback: gunakan parameter stTakeoffMs approach.

s1: hitung dari T Gaussian jika T dibuat sebelumnya: s1 = d/dt T(t) at t = stEnd.

Unit handling:

slope units mV/s; L in s. m0 = s0 * L (dimensionless amplitude-scaled for Hermite).

Contoh numerik (concrete)

Settings:

paperSpeed = 25 mm/s, gridSize = 5 px/mm, fs = 1000 Hz.

QRS akhir pada t=0.28 s, stStart = 0.28 s, stEnd = 0.40 s → L = 0.12 s = 120 ms.

elevationMv = 0.10 mV (1 mm).
Compute:

v0 = 0 mV (as example).

vPeak = 0.10 mV.

stTakeoffMs = 30 ms → s0 = (0.10 - 0) / 0.03 = 3.333 mV/s.

stFallMs = 30 ms → aim to connect to T; if s1 ≈ 0, m1 = 0.

m0 = s0 * L = 3.333 * 0.12 = 0.4 mV (Hermite tangent units).

For u=0.1 (t = 0.292s), compute h00,h10,h01,h11 then f_ST.

Pixel mapping check:

elevation 0.1 mV → px = 0.1 * pxPerMV = 0.1 * 50 px = 5 px → matches 1 mm = 5 px.

Pseudocode TypeScript lengkap (implementable)

Berikut versi final, siap-tempel di src/waveforms.ts. Perhatikan: tetap bekerja pada mV; renderer yang mengubah ke px.

type STParams = {
  stModel?: 'hermite' | 'sigmoidArc',
  stTakeoffMs?: number, // ms
  stFallMs?: number,    // ms
  stCurvature?: number, // -1..1
  alphaTakeoff?: number, // 0..1 softness
  s1Override?: number | null, // optional slope at end (mV/s)
};

function generateSTSegment(
  stStart: number,
  stEnd: number,
  elevationMv: number,
  fs: number,
  context: { v0: number, vTstart?: number, tT?: number, tTSigma?: number },
  params: STParams = {}
) {
  const model = params.stModel ?? 'hermite';
  const takeMs = params.stTakeoffMs ?? 30;
  const fallMs = params.stFallMs ?? 30;
  const curvature = params.stCurvature ?? 0.6;
  const alpha = params.alphaTakeoff ?? 1.0;

  const L = Math.max(1e-6, stEnd - stStart);
  const N = Math.max(1, Math.round(L * fs));
  const samples = new Float32Array(N);

  const v0 = context.v0 ?? 0;
  const vPeak = v0 + elevationMv;
  // slope at start: prefer measured slope in context; else derive from takeoffMs
  let s0 = (elevationMv) / (Math.max(1, takeMs) / 1000); // mV/s
  s0 *= alpha;

  // slope at end: use override, else compute from T gaussian if available
  let s1 = typeof params.s1Override === 'number' ? params.s1Override : 0;
  if (params.s1Override == null && context.tT && context.tTSigma && context.vTstart != null) {
    // derivative of gaussian A*exp(-((t-tT)^2)/(2*σ^2)) at t = stEnd
    const A = context.vTstart; // might be T amplitude (approx)
    const sigma = context.tTSigma;
    const dt = stEnd - context.tT;
    s1 = A * (-(dt) / (sigma * sigma)) * Math.exp(- (dt*dt) / (2 * sigma * sigma));
  }

  if (model === 'hermite') {
    const m0 = s0 * L;
    const m1 = s1 * L;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1 || 1);
      const u2 = u*u, u3 = u2*u;
      const h00 = 2*u3 - 3*u2 + 1;
      const h10 = u3 - 2*u2 + u;
      const h01 = -2*u3 + 3*u2;
      const h11 = u3 - u2;
      const val = h00*v0 + h10*m0 + h01*vPeak + h11*m1;
      samples[k] = val;
    }
  } else {
    // sigmoidArc
    const r = Math.min(0.45, (takeMs/1000) / L);
    const f = Math.min(0.45, (fallMs/1000) / L);
    const midLen = Math.max(1e-6, 1 - r - f);
    const vEnd = context.vTstart ?? v0;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1 || 1);
      let val = v0;
      if (u <= r) {
        const w = u / r;
        const S = 6*w**5 - 15*w**4 + 10*w**3; // quintic smoothstep
        val = v0 + (vPeak - v0) * S;
      } else if (u >= 1 - f) {
        const w = (u - (1 - f)) / f;
        const S = 6*w**5 - 15*w**4 + 10*w**3;
        val = vPeak * (1 - S) + vEnd * S;
      } else {
        const s = (u - r) / midLen; // 0..1
        const dome = (1 - Math.cos(Math.PI * s)) / 2; // 0..1
        const peakScale = 1 + 0.35 * curvature;
        val = v0 + (vPeak - v0) * dome * peakScale;
      }
      samples[k] = val;
    }
  }

  return { startTime: stStart, samples }; // samples in mV
}


Implementasikan function ini sebagai pengganti plateau ST. Pastikan context.v0 diisi setelah QRS di-render (ambil sample terakhir QRS).

Rekomendasi parameter per-template (default practical)

Anterior STEMI (V2–V3):

elevationMv = 0.15 - 0.4 (1.5–4 mm)

stTakeoffMs = 20–30

stFallMs = 20–40

stCurvature = +0.6..+0.9

Inferior STEMI (II/III/aVF):

elevationMv = 0.1 - 0.3

curvature = +0.4..+0.7

Pericarditis:

elevationMv = 0.05 - 0.2 (diffuse)

curvature = -0.4..-0.8 (concave)

add small stNotchDepthMv negative in V1 or aVR if desired

Early repolarization:

elevationMv = 0.05 - 0.2

curvature = +0.4 (concave up but with J-notch)

stNotchDepthMv = 0.02 - 0.05 at J-point (Gaussian notch)

Testing & verification plan (concrete steps)

Unit tests:

For fs=1000, L=0.12s, elevation=0.1 mV, ensure max(samples) ≈ vPeak ± 1e-6.

Hermite: numeric derivative at u=0 equals s0 and at u=1 equals s1.

Visual tests in demo:

Set gain=10, gridSize=5, paperSpeed=25.

Render lead V2 with elevation=0.1 mV, stTakeoffMs=30, stFallMs=30.

Use browser devtools ruler: confirm peak vertical ~5 px (1 mm).

Confirm takeoff width: stTakeoffMs=30 ms → horizontal px = 30 ms / 8 ms per px ≈ 3.75 px (≈3–4 px).

Compare image B:

Aim for convex dome with J-point smooth rise (no square corner) and smooth connection to T onset.

Tweak curvature and takeoffMs until visual match.

Regression tests:

Render template before/after change and compare L2 error on ST region ignoring QRS/T to ensure changes are localized.

Pitfalls & notes

If QRS representation is coarse (triangle based, few samples), estimated s0 noisy → prefer fallback takeoffMs derived slope.

Keep all in mV until rendering conversion to px to avoid rounding issues.

Avoid post-hoc smoothing — this design yields intended shapes natively.

Performance: O(N) per ST segment where N ~ L * fs (small). For 12 leads, negligible.

Quick dev checklist for integration

Add new STParams to generator/patterns; include per-lead defaults.

Implement generateSTSegment(...) (above).

In beat composition: after building QRS, call generateSTSegment with context.v0 = qrsLastValue; sum returned samples into lead buffer.

Ensure s1 computed from T model (or set to 0) for C¹ into T.

Expose UI sliders: Takeoff ms, Curvature, Notch.

Add unit tests & visual manual checks as above.
