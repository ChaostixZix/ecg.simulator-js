import { ECGData, ECGLeadData, RenderOptions } from './types';

export class ECGRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: RenderOptions;

  constructor(canvas: HTMLCanvasElement, options: Partial<RenderOptions> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
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

  private drawGrid(): void {
    if (!this.options.showGrid) return;

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

  private drawTrace(leadData: ECGLeadData, xOffset: number, yOffset: number, width: number, height: number): void {
    const ctx = this.ctx;
    const { traceColor, gain, paperSpeed, gridSize } = this.options;

    if (leadData.data.length === 0) return;

    ctx.strokeStyle = traceColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const maxTime = Math.max(...leadData.data.map(p => p.time));
    // Pixels per second based on ECG paper speed (mm/s) and pixels-per-mm (gridSize)
    const pxPerSecond = paperSpeed * gridSize;
    // If the trace would overflow, fall back to fit-to-width
    const timeScale = Math.min(pxPerSecond, width / maxTime);
    // Pixels per mV = gain (mm/mV) * pixels-per-mm (gridSize)
    const amplitudeScale = gain * gridSize;
    const baselineY = yOffset + height / 2;

    let isFirstPoint = true;
    for (const point of leadData.data) {
      const x = xOffset + point.time * timeScale;
      const y = baselineY - point.amplitude * amplitudeScale;

      if (isFirstPoint) {
        ctx.moveTo(x, y);
        isFirstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  private drawLabel(text: string, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  }

  render(ecgData: ECGData): void {
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

  exportAsSVG(ecgData: ECGData): string {
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
        const maxTime = Math.max(...leadData.data.map(p => p.time));
        const pxPerSecond = paperSpeed * gridSize;
        const timeScale = Math.min(pxPerSecond, w / maxTime);
        const amplitudeScale = gain * gridSize;
        const baselineY = y + h / 2;

        let pathD = '';
        leadData.data.forEach((point, i) => {
          const px = x + point.time * timeScale;
          const py = baselineY - point.amplitude * amplitudeScale;
          pathD += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
        });

        svg += `<path d="${pathD}" fill="none" stroke="${traceColor}" stroke-width="1.5"/>`;
      }

      if (showLabels) {
        svg += `<text x="${x - 15}" y="${y - 5}" font-family="Arial" font-size="12" fill="#000000">${leadData.lead}</text>`;
      }
    });

    svg += '</svg>';
    return svg;
  }

  updateOptions(newOptions: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
  }
}
