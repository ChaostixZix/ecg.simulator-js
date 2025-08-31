# ECG-JS

A lightweight TypeScript library for educational 12-lead ECG simulation with Canvas/SVG rendering support.

## Features

- **Realistic ECG Waveforms**: Generate PQRST morphology with accurate timing intervals
- **12-Lead Support**: Complete standard ECG lead configuration (I, II, III, aVR, aVL, aVF, V1-V6)
- **Clinical Patterns**: Pre-built templates for common conditions (STEMI, NSTEMI, Pericarditis, etc.)
- **ST-Segment Control**: Individual lead-specific ST elevation/depression
- **Multiple Export Formats**: JSON, CSV, SVG, and FHIR-compatible output
- **Canvas/SVG Rendering**: Built-in ECG grid rendering with customizable options
- **React Components**: Optional React wrapper components for easy integration
- **TypeScript**: Full type safety and excellent IDE support

## Installation

```bash
npm install ecgsim-js
```

## Quick Start

### Basic Usage

```typescript
import { ECGGenerator, ECGRenderer } from 'ecgsim-js';

// Create ECG generator
const generator = new ECGGenerator({
  heartRate: 75,
  duration: 10,
  amplitude: 1.0
});

// Generate 12-lead ECG data
const ecgData = generator.generate();

// Render to canvas
const canvas = document.getElementById('ecg-canvas') as HTMLCanvasElement;
const renderer = new ECGRenderer(canvas);
renderer.render(ecgData);
```

### Clinical Patterns

```typescript
import { ClinicalPatterns } from 'ecgsim-js';

// Apply STEMI anterior pattern
const config = ClinicalPatterns.applyPattern(baseConfig, 'stemi-anterior');
const generator = new ECGGenerator(config);
const ecgData = generator.generate();
```

### ST-Segment Modifications

```typescript
const generator = new ECGGenerator({
  heartRate: 85,
  stSegment: {
    elevation: { 'V2': 0.3, 'V3': 0.4, 'V4': 0.3 },  // ST elevation in anterior leads
    depression: { 'II': 0.1, 'III': 0.1, 'aVF': 0.1 } // Reciprocal depression
  }
});
```

### Export Options

```typescript
import { ECGExporter } from 'ecgsim-js';

// Export as JSON
const jsonData = ECGExporter.toJSON(ecgData);

// Export as CSV
const csvData = ECGExporter.toCSV(ecgData);

// Export as FHIR
const fhirResource = ECGExporter.toFHIR(ecgData, 'patient123');

// Download files
ECGExporter.downloadFile(jsonData, 'ecg-data.json');
```

## React Integration

```tsx
import { ECGSimulator } from 'ecgsim-js/react';

function MyComponent() {
  return (
    <ECGSimulator
      width={1200}
      height={800}
      initialConfiguration={{ heartRate: 80 }}
      initialPattern="stemi-anterior"
      onECGGenerated={(data) => console.log('ECG generated:', data)}
    />
  );
}
```

## API Reference

### ECGGenerator

```typescript
class ECGGenerator {
  constructor(config?: Partial<ECGConfiguration>);
  updateConfiguration(config: Partial<ECGConfiguration>): void;
  generate(): ECGData;
  generateSingleLead(lead: ECGLead): ECGLeadData;
}
```

### ECGRenderer

```typescript
class ECGRenderer {
  constructor(canvas: HTMLCanvasElement, options?: Partial<RenderOptions>);
  render(ecgData: ECGData): void;
  exportAsSVG(ecgData: ECGData): string;
  updateOptions(options: Partial<RenderOptions>): void;
}
```

### ClinicalPatterns

Available patterns:
- `normal` - Normal sinus rhythm
- `stemi-anterior` - Anterior STEMI (V1-V4)
- `stemi-inferior` - Inferior STEMI (II, III, aVF)
- `stemi-lateral` - Lateral STEMI (I, aVL, V5-V6)
- `nstemi` - Non-ST elevation MI
- `pericarditis` - Acute pericarditis
- `lvh` - Left ventricular hypertrophy
- `rbbb` - Right bundle branch block
- `lbbb` - Left bundle branch block

## Configuration Options

### ECG Configuration

```typescript
interface ECGConfiguration {
  heartRate: number;           // BPM (40-150)
  duration: number;            // Seconds
  samplingRate: number;        // Hz (typically 1000)
  amplitude: number;           // Overall amplitude multiplier
  pWave: WaveformConfig;       // P-wave parameters
  qrsComplex: WaveformConfig;  // QRS complex parameters
  tWave: WaveformConfig;       // T-wave parameters
  stSegment: STSegmentConfig;  // ST segment elevations/depressions
  prInterval: number;          // PR interval (seconds)
  qtInterval: number;          // QT interval (seconds)
  qrsWidth: number;            // QRS width (seconds)
}
```

### Render Options

```typescript
interface RenderOptions {
  width: number;          // Canvas width
  height: number;         // Canvas height
  gridSize: number;       // Grid spacing in pixels
  gridColor: string;      // Grid color
  traceColor: string;     // ECG trace color
  backgroundColor: string; // Background color
  showGrid: boolean;      // Show/hide grid
  showLabels: boolean;    // Show/hide lead labels
  gain: number;           // Display gain (mm/mV)
  paperSpeed: number;     // Paper speed (mm/s)
}
```

## Demo

### Running the Demo

The library includes interactive demos that showcase all features. Since the demos use ES modules, they need to be served over HTTP (not opened directly as files).

#### Option 1: Using Python (Recommended)
```bash
# Clone and build the project
git clone https://github.com/your-repo/ecg-js
cd ecg-js
npm install
npm run build

# Serve the demo using Python's built-in server
python3 -m http.server 8080
# or for Python 2:
# python -m SimpleHTTPServer 8080

# Open in browser: http://localhost:8080/demo/
```

#### Option 2: Using Node.js serve package
```bash
# Install a simple static server
npm install -g serve

# After building the project
serve -s . -p 8080

# Open in browser: http://localhost:8080/demo/
```

#### Option 3: Using Live Server (VS Code Extension)
If you're using VS Code, install the "Live Server" extension, then right-click on `demo/index.html` and select "Open with Live Server".

### Demo Files
- **`demo/index.html`** - Full interactive demo with all controls and clinical patterns
- **`demo/simple.html`** - Basic usage example with minimal controls

### What the Demo Shows
- Real-time ECG generation with adjustable heart rate and duration
- All 9 clinical patterns (Normal, STEMI variants, NSTEMI, Pericarditis, etc.)
- ST-segment elevation/depression controls for each lead
- Export functionality (JSON, CSV, SVG)
- Interactive rendering controls (gain, grid, labels)

### Screenshots

**Normal ECG Pattern:**
![Normal ECG Pattern](https://github.com/user-attachments/assets/295017ee-825e-422c-b939-fb695c8240e6)

**STEMI - Anterior Pattern:**
![STEMI Anterior Pattern](https://github.com/user-attachments/assets/5ba518ee-0716-401b-bbb2-937c1a4e698d)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build library
npm run build

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## License

MIT License - see LICENSE file for details.

## Educational Use

This library is designed for educational and simulation purposes. It should not be used for actual medical diagnosis or patient care. The generated ECG patterns are simplified representations for learning and demonstration purposes.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## Changelog

### 1.0.0
- Initial release
- 12-lead ECG generation
- Clinical pattern templates
- Canvas/SVG rendering
- Multiple export formats
- React components
- TypeScript support