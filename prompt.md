1) Context
Tujuan: Minta ChatGPT membantu memperbaiki tampilan ECG di proyek ecg-js agar mengikuti standar klinis (time-base, voltage calibration, interval normal), karena saat ini kompleks QRS tampak terlalu berdekatan (time axis terlalu terkompresi).

Konteks singkat proyek:
- Repo: ecg-js (frontend JS/TS yang menggambar 12-lead ECG pada `<canvas>` dan ekspor SVG)
- File utama terkait tampilan: `src/renderer.ts` (fungsi `drawTrace` dan `render`)
- File generator sinyal: `src/generator.ts` (mengatur `heartRate`, `duration`, `samplingRate`, `prInterval`, `qrsWidth`, `qtInterval`, dll.)
- Demo: `demo/index.html` menginisialisasi `ECGRenderer` dengan opsi default: `gridSize: 5`, `paperSpeed: 25`, `gain: 10`, `samplingRate: 1000`, dll.

Masalah yang kami lihat:
- Di UI, kompleks QRS tampak terlalu berdekatan seperti heart rate lebih tinggi dari yang diatur, atau time axis terkompresi terlalu banyak.
- Di `src/renderer.ts`, skala waktu dihitung seperti ini:
  - `pxPerSecond = paperSpeed * gridSize` (dengan default `paperSpeed=25 mm/s`, `gridSize=5 px/mm` → `pxPerSecond=125 px/s`).
  - `timeScale = Math.min(pxPerSecond, width / maxTime)`.
  - Konsekuensinya, bila `maxTime` (mis. `duration`=10 s) besar, maka `width/maxTime` jauh lebih kecil daripada `pxPerSecond`, sehingga `timeScale` mengambil nilai `width/maxTime` → seluruh 10 detik “dipaksa muat” ke lebar panel. Inilah yang membuat QRS tampak terlalu rapat.

Standar klinis yang harus diikuti (tolong pastikan angka benar sesuai praktik klinis umum):
- Kecepatan kertas: 25 mm/s adalah standar umum; kadang 50 mm/s.
- Kalibrasi tegangan: 10 mm/mV (1 mV = 10 mm vertikal). Satu kotak kecil 1 mm = 0.1 mV; satu kotak besar 5 mm = 0.5 mV.
- Grid waktu pada 25 mm/s: 1 mm horizontal = 40 ms; 5 mm (kotak besar) = 200 ms.
- Heart rate normal sinus dewasa saat istirahat: ~60–100 bpm (aturan cepat: HR = 60,000 / RR_ms).
- Interval PR: 120–200 ms (0.12–0.20 s).
- Durasi QRS: 80–120 ms (0.08–0.12 s). >120 ms dianggap melebar (bundle branch block, dsb.).
- Interval QT: bergantung HR; gunakan QT terkoreksi (QTc). Batas umum: pria ≤440–450 ms, wanita ≤460–470 ms (mohon gunakan rujukan yang wajar dan konsisten).
- Durasi gelombang P: <120 ms, amplitudo biasanya <2.5 mm pada lead ekstremitas.
- Sampling diagnostik: ≥250 Hz; lazim 500–1000 Hz. Saat ini kami pakai 1000 Hz.
- Filter (untuk referensi, jangan merusak durasi QRS): high‑pass ~0.5 Hz (anti baseline wander), low‑pass ~40–150 Hz, notch 50/60 Hz bila perlu.

Yang kami butuhkan dari ChatGPT:
1) Diagnosis akar masalah time scaling saat ini dan perbaikannya.
   - Harus menghapus “fit-to-width” waktu untuk seluruh `duration`. Alih‑alih, selalu pakai time base klinis: `pxPerSecond = paperSpeed(mm/s) * pxPerMm` dan render hanya window waktu yang muat pada panel.
   - Opsi A (paling standar): render per panel sekitar 2.5 detik pada 25 mm/s (seperti kertas ECG standar 12‑lead). Artinya, lebar jejak tiap lead harus mewakili ~2.5 s bila `paperSpeed=25` dan `gridSize` adalah piksel per mm.
   - Opsi B: bila ingin menampilkan seluruh `duration`, gunakan `paperSpeed=25`/`50` yang konsisten dan perluas kanvas/lebar panel agar waktu yang diinginkan benar‑benar mempunyai skala 25 mm/s (bukan dipaksa). Jangan gunakan `width/maxTime` untuk waktu, karena itu mengubah time base klinis.

2) Usulan perubahan kode konkret di `src/renderer.ts` (tolong berikan cuplikan kode TypeScript/JS yang bisa langsung ditempel):
   - Ubah perhitungan skala waktu:
     - Saat ini: `const timeScale = Math.min(pxPerSecond, width / maxTime);`
     - Usulan: `const timeScale = pxPerSecond;` lalu batasi data yang dirender pada rentang waktu yang muat: `visibleSeconds = width / timeScale`.
     - Filter titik yang berada dalam `[t0, t0 + visibleSeconds]` untuk panel tersebut (mis. `t0=0` untuk semua panel terlebih dahulu). Alternatif: potong/segmentasi per beat sehingga pola berulang tampak natural.
   - Pastikan skala amplitudo tepat: `amplitudeScale = gain(mm/mV) * pxPerMm`. Dengan `gain=10` dan `gridSize=5 px/mm`, maka 1 mV = 50 px vertikal. Verifikasi di layar: 2 kotak besar = 1 mV.
   - Pastikan label info menunjukkan kalibrasi: `Gain 10 mm/mV, Speed 25 mm/s` dan cocok dengan grid di kanvas.

3) Penyesuaian di `src/generator.ts` bila diperlukan:
   - Pastikan default `heartRate`, `prInterval`, `qrsWidth`, `qtInterval`, `pWave.duration`, `tWave.duration` sesuai nilai normal sebagaimana di atas.
   - Jika ingin tampilan “standar kertas”, set `duration` di generator ke sekitar 2.5–3.0 s agar pas dengan panel, atau biarkan `duration` panjang (mis. 10 s) tapi renderer hanya menampilkan window 2.5 s.

4) Validasi klinis di UI (checklist akurasi):
   - Di 25 mm/s dan grid 1 mm = 5 px: 1 kotak kecil (5 px) = 40 ms, 1 kotak besar (25 px) = 200 ms. Ukur dengan penggaris devtools bila perlu.
   - Set HR ke 60 bpm → jarak R‑R ≈ 1000 ms → pada 25 mm/s = 25 mm (5 kotak besar) → di kanvas ≈ 125 px bila `gridSize=5 px/mm`.
   - QRS width default 0.08 s → dua kotak kecil (≈2 mm) pada 25 mm/s. Pastikan tampak sesuai di kanvas.
   - PR 0.16 s → empat kotak kecil (≈4 mm) pada 25 mm/s.
   - Gain 10 mm/mV → defleksi 1 mV = 10 mm = 2 kotak besar.

5) Hasil akhir yang kami harapkan dari ChatGPT:
   - Penjelasan singkat akar masalah “QRS terlalu rapat” (fit-to-width waktu yang salah) dengan referensi rumus.
   - Rencana perubahan yang eksplisit (langkah kode) untuk `src/renderer.ts` dan, jika perlu, `src/generator.ts` agar time base dan amplitude mengikuti standar klinis.
   - Cuplikan kode siap tempel untuk:
     - Menghitung `pxPerSecond` dan menetapkan `timeScale` tetap pada `pxPerSecond`.
     - Menentukan `visibleSeconds = width / pxPerSecond` dan memotong data titik per lead ke window waktu itu.
     - Opsi untuk menggeser/scroll window atau memilih startTime per panel.
   - Saran uji manual di demo agar kami bisa ukur kotak dan interval aktual di kanvas, membuktikan bahwa PR/QRS/QT/HR dan kalibrasi mV sesuai “real life”.

Catatan penting untuk konsistensi istilah dan satuan:
- `gridSize` di kode saat ini dipakai sebagai “pixel per mm”. Mohon tahan asumsi ini dan perjelas dalam solusi.
- `paperSpeed` dalam mm/s dan `gain` dalam mm/mV harus langsung terjemah ke piksel: `px/s = paperSpeed * gridSize`, `px/mV = gain * gridSize`.
- Jangan gunakan heuristik yang mengubah time base (mis. `width/maxTime`) karena itu memalsukan skala klinis.

Mohon jawab dengan:
- Ringkasan masalah dan koreksi teoretis (singkat dan tepat).
- Patch kode konkret (blok kode `diff` atau fungsi yang diubah) dengan komentar minimal agar mudah ditempel.
- Langkah verifikasi visual dengan angka (mm → px, ms → mm) sampai kami bisa melihat QRS dan interval lainnya tampil sesuai ukuran klinis.

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
