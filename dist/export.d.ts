import { ECGData } from './types';
export declare class ECGExporter {
    static toJSON(ecgData: ECGData): string;
    static fromJSON(jsonString: string): ECGData;
    private static validateECGData;
    static toCSV(ecgData: ECGData): string;
    static toFHIR(ecgData: ECGData, patientId?: string): object;
    private static getLeadSnomedCode;
    static downloadFile(content: string, filename: string, contentType?: string): void;
}
//# sourceMappingURL=export.d.ts.map