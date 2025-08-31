const LEADS = [
  "I",
  "II",
  "III",
  "aVR",
  "aVL",
  "aVF",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function gaussian(t, amp, center, width) {
  if (width <= 0) return 0;
  const x = (t - center) / width;
  return amp * Math.exp(-0.5 * x * x);
}

function defaultMorphology() {
  return {
    P: { amp_mV: 0.1, width_ms: 60, center_ms: -180 },
    Q: { amp_mV: -0.15, width_ms: 10, center_ms: -20 },
    R: { amp_mV: 1.0, width_ms: 8, center_ms: 0 },
    S: { amp_mV: -0.25, width_ms: 12, center_ms: 25 },
    T: { amp_mV: 0.3, width_ms: 120, center_ms: 260 },
    ST_offset_mm: 0,
  };
}

function cloneMorph(m) {
  return {
    P: { ...m.P },
    Q: { ...m.Q },
    R: { ...m.R },
    S: { ...m.S },
    T: { ...m.T },
    ST_offset_mm: m.ST_offset_mm,
  };
}

function mmToMv(mm, gain_mm_per_mV) {
  if (!gain_mm_per_mV) return mm * 0.1;
  return mm / gain_mm_per_mV;
}

function msToMm(ms, speed_mm_per_s) {
  if (!speed_mm_per_s) speed_mm_per_s = 25;
  return (ms / 1000) * speed_mm_per_s;
}

function createSimulator(options = {}) {
  const fs = options.fs ?? 500;
  const paper = {
    speed_mm_per_s: options.paper?.speed_mm_per_s ?? 25,
    gain_mm_per_mV: options.paper?.gain_mm_per_mV ?? 10,
  };
  const meta = {
    rhythm_bpm: options.bpm ?? 75,
    noise: {
      baseline_wander: options.noise?.baseline_wander ?? 0.0,
      white: options.noise?.white ?? 0.0,
    },
  };

  const leadParams = {};
  for (const L of LEADS) leadParams[L] = cloneMorph(defaultMorphology());

  function setLeadParams(lead, params) {
    if (!LEADS.includes(lead)) throw new Error(`Unknown lead: ${lead}`);
    const cur = leadParams[lead];
    if (params.P) Object.assign(cur.P, params.P);
    if (params.Q) Object.assign(cur.Q, params.Q);
    if (params.R) Object.assign(cur.R, params.R);
    if (params.S) Object.assign(cur.S, params.S);
    if (params.T) Object.assign(cur.T, params.T);
    if (params.ST_offset_mm !== undefined) cur.ST_offset_mm = params.ST_offset_mm;
  }

  function groups() {
    return {
      inferior: ["II", "III", "aVF"],
      lateral: ["I", "aVL", "V5", "V6"],
      anterior: ["V1", "V2", "V3", "V4"],
      limb: ["I", "II", "III", "aVR", "aVL", "aVF"],
      precordial: ["V1", "V2", "V3", "V4", "V5", "V6"],
    };
  }

  function applyTemplate(name, opts = {}) {
    const g = groups();
    const mag = opts.mm ?? 2;
    const dep = opts.depression_mm ?? 1;
    const tInv = opts.t_inversion ?? false;
    function addST(leads, mm) {
      for (const L of leads) setLeadParams(L, { ST_offset_mm: mm });
    }
    function invertT(leads, factor = -1) {
      for (const L of leads) setLeadParams(L, { T: { amp_mV: (leadParams[L].T.amp_mV) * factor } });
    }
    if (name === "stemi-anterior") {
      addST(g.anterior, mag);
      addST(g.inferior, -mag * 0.5);
    } else if (name === "stemi-inferior") {
      addST(g.inferior, mag);
      addST(["I", "aVL"], -mag * 0.5);
    } else if (name === "stemi-lateral") {
      addST(g.lateral, mag);
      addST(["III", "aVF"], -mag * 0.5);
    } else if (name === "nstemi") {
      addST(g.lateral, -dep);
      addST(g.anterior, -dep * 0.5);
      if (tInv) invertT([...g.lateral, ...g.anterior]);
    } else if (name === "pericarditis") {
      addST([...g.limb.filter(l => l !== "aVR"), "V2", "V3", "V4", "V5", "V6"], clamp(mag, 0.5, 1.5));
      addST(["aVR", "V1"], -clamp(mag, 0.5, 1.5) * 0.6);
    } else {
      throw new Error(`Unknown template: ${name}`);
    }
  }

  function beatValueAt(t_ms, morph, gain) {
    let v = 0;
    v += gaussian(t_ms, morph.P.amp_mV, morph.P.center_ms, morph.P.width_ms);
    v += gaussian(t_ms, morph.Q.amp_mV, morph.Q.center_ms, morph.Q.width_ms);
    v += gaussian(t_ms, morph.R.amp_mV, morph.R.center_ms, morph.R.width_ms);
    v += gaussian(t_ms, morph.S.amp_mV, morph.S.center_ms, morph.S.width_ms);
    v += gaussian(t_ms, morph.T.amp_mV, morph.T.center_ms, morph.T.width_ms);
    const qrsEnd = morph.S.center_ms + 2 * morph.S.width_ms;
    const tStart = qrsEnd;
    const tEnd = morph.T.center_ms - Math.min(60, 0.5 * morph.T.width_ms);
    if (t_ms >= tStart && t_ms <= tEnd) {
      v += mmToMv(morph.ST_offset_mm, gain);
    }
    return v;
  }

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function generate(duration_s = 10) {
    const N = Math.floor(duration_s * fs);
    const rr_ms = 60000 / meta.rhythm_bpm;
    const data = { fs, paper: { ...paper }, duration_s, leads: {}, meta: { ...meta } };
    for (const L of LEADS) {
      const morph = leadParams[L];
      const arr = new Array(N);
      for (let i = 0; i < N; i++) {
        const t_ms = (i / fs) * 1000;
        const k = Math.floor(t_ms / rr_ms);
        const tCur = t_ms - k * rr_ms;
        const tNext = t_ms - (k + 1) * rr_ms;
        let val = 0;
        val += beatValueAt(tCur, morph, paper.gain_mm_per_mV);
        val += beatValueAt(tNext, morph, paper.gain_mm_per_mV);
        if (meta.noise.baseline_wander) {
          const A = meta.noise.baseline_wander;
          const f = 0.3;
          val += A * Math.sin(2 * Math.PI * f * (t_ms / 1000));
        }
        if (meta.noise.white) {
          val += meta.noise.white * randn();
        }
        arr[i] = val;
      }
      data.leads[L] = { points: arr, morphology: cloneMorph(morph) };
    }
    return data;
  }

  return { fs, paper, meta, leadParams, setLeadParams, applyTemplate, generate };
}

function renderToCanvas(canvas, data, opts = {}) {
  const ctx = canvas.getContext("2d");
  const cols = 3, rows = 4;
  const w = canvas.width, h = canvas.height;
  const panelW = Math.floor(w / cols);
  const panelH = Math.floor(h / rows);
  const speed = data.paper.speed_mm_per_s ?? 25;
  const gain = data.paper.gain_mm_per_mV ?? 10;
  const duration = data.duration_s;
  const pxPerMm = panelW / (speed * duration);

  function drawGrid(x0, y0) {
    const minor = pxPerMm;
    const major = pxPerMm * 5;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, panelW, panelH);
    ctx.lineWidth = 1;
    for (let x = 0; x <= panelW; x += minor) {
      ctx.strokeStyle = "#f7d7d7";
      ctx.beginPath();
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, panelH);
      ctx.stroke();
    }
    for (let y = 0; y <= panelH; y += minor) {
      ctx.strokeStyle = "#f7d7d7";
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(panelW, Math.floor(y) + 0.5);
      ctx.stroke();
    }
    for (let x = 0; x <= panelW; x += major) {
      ctx.strokeStyle = "#f1a0a0";
      ctx.beginPath();
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, panelH);
      ctx.stroke();
    }
    for (let y = 0; y <= panelH; y += major) {
      ctx.strokeStyle = "#f1a0a0";
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(panelW, Math.floor(y) + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLead(x0, y0, leadName) {
    const lead = data.leads[leadName];
    const points = lead.points;
    const fs = data.fs;
    const baseY = y0 + panelH / 2;
    const mvToPx = (mv) => (mv * gain) * pxPerMm;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 1.5;
    let xPrev = x0, yPrev = baseY;
    for (let i = 0; i < points.length; i++) {
      const tSec = i / fs;
      const x = x0 + tSec * speed * pxPerMm;
      if (x > x0 + panelW) break;
      const y = baseY - mvToPx(points[i]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const dx = x - xPrev;
        const dy = y - yPrev;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) ctx.lineTo(x, y);
      }
      xPrev = x; yPrev = y;
    }
    ctx.stroke();
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.fillText(leadName, x0 + 8, y0 + 16);
    ctx.restore();
  }

  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < LEADS.length; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const x0 = c * panelW;
    const y0 = r * panelH;
    drawGrid(x0, y0);
    drawLead(x0, y0, LEADS[i]);
  }
}

function serialize(data) {
  const out = JSON.parse(JSON.stringify(data));
  for (const k of Object.keys(out.leads)) {
    const p = out.leads[k];
    if (ArrayBuffer.isView(p.points)) {
      p.points = Array.from(p.points);
    }
  }
  return JSON.stringify(out);
}

function deserialize(json) {
  const obj = JSON.parse(json);
  for (const k of Object.keys(obj.leads)) {
    const p = obj.leads[k];
    if (Array.isArray(p.points)) {
      p.points = p.points.map(Number);
    }
  }
  return obj;
}

export { LEADS as leadNames, createSimulator, renderToCanvas, serialize, deserialize, msToMm, mmToMv };
