'use strict';

var jsxRuntime = require('react/jsx-runtime');
var React = require('react');

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
    const qAmplitude = -config.amplitude * 0.3;
    const rAmplitude = config.amplitude;
    const sAmplitude = -config.amplitude * 0.2;
    const qTime = centerTime - qrsWidth * 0.3;
    const rTime = centerTime;
    const sTime = centerTime + qrsWidth * 0.3;
    const qWave = generateTriangularWave(qTime, qAmplitude, qrsWidth * 0.2, samplingRate);
    const rWave = generateTriangularWave(rTime, rAmplitude, qrsWidth * 0.4, samplingRate);
    const sWave = generateTriangularWave(sTime, sAmplitude, qrsWidth * 0.2, samplingRate);
    points.push(...qWave, ...rWave, ...sWave);
    return points.sort((a, b) => a.time - b.time);
}
function generateTWave(centerTime, config, samplingRate) {
    const sigma = config.duration / 4;
    return generateGaussianWave(centerTime, config.amplitude, sigma, config.duration, samplingRate);
}
function generateSTSegment(startTime, endTime, elevation, samplingRate) {
    const points = [];
    const duration = Math.max(0, endTime - startTime);
    const samples = Math.max(1, Math.floor(duration * samplingRate));
    // Smooth the ST onsets/offsets to avoid boxy corners.
    // Use short raised-cosine (Hann) tapers at both ends.
    const maxTaper = 0.04; // 40 ms typical J-point smoothing
    const taper = Math.min(maxTaper, duration * 0.3); // up to 30% of ST duration
    const rampIn = taper;
    const rampOut = taper;
    for (let i = 0; i < samples; i++) {
        const time = startTime + i / samplingRate;
        const rel = time - startTime;
        let w = 1;
        if (rel < rampIn && rampIn > 0) {
            // 0 -> 1 with raised cosine
            const x = rel / rampIn; // 0..1
            w = 0.5 - 0.5 * Math.cos(Math.PI * x);
        }
        else if (rel > duration - rampOut && rampOut > 0) {
            // 1 -> 0 with raised cosine
            const x = (duration - rel) / rampOut; // 1..0
            w = 0.5 - 0.5 * Math.cos(Math.PI * x);
        }
        points.push({ time, amplitude: elevation * w });
    }
    return points;
}

const LEADS = [
    'I', 'II', 'III',
    'aVR', 'aVL', 'aVF',
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6'
];
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
        const qrsWave = generateQRSComplex(qrsTime, {
            ...this.config.qrsComplex,
            amplitude: this.config.qrsComplex.amplitude * this.config.amplitude * leadMultiplier
        }, this.config.samplingRate);
        const stElevation = this.config.stSegment.elevation[lead] || 0;
        const stDepression = this.config.stSegment.depression[lead] || 0;
        const stOffset = (stElevation - stDepression) * this.config.amplitude * leadMultiplier;
        const stSegment = generateSTSegment(stStart, stEnd, stOffset, this.config.samplingRate);
        const tWave = generateTWave(tTime, {
            ...this.config.tWave,
            amplitude: this.config.tWave.amplitude * this.config.amplitude * leadMultiplier
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
                qrsComplex: { amplitude: 1.2, duration: 0.08, shape: 'triangular' },
                tWave: { amplitude: 0.5, duration: 0.18, shape: 'gaussian' }
            },
            'stemi-inferior': {
                heartRate: 65,
                stSegment: {
                    elevation: { II: 0.4, III: 0.5, aVF: 0.4 },
                    depression: { I: 0.1, aVL: 0.15, V2: 0.1 }
                },
                qrsComplex: { amplitude: 1.1, duration: 0.08, shape: 'triangular' },
                tWave: { amplitude: 0.4, duration: 0.17, shape: 'gaussian' }
            },
            'stemi-lateral': {
                heartRate: 90,
                stSegment: {
                    elevation: { I: 0.3, aVL: 0.4, V5: 0.4, V6: 0.3 },
                    depression: { II: 0.1, III: 0.1, aVF: 0.1 }
                },
                qrsComplex: { amplitude: 1.3, duration: 0.08, shape: 'triangular' },
                tWave: { amplitude: 0.4, duration: 0.16, shape: 'gaussian' }
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

const ECGCanvas = React.forwardRef(({ configuration = {}, renderOptions = {}, pattern = 'normal', width = 1200, height = 800, onECGGenerated, className, style }, ref) => {
    const canvasRef = React.useRef(null);
    const rendererRef = React.useRef(null);
    const generatorRef = React.useRef(null);
    const currentECGDataRef = React.useRef(null);
    const defaultRenderOptions = {
        width,
        height,
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
        ...renderOptions
    };
    React.useEffect(() => {
        if (canvasRef.current) {
            rendererRef.current = new ECGRenderer(canvasRef.current, defaultRenderOptions);
            generateECG();
        }
    }, []);
    React.useEffect(() => {
        generateECG();
    }, [configuration, pattern]);
    React.useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.updateOptions(defaultRenderOptions);
            if (currentECGDataRef.current) {
                rendererRef.current.render(currentECGDataRef.current);
            }
        }
    }, [renderOptions, width, height]);
    const generateECG = () => {
        let config = {
            heartRate: 75,
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
            ...configuration
        };
        if (pattern !== 'normal') {
            config = ClinicalPatterns.applyPattern(config, pattern);
        }
        if (!generatorRef.current) {
            generatorRef.current = new ECGGenerator(config);
        }
        else {
            generatorRef.current.updateConfiguration(config);
        }
        const ecgData = generatorRef.current.generate();
        currentECGDataRef.current = ecgData;
        if (rendererRef.current) {
            rendererRef.current.render(ecgData);
        }
        if (onECGGenerated) {
            onECGGenerated(ecgData);
        }
        return ecgData;
    };
    const updateConfiguration = (newConfig) => {
        if (generatorRef.current) {
            generatorRef.current.updateConfiguration(newConfig);
            generateECG();
        }
    };
    const updateRenderOptions = (newOptions) => {
        if (rendererRef.current) {
            rendererRef.current.updateOptions(newOptions);
            if (currentECGDataRef.current) {
                rendererRef.current.render(currentECGDataRef.current);
            }
        }
    };
    const exportAsJSON = () => {
        if (!currentECGDataRef.current) {
            throw new Error('No ECG data available. Generate ECG first.');
        }
        return ECGExporter.toJSON(currentECGDataRef.current);
    };
    const exportAsCSV = () => {
        if (!currentECGDataRef.current) {
            throw new Error('No ECG data available. Generate ECG first.');
        }
        return ECGExporter.toCSV(currentECGDataRef.current);
    };
    const exportAsSVG = () => {
        if (!rendererRef.current || !currentECGDataRef.current) {
            throw new Error('No ECG data or renderer available. Generate ECG first.');
        }
        return rendererRef.current.exportAsSVG(currentECGDataRef.current);
    };
    const downloadJSON = (filename = 'ecg-data.json') => {
        const json = exportAsJSON();
        ECGExporter.downloadFile(json, filename, 'application/json');
    };
    const downloadCSV = (filename = 'ecg-data.csv') => {
        const csv = exportAsCSV();
        ECGExporter.downloadFile(csv, filename, 'text/csv');
    };
    const downloadSVG = (filename = 'ecg-trace.svg') => {
        const svg = exportAsSVG();
        ECGExporter.downloadFile(svg, filename, 'image/svg+xml');
    };
    const getECGData = () => {
        return currentECGDataRef.current;
    };
    React.useImperativeHandle(ref, () => ({
        generateECG,
        exportAsJSON,
        exportAsCSV,
        exportAsSVG,
        downloadJSON,
        downloadCSV,
        downloadSVG,
        getECGData,
        updateConfiguration,
        updateRenderOptions
    }));
    return (jsxRuntime.jsx("canvas", { ref: canvasRef, width: width, height: height, className: className, style: style }));
});
ECGCanvas.displayName = 'ECGCanvas';
const ECGControlPanel = ({ onConfigurationChange, onPatternChange, onRenderOptionsChange, initialConfiguration = {}, initialPattern = 'normal', initialRenderOptions = {}, className, style }) => {
    const [config, setConfig] = React.useState({
        heartRate: 75,
        duration: 10,
        amplitude: 1.0,
        ...initialConfiguration
    });
    const [pattern, setPattern] = React.useState(initialPattern);
    const [renderOptions, setRenderOptions] = React.useState({
        gain: 10,
        showGrid: true,
        showLabels: true,
        ...initialRenderOptions
    });
    const handleConfigChange = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        if (onConfigurationChange) {
            onConfigurationChange(newConfig);
        }
    };
    const handlePatternChange = (newPattern) => {
        setPattern(newPattern);
        if (onPatternChange) {
            onPatternChange(newPattern);
        }
    };
    const handleRenderOptionChange = (key, value) => {
        const newOptions = { ...renderOptions, [key]: value };
        setRenderOptions(newOptions);
        if (onRenderOptionsChange) {
            onRenderOptionsChange(newOptions);
        }
    };
    return (jsxRuntime.jsx("div", { className: className, style: style, children: jsxRuntime.jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }, children: [jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: ["Heart Rate (bpm): ", config.heartRate, jsxRuntime.jsx("input", { type: "range", min: "40", max: "150", value: config.heartRate, onChange: (e) => handleConfigChange('heartRate', parseInt(e.target.value)) })] }) }), jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: ["Duration (s): ", config.duration, jsxRuntime.jsx("input", { type: "range", min: "5", max: "30", value: config.duration, onChange: (e) => handleConfigChange('duration', parseInt(e.target.value)) })] }) }), jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: ["Amplitude: ", config.amplitude, jsxRuntime.jsx("input", { type: "range", min: "0.5", max: "2", step: "0.1", value: config.amplitude, onChange: (e) => handleConfigChange('amplitude', parseFloat(e.target.value)) })] }) }), jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: ["Display Gain: ", renderOptions.gain, jsxRuntime.jsx("input", { type: "range", min: "5", max: "25", value: renderOptions.gain, onChange: (e) => handleRenderOptionChange('gain', parseInt(e.target.value)) })] }) }), jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: ["Clinical Pattern:", jsxRuntime.jsxs("select", { value: pattern, onChange: (e) => handlePatternChange(e.target.value), children: [jsxRuntime.jsx("option", { value: "normal", children: "Normal" }), jsxRuntime.jsx("option", { value: "stemi-anterior", children: "STEMI - Anterior" }), jsxRuntime.jsx("option", { value: "stemi-inferior", children: "STEMI - Inferior" }), jsxRuntime.jsx("option", { value: "stemi-lateral", children: "STEMI - Lateral" }), jsxRuntime.jsx("option", { value: "nstemi", children: "NSTEMI" }), jsxRuntime.jsx("option", { value: "pericarditis", children: "Pericarditis" }), jsxRuntime.jsx("option", { value: "lvh", children: "Left Ventricular Hypertrophy" }), jsxRuntime.jsx("option", { value: "rbbb", children: "Right Bundle Branch Block" }), jsxRuntime.jsx("option", { value: "lbbb", children: "Left Bundle Branch Block" })] })] }) }), jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: [jsxRuntime.jsx("input", { type: "checkbox", checked: renderOptions.showGrid, onChange: (e) => handleRenderOptionChange('showGrid', e.target.checked) }), "Show Grid"] }) }), jsxRuntime.jsx("div", { children: jsxRuntime.jsxs("label", { children: [jsxRuntime.jsx("input", { type: "checkbox", checked: renderOptions.showLabels, onChange: (e) => handleRenderOptionChange('showLabels', e.target.checked) }), "Show Labels"] }) })] }) }));
};
const ECGSimulator = ({ width = 1200, height = 800, initialConfiguration = {}, initialPattern = 'normal', initialRenderOptions = {}, onECGGenerated, showControls = true, className, style }) => {
    const ecgCanvasRef = React.useRef(null);
    const [config, setConfig] = React.useState(initialConfiguration);
    const [pattern, setPattern] = React.useState(initialPattern);
    const [renderOptions, setRenderOptions] = React.useState(initialRenderOptions);
    const handleConfigurationChange = (newConfig) => {
        setConfig(newConfig);
        if (ecgCanvasRef.current) {
            ecgCanvasRef.current.updateConfiguration(newConfig);
        }
    };
    const handlePatternChange = (newPattern) => {
        setPattern(newPattern);
    };
    const handleRenderOptionsChange = (newOptions) => {
        setRenderOptions(newOptions);
        if (ecgCanvasRef.current) {
            ecgCanvasRef.current.updateRenderOptions(newOptions);
        }
    };
    const handleExportJSON = () => {
        if (ecgCanvasRef.current) {
            ecgCanvasRef.current.downloadJSON();
        }
    };
    const handleExportCSV = () => {
        if (ecgCanvasRef.current) {
            ecgCanvasRef.current.downloadCSV();
        }
    };
    const handleExportSVG = () => {
        if (ecgCanvasRef.current) {
            ecgCanvasRef.current.downloadSVG();
        }
    };
    return (jsxRuntime.jsxs("div", { className: className, style: style, children: [showControls && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(ECGControlPanel, { onConfigurationChange: handleConfigurationChange, onPatternChange: handlePatternChange, onRenderOptionsChange: handleRenderOptionsChange, initialConfiguration: config, initialPattern: pattern, initialRenderOptions: renderOptions, style: { marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' } }), jsxRuntime.jsxs("div", { style: { marginBottom: '1rem', display: 'flex', gap: '0.5rem' }, children: [jsxRuntime.jsx("button", { onClick: handleExportJSON, style: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }, children: "Export JSON" }), jsxRuntime.jsx("button", { onClick: handleExportCSV, style: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }, children: "Export CSV" }), jsxRuntime.jsx("button", { onClick: handleExportSVG, style: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }, children: "Export SVG" })] })] })), jsxRuntime.jsx(ECGCanvas, { ref: ecgCanvasRef, configuration: config, renderOptions: renderOptions, pattern: pattern, width: width, height: height, onECGGenerated: onECGGenerated, style: { border: '1px solid #ddd' } })] }));
};

exports.ECGCanvas = ECGCanvas;
exports.ECGControlPanel = ECGControlPanel;
exports.ECGSimulator = ECGSimulator;
//# sourceMappingURL=react.js.map
