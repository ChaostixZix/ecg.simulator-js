import { ECGConfiguration, ClinicalPattern, STSegmentConfig } from './types';
export declare class ClinicalPatterns {
    static getPattern(pattern: ClinicalPattern): Partial<ECGConfiguration>;
    static applyPattern(baseConfig: ECGConfiguration, pattern: ClinicalPattern): ECGConfiguration;
    static getPatternDescription(pattern: ClinicalPattern): string;
    static setSTSegmentOffsets(elevation: Record<string, number>, depression: Record<string, number>): STSegmentConfig;
}
//# sourceMappingURL=patterns.d.ts.map