import { ECGData, RenderOptions } from './types';
export declare class ECGRenderer {
    private canvas;
    private ctx;
    private options;
    constructor(canvas: HTMLCanvasElement, options?: Partial<RenderOptions>);
    private drawGrid;
    private drawTrace;
    private drawLabel;
    render(ecgData: ECGData): void;
    exportAsSVG(ecgData: ECGData): string;
    updateOptions(newOptions: Partial<RenderOptions>): void;
}
//# sourceMappingURL=renderer.d.ts.map