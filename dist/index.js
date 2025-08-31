'use strict';

function generateGaussianWave(centerTime, amplitude, sigma, duration, samplingRate) {
    const points = [];
    const samples = Math.floor(duration * samplingRate);
    const startTime = centerTime - duration / 2;
    for (let i = 0; i < samples; i++) {
        const time = startTime + (i / samplingRate);
        const x = time - centerTime;
        const y = amplitude * Math.exp(-(x * x) / (2 * sigma * sigma));
        points.push({ time, amplitude: y });
    }
    return points;
}
function generateTriangularWave(centerTime, amplitude, duration, samplingRate) {
    const points = [];
    const samples = Math.floor(duration * samplingRate);
    const startTime = centerTime - duration / 2;
    const halfDuration = duration / 2;
    for (let i = 0; i < samples; i++) {
        const time = startTime + (i / samplingRate);
        const x = Math.abs(time - centerTime);
        const y = x <= halfDuration ? amplitude * (1 - x / halfDuration) : 0;
        points.push({ time, amplitude: y });
    }
    return points;
}
function generatePWave(centerTime, config, samplingRate) {
    const sigma = config.duration / 6;
    return generateGaussianWave(centerTime, config.amplitude, sigma, config.duration, samplingRate);
}
function generateQRSComplex(centerTime, config, samplingRate) {
    const points = [];
    const qrsWidth = config.duration;
    const qc = config.qrs ?? {};
    // Defaults mirror prior behavior
    const qOffsetFrac = qc.qOffsetFrac ?? -0.3;
    const rOffsetFrac = qc.rOffsetFrac ?? 0;
    const sOffsetFrac = qc.sOffsetFrac ?? 0.3;
    const qWidthFrac = qc.qWidthFrac ?? 0.2;
    const rWidthFrac = qc.rWidthFrac ?? 0.4;
    const sWidthFrac = qc.sWidthFrac ?? 0.2;
    const qAmpMul = qc.qAmpMul ?? -0.3;
    const rAmpMul = qc.rAmpMul ?? 1.0;
    const sAmpMul = qc.sAmpMul ?? -0.2;
    const qAmplitude = config.amplitude * qAmpMul;
    const rAmplitude = config.amplitude * rAmpMul;
    const sAmplitude = config.amplitude * sAmpMul;
    const qTime = centerTime + qrsWidth * qOffsetFrac;
    const rTime = centerTime + qrsWidth * rOffsetFrac;
    const sTime = centerTime + qrsWidth * sOffsetFrac;
    const qWave = generateTriangularWave(qTime, qAmplitude, qrsWidth * qWidthFrac, samplingRate);
    const rWave = generateTriangularWave(rTime, rAmplitude, qrsWidth * rWidthFrac, samplingRate);
    const sWave = generateTriangularWave(sTime, sAmplitude, qrsWidth * sWidthFrac, samplingRate);
    points.push(...qWave, ...rWave, ...sWave);
    return points.sort((a, b) => a.time - b.time);
}
function generateTWave(centerTime, config, samplingRate) {
    const sigma = config.duration / 4;
    return generateGaussianWave(centerTime, config.amplitude, sigma, config.duration, samplingRate);
}
function generateSTSegment(startTime, endTime, elevation, samplingRate, 
// Optional context to allow matching derivatives with T-wave if available
context, params = {}) {
    const points = [];
    const duration = Math.max(0, endTime - startTime);
    const samples = Math.max(1, Math.floor(duration * samplingRate));
    // Defaults per prompt-answer.md
    const model = params.stModel ?? 'hermite';
    const takeMs = params.stTakeoffMs ?? 30; // 20–40 typical
    const fallMs = params.stFallMs ?? 30; // 20–40 typical
    const curvature = params.stCurvature ?? 0.6; // convex for STEMI
    const alpha = params.alphaTakeoff ?? 1.0;
    // Value at J-point (end of QRS). If unknown, assume baseline 0 in our model.
    const v0 = context?.v0 ?? 0;
    const vPeak = v0 + elevation; // target elevation level
    // Slope at start (mV/s). If we don't have a measured QRS slope, derive from takeoff.
    let s0 = elevation / Math.max(1, takeMs) * 1000; // (mV) / (ms) -> mV/s
    s0 *= alpha;
    // Slope at end, try from context (Gaussian T) else 0
    let s1 = typeof params.s1Override === 'number' ? params.s1Override : 0;
    if (params.s1Override == null && context?.tT != null && context?.tTSigma != null && context?.vTstart != null) {
        const A = context.vTstart; // approximate T amplitude at stEnd
        const sigma = context.tTSigma;
        const dt = endTime - context.tT;
        s1 = A * (-(dt) / (sigma * sigma)) * Math.exp(-(dt * dt) / (2 * sigma * sigma));
    }
    if (model === 'hermite') {
        // Cubic Hermite interpolation ensuring C1 continuity of value and slope
        const L = Math.max(1e-6, duration);
        const m0 = s0 * L;
        const m1 = s1 * L;
        for (let i = 0; i < samples; i++) {
            const time = startTime + i / samplingRate;
            // normalized u in [0,1]
            const u = samples > 1 ? (i / (samples - 1)) : 0;
            const u2 = u * u;
            const u3 = u2 * u;
            const h00 = 2 * u3 - 3 * u2 + 1;
            const h10 = u3 - 2 * u2 + u;
            const h01 = -2 * u3 + 3 * u2;
            const h11 = u3 - u2;
            const amp = h00 * v0 + h10 * m0 + h01 * vPeak + h11 * m1;
            points.push({ time, amplitude: amp });
        }
    }
    else {
        // Sigmoid -> Arc -> Sigmoid with curvature control
        const L = Math.max(1e-6, duration);
        const r = Math.min(0.45, (takeMs / 1000) / L);
        const f = Math.min(0.45, (fallMs / 1000) / L);
        const midLen = Math.max(1e-6, 1 - r - f);
        const vEnd = context?.vTstart ?? v0; // target to blend toward T onset if known
        for (let i = 0; i < samples; i++) {
            const time = startTime + i / samplingRate;
            const u = samples > 1 ? (i / (samples - 1)) : 0;
            let amp;
            if (u <= r && r > 0) {
                // quintic smoothstep for takeoff
                const w = u / r;
                const S = 6 * w ** 5 - 15 * w ** 4 + 10 * w ** 3; // C2
                amp = v0 + (vPeak - v0) * S;
            }
            else if (u >= 1 - f && f > 0) {
                // fall toward vEnd
                const w = (u - (1 - f)) / f;
                const S = 6 * w ** 5 - 15 * w ** 4 + 10 * w ** 3; // C2
                amp = vPeak * (1 - S) + vEnd * S;
            }
            else {
                // mid-arc dome with curvature shaping
                const s = (u - r) / midLen; // 0..1
                const dome = (1 - Math.cos(Math.PI * s)) / 2; // 0..1
                const peakScale = 1 + 0.35 * curvature;
                amp = v0 + (vPeak - v0) * dome * peakScale;
            }
            points.push({ time, amplitude: amp });
        }
    }
    return points;
}

const LEADS = [
    'I', 'II', 'III',
    'aVR', 'aVL', 'aVF',
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6'
];
const LIMB_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const PRECORDIAL_LEADS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
function getLeadAmplitudeMultiplier(lead) {
    const multipliers = {
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
function getLeadVector(lead) {
    const vectors = {
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
function getAnatomicalRegion(lead) {
    const regions = {
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

class ECGGenerator {
    constructor(config = {}) {
        this.config = {
            heartRate: 60,
            duration: 10,
            samplingRate: 1000,
            amplitude: 1.0,
            pWave: { amplitude: 0.2, duration: 0.08, shape: 'gaussian' },
            qrsComplex: { amplitude: 1.0, duration: 0.08, shape: 'triangular' },
            tWave: { amplitude: 0.3, duration: 0.16, shape: 'gaussian' },
            stSegment: { elevation: {}, depression: {} },
            prInterval: 0.16,
            qtInterval: 0.40,
            qrsWidth: 0.08,
            ...config
        };
    }
    updateConfiguration(config) {
        this.config = { ...this.config, ...config };
    }
    generateBeat(startTime, lead) {
        const points = [];
        const leadMultiplier = getLeadAmplitudeMultiplier(lead);
        const beatDuration = 60 / this.config.heartRate;
        const pTime = startTime + 0.02;
        const qrsTime = startTime + this.config.prInterval;
        const stStart = qrsTime + this.config.qrsWidth / 2;
        const stEnd = startTime + this.config.qtInterval - this.config.tWave.duration / 2;
        const tTime = startTime + this.config.qtInterval;
        const pWave = generatePWave(pTime, {
            ...this.config.pWave,
            amplitude: this.config.pWave.amplitude * this.config.amplitude * leadMultiplier
        }, this.config.samplingRate);
        const stElevation = this.config.stSegment.elevation[lead] || 0;
        const stDepression = this.config.stSegment.depression[lead] || 0;
        const stOffset = (stElevation - stDepression) * this.config.amplitude * leadMultiplier;
        // Enhance S-wave and T-wave for leads with ST elevation (STEMI morphology)
        let qrsConfig = { ...this.config.qrsComplex };
        let tWaveConfig = { ...this.config.tWave };
        if (stElevation > 0.2) { // Significant ST elevation
            // Further elevate S-wave in STEMI leads
            if (qrsConfig.qrs) {
                qrsConfig.qrs = {
                    ...qrsConfig.qrs,
                    sAmpMul: (qrsConfig.qrs.sAmpMul || -0.2) + (stElevation * 0.5) // More positive S-wave
                };
            }
            // Increase T-wave amplitude proportionally to ST elevation
            tWaveConfig = {
                ...tWaveConfig,
                amplitude: tWaveConfig.amplitude + (stElevation * 0.8) // Hyperacute T-waves
            };
        }
        const qrsWave = generateQRSComplex(qrsTime, {
            ...qrsConfig,
            amplitude: qrsConfig.amplitude * this.config.amplitude * leadMultiplier
        }, this.config.samplingRate);
        const stSegment = generateSTSegment(stStart, stEnd, stOffset, this.config.samplingRate, undefined, // context - could be enhanced later
        {
            stModel: stElevation > 0.2 ? 'sigmoidArc' : 'hermite', // Use convex arc for STEMI
            stCurvature: 0.8, // More convex for STEMI
            alphaTakeoff: 0.9 // Smoother takeoff
        });
        const tWave = generateTWave(tTime, {
            ...tWaveConfig,
            amplitude: tWaveConfig.amplitude * this.config.amplitude * leadMultiplier
        }, this.config.samplingRate);
        const baseline = Array.from({ length: Math.floor(beatDuration * this.config.samplingRate) }, (_, i) => ({
            time: startTime + i / this.config.samplingRate,
            amplitude: 0
        }));
        points.push(...baseline);
        const addWaveToBaseline = (wave) => {
            wave.forEach(point => {
                const index = points.findIndex(p => Math.abs(p.time - point.time) < 1 / (2 * this.config.samplingRate));
                if (index >= 0) {
                    points[index].amplitude += point.amplitude;
                }
            });
        };
        addWaveToBaseline(pWave);
        addWaveToBaseline(qrsWave);
        addWaveToBaseline(stSegment);
        addWaveToBaseline(tWave);
        return points.sort((a, b) => a.time - b.time);
    }
    generateLead(lead) {
        const points = [];
        const beatDuration = 60 / this.config.heartRate;
        const numBeats = Math.ceil(this.config.duration / beatDuration);
        for (let i = 0; i < numBeats; i++) {
            const beatStartTime = i * beatDuration;
            const beatPoints = this.generateBeat(beatStartTime, lead);
            points.push(...beatPoints.filter(p => p.time <= this.config.duration));
        }
        return points;
    }
    generate() {
        const leads = LEADS.map(lead => ({
            lead,
            data: this.generateLead(lead)
        }));
        return {
            leads,
            configuration: this.config,
            timestamp: Date.now()
        };
    }
    generateSingleLead(lead) {
        return {
            lead,
            data: this.generateLead(lead)
        };
    }
}

class ECGRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            width: 1200,
            height: 800,
            gridSize: 5,
            gridColor: '#ffcccc',
            traceColor: '#000000',
            backgroundColor: '#ffffff',
            showGrid: true,
            showLabels: true,
            gain: 10,
            paperSpeed: 25,
            panelPadding: 30,
            panelGapX: 24,
            panelGapY: 24,
            ...options
        };
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
    }
    drawGrid() {
        if (!this.options.showGrid)
            return;
        const ctx = this.ctx;
        const { width, height, gridSize, gridColor } = this.options;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const majorGrid = gridSize * 5;
        for (let x = 0; x <= width; x += majorGrid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += majorGrid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    drawTrace(leadData, xOffset, yOffset, width, height) {
        const ctx = this.ctx;
        const { traceColor, gain, paperSpeed, gridSize } = this.options;
        if (leadData.data.length === 0)
            return;
        ctx.strokeStyle = traceColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Clinical time base: always paperSpeed (mm/s) * gridSize (px/mm)
        const pxPerSecond = paperSpeed * gridSize;
        const timeScale = pxPerSecond;
        // Visible time window in seconds for this panel
        const visibleSeconds = width / timeScale;
        const startTime = this.options.startTime ?? 0;
        const endTime = startTime + visibleSeconds;
        // Pixels per mV = gain (mm/mV) * pixels-per-mm (gridSize)
        const amplitudeScale = gain * gridSize;
        const baselineY = yOffset + height / 2;
        // Render only samples within the visible window
        const points = leadData.data.filter(p => p.time >= startTime && p.time <= endTime);
        if (points.length === 0)
            return;
        let isFirstPoint = true;
        for (const point of points) {
            const x = xOffset + (point.time - startTime) * timeScale;
            const y = baselineY - point.amplitude * amplitudeScale;
            if (isFirstPoint) {
                ctx.moveTo(x, y);
                isFirstPoint = false;
            }
            else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    drawLabel(text, x, y) {
        const ctx = this.ctx;
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y);
    }
    render(ecgData) {
        const ctx = this.ctx;
        const { width, height, backgroundColor, showLabels, panelGapX, panelGapY, panelPadding } = this.options;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        this.drawGrid();
        const leadsPerRow = 4;
        const rows = 3;
        const totalGapX = panelGapX * (leadsPerRow - 1);
        const totalGapY = panelGapY * (rows - 1);
        const leadWidth = (width - totalGapX) / leadsPerRow;
        const leadHeight = (height - totalGapY) / rows;
        ecgData.leads.forEach((leadData, index) => {
            const row = Math.floor(index / leadsPerRow);
            const col = index % leadsPerRow;
            const x = col * (leadWidth + panelGapX);
            const y = row * (leadHeight + panelGapY);
            const pad = panelPadding;
            this.drawTrace(leadData, x + pad, y + pad, leadWidth - 2 * pad, leadHeight - 2 * pad);
            if (showLabels) {
                this.drawLabel(leadData.lead, x + 8, y + 18);
            }
        });
        if (showLabels) {
            const config = ecgData.configuration;
            const infoText = `HR: ${config.heartRate} bpm | Gain: ${this.options.gain}mm/mV | Speed: ${this.options.paperSpeed}mm/s`;
            ctx.fillStyle = '#666666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(infoText, width - 10, height - 10);
        }
    }
    exportAsSVG(ecgData) {
        const { width, height, gridSize, gridColor, traceColor, backgroundColor, showGrid, showLabels, gain, panelGapX, panelGapY, panelPadding, paperSpeed } = this.options;
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;
        if (showGrid) {
            svg += `<defs><pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">`;
            svg += `<path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${gridColor}" stroke-width="0.5"/>`;
            svg += `</pattern></defs>`;
            svg += `<rect width="100%" height="100%" fill="url(#grid)"/>`;
            const majorGrid = gridSize * 5;
            for (let x = 0; x <= width; x += majorGrid) {
                svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${gridColor}" stroke-width="1"/>`;
            }
            for (let y = 0; y <= height; y += majorGrid) {
                svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`;
            }
        }
        const leadsPerRow = 4;
        const rows = 3;
        const totalGapX = panelGapX * (leadsPerRow - 1);
        const totalGapY = panelGapY * (rows - 1);
        const leadWidth = (width - totalGapX) / leadsPerRow;
        const leadHeight = (height - totalGapY) / rows;
        ecgData.leads.forEach((leadData, index) => {
            const row = Math.floor(index / leadsPerRow);
            const col = index % leadsPerRow;
            const x = col * (leadWidth + panelGapX) + panelPadding;
            const y = row * (leadHeight + panelGapY) + panelPadding;
            const w = leadWidth - 2 * panelPadding;
            const h = leadHeight - 2 * panelPadding;
            if (leadData.data.length > 0) {
                const pxPerSecond = paperSpeed * gridSize; // clinical
                const timeScale = pxPerSecond;
                const visibleSeconds = w / timeScale;
                const startTime = this.options.startTime ?? 0;
                const endTime = startTime + visibleSeconds;
                const amplitudeScale = gain * gridSize;
                const baselineY = y + h / 2;
                const points = leadData.data.filter(p => p.time >= startTime && p.time <= endTime);
                if (points.length > 0) {
                    let pathD = '';
                    points.forEach((point, i) => {
                        const px = x + (point.time - startTime) * timeScale;
                        const py = baselineY - point.amplitude * amplitudeScale;
                        pathD += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
                    });
                    svg += `<path d="${pathD}" fill="none" stroke="${traceColor}" stroke-width="1.5"/>`;
                }
            }
            if (showLabels) {
                svg += `<text x="${x - 15}" y="${y - 5}" font-family="Arial" font-size="12" fill="#000000">${leadData.lead}</text>`;
            }
        });
        svg += '</svg>';
        return svg;
    }
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
    }
}

class ECGExporter {
    static toJSON(ecgData) {
        return JSON.stringify(ecgData, null, 2);
    }
    static fromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.validateECGData(data);
            return data;
        }
        catch (error) {
            throw new Error(`Invalid ECG JSON data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static validateECGData(data) {
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
    static toCSV(ecgData) {
        const leads = ecgData.leads;
        if (leads.length === 0)
            return '';
        const maxLength = Math.max(...leads.map(lead => lead.data.length));
        const headers = ['time', ...leads.map(lead => lead.lead)];
        let csv = headers.join(',') + '\n';
        for (let i = 0; i < maxLength; i++) {
            const row = [];
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
    static toFHIR(ecgData, patientId) {
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
    static getLeadSnomedCode(lead) {
        const codes = {
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
    static downloadFile(content, filename, contentType = 'application/json') {
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

class ClinicalPatterns {
    static getPattern(pattern) {
        const patterns = {
            normal: {
                heartRate: 75,
                stSegment: { elevation: {}, depression: {} },
                pWave: { amplitude: 0.2, duration: 0.08, shape: 'gaussian' },
                qrsComplex: { amplitude: 1.0, duration: 0.08, shape: 'triangular' },
                tWave: { amplitude: 0.3, duration: 0.16, shape: 'gaussian' }
            },
            'stemi-anterior': {
                heartRate: 85,
                stSegment: {
                    elevation: { V1: 0.3, V2: 0.4, V3: 0.5, V4: 0.4 },
                    depression: { II: 0.1, III: 0.1, aVF: 0.1 }
                },
                qrsComplex: {
                    amplitude: 1.2, duration: 0.08, shape: 'triangular',
                    // Elevate S-wave significantly for STEMI - less negative, often positive
                    qrs: { sAmpMul: 0.1 } // Positive S-wave in STEMI leads
                },
                // T-wave should be elevated and peaked in STEMI leads
                tWave: { amplitude: 0.7, duration: 0.20, shape: 'gaussian' }
            },
            'stemi-inferior': {
                heartRate: 65,
                stSegment: {
                    elevation: { II: 0.4, III: 0.5, aVF: 0.4 },
                    depression: { I: 0.1, aVL: 0.15, V2: 0.1 }
                },
                qrsComplex: {
                    amplitude: 1.1, duration: 0.08, shape: 'triangular',
                    // Elevate S-wave in inferior STEMI leads
                    qrs: { sAmpMul: 0.05 }
                },
                tWave: { amplitude: 0.6, duration: 0.17, shape: 'gaussian' }
            },
            'stemi-lateral': {
                heartRate: 90,
                stSegment: {
                    elevation: { I: 0.3, aVL: 0.4, V5: 0.4, V6: 0.3 },
                    depression: { II: 0.1, III: 0.1, aVF: 0.1 }
                },
                qrsComplex: {
                    amplitude: 1.3, duration: 0.08, shape: 'triangular',
                    // Elevate S-wave in lateral STEMI leads
                    qrs: { sAmpMul: 0.1 }
                },
                tWave: { amplitude: 0.6, duration: 0.16, shape: 'gaussian' }
            },
            nstemi: {
                heartRate: 88,
                stSegment: {
                    elevation: {},
                    depression: { V4: 0.2, V5: 0.2, V6: 0.15 }
                },
                tWave: { amplitude: -0.2, duration: 0.16, shape: 'gaussian' },
                qrsComplex: { amplitude: 1.0, duration: 0.08, shape: 'triangular' }
            },
            pericarditis: {
                heartRate: 95,
                stSegment: {
                    elevation: {
                        I: 0.15, II: 0.2, III: 0.15,
                        aVL: 0.1, aVF: 0.2,
                        V2: 0.2, V3: 0.25, V4: 0.2, V5: 0.15, V6: 0.1
                    },
                    depression: { aVR: 0.1 }
                },
                prInterval: 0.18,
                tWave: { amplitude: 0.25, duration: 0.16, shape: 'gaussian' }
            },
            lvh: {
                heartRate: 70,
                stSegment: {
                    elevation: {},
                    depression: { V5: 0.1, V6: 0.1 }
                },
                qrsComplex: { amplitude: 1.8, duration: 0.10, shape: 'triangular' },
                tWave: { amplitude: -0.3, duration: 0.16, shape: 'gaussian' }
            },
            rbbb: {
                heartRate: 75,
                stSegment: { elevation: {}, depression: {} },
                qrsComplex: { amplitude: 1.0, duration: 0.12, shape: 'triangular' },
                tWave: { amplitude: -0.2, duration: 0.16, shape: 'gaussian' }
            },
            lbbb: {
                heartRate: 75,
                stSegment: { elevation: {}, depression: {} },
                qrsComplex: { amplitude: 1.0, duration: 0.14, shape: 'triangular' },
                tWave: { amplitude: -0.3, duration: 0.16, shape: 'gaussian' },
                prInterval: 0.18
            }
        };
        return patterns[pattern];
    }
    static applyPattern(baseConfig, pattern) {
        const patternConfig = this.getPattern(pattern);
        return {
            ...baseConfig,
            ...patternConfig,
            stSegment: {
                ...baseConfig.stSegment,
                ...patternConfig.stSegment
            }
        };
    }
    static getPatternDescription(pattern) {
        const descriptions = {
            normal: 'Normal sinus rhythm with typical PQRST morphology',
            'stemi-anterior': 'ST-elevation myocardial infarction affecting anterior wall (V1-V4)',
            'stemi-inferior': 'ST-elevation myocardial infarction affecting inferior wall (II, III, aVF)',
            'stemi-lateral': 'ST-elevation myocardial infarction affecting lateral wall (I, aVL, V5-V6)',
            nstemi: 'Non-ST elevation myocardial infarction with T-wave inversions',
            pericarditis: 'Acute pericarditis with widespread ST elevation and PR depression',
            lvh: 'Left ventricular hypertrophy with increased QRS amplitude',
            rbbb: 'Right bundle branch block with widened QRS complex',
            lbbb: 'Left bundle branch block with widened QRS complex and T-wave inversions'
        };
        return descriptions[pattern];
    }
    static setSTSegmentOffsets(elevation, depression) {
        return {
            elevation: elevation,
            depression: depression
        };
    }
}

exports.ClinicalPatterns = ClinicalPatterns;
exports.ECGExporter = ECGExporter;
exports.ECGGenerator = ECGGenerator;
exports.ECGRenderer = ECGRenderer;
exports.LEADS = LEADS;
exports.LIMB_LEADS = LIMB_LEADS;
exports.PRECORDIAL_LEADS = PRECORDIAL_LEADS;
exports.getAnatomicalRegion = getAnatomicalRegion;
exports.getLeadAmplitudeMultiplier = getLeadAmplitudeMultiplier;
exports.getLeadVector = getLeadVector;
//# sourceMappingURL=index.js.map
