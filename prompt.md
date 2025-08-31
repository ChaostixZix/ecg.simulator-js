1) Context

Kita butuh library TypeScript ringan untuk mensimulasikan 12-lead ECG edukasional (bukan diagnostik). Pengguna harus bisa:

Mengatur morfologi P-Q-R-S-T per lead.

Set ST elevation/depression per lead (dalam mm atau mV).

Memilih template klinis siap pakai (mis. STEMI, NSTEMI, Pericarditis) yang otomatis mengubah lead terkait sesuai pola klasik.

Render ke grid “ECG paper” (default 25 mm/s & 10 mm/mV) dan ekspor/impornya sebagai JSON. (Standar: 25 mm/s dan 10 mm/mV; 1 mm = 0.04 s pada 25 mm/s; 10 mm = 1 mV). 
UTMB WWW (ROOT)
Empendium
The Student Physiologist

Catatan: 12 lead = I, II, III, aVR, aVL, aVF, V1–V6; lead grouping area: inferior (II, III, aVF), lateral (I, aVL, V5–V6), anterior (V1–V4). 
Life in the Fast Lane • LITFL

2) Goals

Core: Generator sinyal berbasis template PQRST parametrik (bukan ODE kompleks) + ST-segment offset per lead.

Output: Data time-series per lead + metadata dalam JSON, serta renderer grid sederhana (Canvas/SVG).

Demo: Single HTML file (tanpa framework) untuk mengatur parameter dan melihat hasil (termasuk preset STEMI/NSTEMI/Pericarditis).

Integrasi React: Ekspor API headless (pure functions) + optional wrapper React sangat tipis; no React dependency di core.

3) Non-Goals

Tidak perlu pathofisiologi penuh/ODE/HRV realistis.

Tidak perlu dukungan DICOM/diagnostik otomatis.

Tidak perlu WebGL/heavy chart lib.

4) Deliverables

Paket npm ecgsim-js:

ESM + CJS build, .d.ts lengkap, tree-shakable, MIT.

Demo: demo/index.html + satu file JS bundel (no build step untuk user).

Docs singkat: README (API, contoh JSON, cara embed React).

Templates: stemi_*, nstemi_*, pericarditis.

5) Data Model & Units

Sampling rate default: fs = 500 Hz (configurable).

Paper speed default: 25 mm/s; gain default: 10 mm/mV. (Konversi: 1 mm = 0.04 s @25 mm/s; 1 mm ≈ 0.1 mV @10 mm/mV). 
UTMB WWW (ROOT)
The Student Physiologist

Lead names: ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"]. 
Life in the Fast Lane • LITFL

Skema JSON (ringkas)
{
  "fs": 500,
  "paper": {"speed_mm_per_s": 25, "gain_mm_per_mV": 10},
  "duration_s": 10,
  "leads": {
    "V6": {
      "points": [/* Float values in mV, length = fs*duration */],
      "morphology": {"P": {...}, "QRS": {...}, "T": {...}, "ST_offset_mm": 1.0}
    },
    "...": {}
  },
  "meta": {"rhythm_bpm": 75, "noise": {"baseline_wander": 0.0, "white": 0.0}}
}


points selalu dalam mV; renderer mengurus konversi ke mm.

6) Engine (Headless)

Generator beat sintetis via komposisi fungsi sederhana (Gaussian untuk P/Q/S/T + segmen linear/flat untuk ST). Parameter per gelombang:

amp_mV, width_ms, center_ms, skew (opsional).

ST-segment control per lead:

ST_offset_mm (positif=elevasi; negatif=depresi) → otomatis dikonversi ke mV memakai gain.

Rhythm: repeat beat pada bpm; opsi variabilitas kecil (±2–3% jitter RR) untuk tampilan natural (opsional).

Noise (opsional): baseline wander sinus rendah & white noise ringan.

Lead mapping: apply template per grup lead (inferior/lateral/anterior) atau per-lead manual. 
Life in the Fast Lane • LITFL

7) Templates Klinis (edukasi)

Implement sebagai fungsi applyTemplate(name, magnitude={...}) yang set param morfologi & ST per lead:

STEMI
Aturan edukasi: elevasi ST di ≥2 lead kontigu (J-point), umumnya ≥1 mm (0.1 mV), kecuali V2–V3 punya ambang lebih tinggi berdasar jenis kelamin/usia. Sediakan preset:

Anterior/Anteroseptal: V1–V4 (opsi sampai V6), reciprocal: inferior/lateral sesuai template.

Inferior: II, III, aVF (opsi reciprocal di I, aVL).

Lateral: I, aVL, V5–V6.
Default besaran: 1–3 mm (settable). Jangan enforce kriteria klinis—ini simulasi. 
NCBI
AHA Journals
PMcardio | Powerful Medical

NSTEMI / Iskemia Non-ST Elevasi
ST depression (mis. 0.5–2 mm) dan/atau inversi T pada lead terkait (sering lateral/anterior), tanpa elevasi ST yang memenuhi kriteria STEMI. Sediakan slider depresi ST & inversi T. 
NCBI

Pericarditis Akut
Difus: ST elevasi konkaf luas (limb + V2–V6), PR depression; aVR (±V1) menunjukkan ST depression dan/atau PR elevation. Default elevasi 0.5–1 mm; enable toggle PR-segment shifts. 
Life in the Fast Lane • LITFL
+2
Life in the Fast Lane • LITFL
+2

Sertakan “info tooltip” di demo yang menautkan ringkas definisi di atas (sekadar edukasi, non-diagnostik).

8) Renderer (Sederhana)

Canvas (default) + fallback SVG.

Grid: besar 5 mm, kecil 1 mm; kecepatan/skalanya mengikuti metadata. (Convert mV→mm via gain; s→mm via speed). 
UTMB WWW (ROOT)
The Student Physiologist

Layout 12-lead: 4 baris × 3 kolom mini-strip, urut standar (I, II, III / aVR, aVL, aVF / V1, V2, V3 / V4, V5, V6).

Controls demo:

Global: BPM, duration, speed, gain, noise.

Per-lead: ST offset (mm), T inversion (° atau faktor amp), QRS width.

Template dropdown: STEMI (anterior/inferior/lateral), NSTEMI, Pericarditis.

Export/Import JSON.

9) API Minimal (tanpa snippet panjang)

createSimulator(options): Simulator

sim.setLeadParams(lead, { ST_offset_mm, P, QRS, T, ... })

sim.applyTemplate(name, opts?)

sim.generate(duration_s): { leads, fs, paper, meta }

renderToCanvas(canvasEl, data, opts?)

serialize(data): string / deserialize(json): Data

10) Integrasi React (opsional, mudah)

Sediakan wrapper kecil:

<EcgCanvas data={data} options={...} /> yang hanya memanggil renderToCanvas.

Hooks: useEcgSimulator(initial) yang membungkus createSimulator.

Tidak ada dependency React di core; wrapper di paket terpisah atau subpath export.

11) Testing & QA

Unit test konversi mm↔mV dan mm↔ms (kecepatan/gain).

Snapshot tests: ST offset +1 mm menghasilkan pergeseran ≈0.1 mV pada baseline segmen ST (default gain). 
UTMB WWW (ROOT)
The Student Physiologist

Visual test: preset template menandai lead yang sesuai (e.g., STEMI inferior memodifikasi II, III, aVF). 
Life in the Fast Lane • LITFL

12) Kualitas & Lisensi

MIT; zero external deps di core.

Ukuran bundel kecil (<10 kB gzipped target untuk core).

Dok: README dengan tabel parameter & contoh JSON.

13) Acceptance Checklist

 Build ESM+CJS + d.ts

 Demo HTML berfungsi (12 lead, grid, kontrol, ekspor/impor JSON)

 Template STEMI/NSTEMI/Pericarditis sesuai pola edukasi & lead group benar. 
NCBI
+1
AHA Journals
Life in the Fast Lane • LITFL

 ST offset dalam mm bekerja konsisten dengan gain (default 10 mm/mV). 
UTMB WWW (ROOT)
The Student Physiologist

 React wrapper opsional berjalan (tanpa menarik React di core).
