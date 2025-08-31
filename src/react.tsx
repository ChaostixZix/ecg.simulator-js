import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ECGGenerator, ECGRenderer, ECGExporter } from './index';
import { ECGConfiguration, ECGData, RenderOptions, ClinicalPattern } from './types';
import { ClinicalPatterns } from './patterns';

export interface ECGCanvasProps {
  configuration?: Partial<ECGConfiguration>;
  renderOptions?: Partial<RenderOptions>;
  pattern?: ClinicalPattern;
  width?: number;
  height?: number;
  onECGGenerated?: (data: ECGData) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface ECGCanvasRef {
  generateECG: () => ECGData;
  exportAsJSON: () => string;
  exportAsCSV: () => string;
  exportAsSVG: () => string;
  downloadJSON: (filename?: string) => void;
  downloadCSV: (filename?: string) => void;
  downloadSVG: (filename?: string) => void;
  getECGData: () => ECGData | null;
  updateConfiguration: (config: Partial<ECGConfiguration>) => void;
  updateRenderOptions: (options: Partial<RenderOptions>) => void;
}

export const ECGCanvas = forwardRef<ECGCanvasRef, ECGCanvasProps>(({
  configuration = {},
  renderOptions = {},
  pattern = 'normal',
  width = 1200,
  height = 800,
  onECGGenerated,
  className,
  style
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ECGRenderer | null>(null);
  const generatorRef = useRef<ECGGenerator | null>(null);
  const currentECGDataRef = useRef<ECGData | null>(null);

  const defaultRenderOptions: RenderOptions = {
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

  useEffect(() => {
    if (canvasRef.current) {
      rendererRef.current = new ECGRenderer(canvasRef.current, defaultRenderOptions);
      generateECG();
    }
  }, []);

  useEffect(() => {
    generateECG();
  }, [configuration, pattern]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateOptions(defaultRenderOptions);
      if (currentECGDataRef.current) {
        rendererRef.current.render(currentECGDataRef.current);
      }
    }
  }, [renderOptions, width, height]);

  const generateECG = (): ECGData => {
    let config: ECGConfiguration = {
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
    } else {
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

  const updateConfiguration = (newConfig: Partial<ECGConfiguration>): void => {
    if (generatorRef.current) {
      generatorRef.current.updateConfiguration(newConfig);
      generateECG();
    }
  };

  const updateRenderOptions = (newOptions: Partial<RenderOptions>): void => {
    if (rendererRef.current) {
      rendererRef.current.updateOptions(newOptions);
      if (currentECGDataRef.current) {
        rendererRef.current.render(currentECGDataRef.current);
      }
    }
  };

  const exportAsJSON = (): string => {
    if (!currentECGDataRef.current) {
      throw new Error('No ECG data available. Generate ECG first.');
    }
    return ECGExporter.toJSON(currentECGDataRef.current);
  };

  const exportAsCSV = (): string => {
    if (!currentECGDataRef.current) {
      throw new Error('No ECG data available. Generate ECG first.');
    }
    return ECGExporter.toCSV(currentECGDataRef.current);
  };

  const exportAsSVG = (): string => {
    if (!rendererRef.current || !currentECGDataRef.current) {
      throw new Error('No ECG data or renderer available. Generate ECG first.');
    }
    return rendererRef.current.exportAsSVG(currentECGDataRef.current);
  };

  const downloadJSON = (filename = 'ecg-data.json'): void => {
    const json = exportAsJSON();
    ECGExporter.downloadFile(json, filename, 'application/json');
  };

  const downloadCSV = (filename = 'ecg-data.csv'): void => {
    const csv = exportAsCSV();
    ECGExporter.downloadFile(csv, filename, 'text/csv');
  };

  const downloadSVG = (filename = 'ecg-trace.svg'): void => {
    const svg = exportAsSVG();
    ECGExporter.downloadFile(svg, filename, 'image/svg+xml');
  };

  const getECGData = (): ECGData | null => {
    return currentECGDataRef.current;
  };

  useImperativeHandle(ref, () => ({
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

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
});

ECGCanvas.displayName = 'ECGCanvas';

export interface ECGControlPanelProps {
  onConfigurationChange?: (config: Partial<ECGConfiguration>) => void;
  onPatternChange?: (pattern: ClinicalPattern) => void;
  onRenderOptionsChange?: (options: Partial<RenderOptions>) => void;
  initialConfiguration?: Partial<ECGConfiguration>;
  initialPattern?: ClinicalPattern;
  initialRenderOptions?: Partial<RenderOptions>;
  className?: string;
  style?: React.CSSProperties;
}

export const ECGControlPanel: React.FC<ECGControlPanelProps> = ({
  onConfigurationChange,
  onPatternChange,
  onRenderOptionsChange,
  initialConfiguration = {},
  initialPattern = 'normal',
  initialRenderOptions = {},
  className,
  style
}) => {
  const [config, setConfig] = React.useState({
    heartRate: 75,
    duration: 10,
    amplitude: 1.0,
    ...initialConfiguration
  });
  
  const [pattern, setPattern] = React.useState<ClinicalPattern>(initialPattern);
  
  const [renderOptions, setRenderOptions] = React.useState({
    gain: 10,
    showGrid: true,
    showLabels: true,
    ...initialRenderOptions
  });

  const handleConfigChange = (key: string, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (onConfigurationChange) {
      onConfigurationChange(newConfig);
    }
  };

  const handlePatternChange = (newPattern: ClinicalPattern) => {
    setPattern(newPattern);
    if (onPatternChange) {
      onPatternChange(newPattern);
    }
  };

  const handleRenderOptionChange = (key: string, value: number | boolean) => {
    const newOptions = { ...renderOptions, [key]: value };
    setRenderOptions(newOptions);
    if (onRenderOptionsChange) {
      onRenderOptionsChange(newOptions);
    }
  };

  return (
    <div className={className} style={style}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label>
            Heart Rate (bpm): {config.heartRate}
            <input
              type="range"
              min="40"
              max="150"
              value={config.heartRate}
              onChange={(e) => handleConfigChange('heartRate', parseInt(e.target.value))}
            />
          </label>
        </div>

        <div>
          <label>
            Duration (s): {config.duration}
            <input
              type="range"
              min="5"
              max="30"
              value={config.duration}
              onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
            />
          </label>
        </div>

        <div>
          <label>
            Amplitude: {config.amplitude}
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.amplitude}
              onChange={(e) => handleConfigChange('amplitude', parseFloat(e.target.value))}
            />
          </label>
        </div>

        <div>
          <label>
            Display Gain: {renderOptions.gain}
            <input
              type="range"
              min="5"
              max="25"
              value={renderOptions.gain}
              onChange={(e) => handleRenderOptionChange('gain', parseInt(e.target.value))}
            />
          </label>
        </div>

        <div>
          <label>
            Clinical Pattern:
            <select
              value={pattern}
              onChange={(e) => handlePatternChange(e.target.value as ClinicalPattern)}
            >
              <option value="normal">Normal</option>
              <option value="stemi-anterior">STEMI - Anterior</option>
              <option value="stemi-inferior">STEMI - Inferior</option>
              <option value="stemi-lateral">STEMI - Lateral</option>
              <option value="nstemi">NSTEMI</option>
              <option value="pericarditis">Pericarditis</option>
              <option value="lvh">Left Ventricular Hypertrophy</option>
              <option value="rbbb">Right Bundle Branch Block</option>
              <option value="lbbb">Left Bundle Branch Block</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={renderOptions.showGrid}
              onChange={(e) => handleRenderOptionChange('showGrid', e.target.checked)}
            />
            Show Grid
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={renderOptions.showLabels}
              onChange={(e) => handleRenderOptionChange('showLabels', e.target.checked)}
            />
            Show Labels
          </label>
        </div>
      </div>
    </div>
  );
};

export interface ECGSimulatorProps {
  width?: number;
  height?: number;
  initialConfiguration?: Partial<ECGConfiguration>;
  initialPattern?: ClinicalPattern;
  initialRenderOptions?: Partial<RenderOptions>;
  onECGGenerated?: (data: ECGData) => void;
  showControls?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ECGSimulator: React.FC<ECGSimulatorProps> = ({
  width = 1200,
  height = 800,
  initialConfiguration = {},
  initialPattern = 'normal',
  initialRenderOptions = {},
  onECGGenerated,
  showControls = true,
  className,
  style
}) => {
  const ecgCanvasRef = useRef<ECGCanvasRef>(null);
  const [config, setConfig] = React.useState(initialConfiguration);
  const [pattern, setPattern] = React.useState(initialPattern);
  const [renderOptions, setRenderOptions] = React.useState(initialRenderOptions);

  const handleConfigurationChange = (newConfig: Partial<ECGConfiguration>) => {
    setConfig(newConfig);
    if (ecgCanvasRef.current) {
      ecgCanvasRef.current.updateConfiguration(newConfig);
    }
  };

  const handlePatternChange = (newPattern: ClinicalPattern) => {
    setPattern(newPattern);
  };

  const handleRenderOptionsChange = (newOptions: Partial<RenderOptions>) => {
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

  return (
    <div className={className} style={style}>
      {showControls && (
        <>
          <ECGControlPanel
            onConfigurationChange={handleConfigurationChange}
            onPatternChange={handlePatternChange}
            onRenderOptionsChange={handleRenderOptionsChange}
            initialConfiguration={config}
            initialPattern={pattern}
            initialRenderOptions={renderOptions}
            style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}
          />
          
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleExportJSON} style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
              Export JSON
            </button>
            <button onClick={handleExportCSV} style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
              Export CSV
            </button>
            <button onClick={handleExportSVG} style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
              Export SVG
            </button>
          </div>
        </>
      )}
      
      <ECGCanvas
        ref={ecgCanvasRef}
        configuration={config}
        renderOptions={renderOptions}
        pattern={pattern}
        width={width}
        height={height}
        onECGGenerated={onECGGenerated}
        style={{ border: '1px solid #ddd' }}
      />
    </div>
  );
};
