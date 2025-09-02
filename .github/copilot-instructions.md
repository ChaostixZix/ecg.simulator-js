# ECG Simulator JavaScript Library

ECG Simulator JS is a TypeScript library for educational 12-lead ECG simulation with Canvas/SVG rendering support. It generates realistic ECG patterns for various cardiac conditions and includes React components for interactive demos.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build the Repository
- `npm install` -- takes 15-20 seconds. NEVER CANCEL. Set timeout to 30+ minutes for CI environments.
- `npm run build` -- takes 4-5 seconds. NEVER CANCEL. Set timeout to 5+ minutes.
- `npm test` -- takes 30 seconds. NEVER CANCEL. Set timeout to 10+ minutes.
- `npm run lint` -- takes 1 second. Set timeout to 5+ minutes.
- `npm run typecheck` -- takes 2 seconds but shows React-related type errors (these are harmless). Set timeout to 5+ minutes.

### Run the Demo Application
- ALWAYS run the bootstrapping steps first (`npm install` and `npm run build`).
- Start demo server: `npm run serve` -- serves on http://localhost:8080
- Demo URLs:
  - Full interactive demo: http://localhost:8080/demo/
  - Simple demo: http://localhost:8080/demo/simple.html
- Alternative server start: `npm start` (same as `npm run serve`)

### Alternative Demo Serving Methods
If `npm run serve` doesn't work, try these alternatives:
- Python: `python3 -m http.server 8080` (after building)
- Node serve: `npm install -g serve && serve -s . -p 8080` (after building)

## Validation

### CRITICAL: Always Manually Validate ECG Generation
After making changes to the core ECG functionality, you MUST manually test these scenarios:

1. **Normal ECG Pattern**:
   - Navigate to http://localhost:8080/demo/
   - Ensure "Normal" pattern is selected
   - Click "Generate ECG"
   - Verify 12 ECG leads display with normal waveforms (P-QRS-T complexes)

2. **STEMI Pattern Validation**:
   - Select "STEMI - Anterior" from Clinical Pattern dropdown
   - Verify ST-segment elevation fields auto-populate (V1: 0.3, V2: 0.4, V3: 0.5, V4: 0.4)
   - Click "Generate ECG" 
   - Verify leads V1-V4 show elevated ST segments, reciprocal depression in inferior leads

3. **Interactive Controls**:
   - Test heart rate slider (40-150 BPM) - should update ECG rhythm
   - Test duration slider (5-30 seconds) - should change ECG length
   - Test amplitude and gain controls - should affect waveform size
   - Test grid and labels checkboxes - should toggle display elements

4. **Export Functionality**:
   - Click "Export JSON" - should download ecg-data.json file
   - Click "Export CSV" - should download ecg-data.csv file  
   - Click "Export SVG" - should download ecg-trace.svg file

### Pre-Commit Validation
Always run these commands before committing:
- `npm run lint` -- must pass with no errors
- `npm run build` -- must complete successfully
- Manually test at least one ECG pattern in the demo

## Common Tasks

### Known Issues and Workarounds
- **Test Failure**: One test expects default heartRate of 75, but actual default is 60. This is a test bug, not a code bug.
- **TypeScript Errors**: React-related type errors appear during `npm run typecheck` but don't affect functionality. The main ECG library works correctly.
- **ESLint Warning**: TypeScript version warning appears but linting still works correctly.

### Repository Structure
The following are key locations in the codebase:

#### Source Code (`src/`)
- `generator.ts` - Core ECG data generation logic
- `renderer.ts` - Canvas/SVG rendering functionality  
- `export.ts` - Data export utilities (JSON, CSV, FHIR)
- `patterns.ts` - Clinical pattern definitions (STEMI, NSTEMI, etc.)
- `types.ts` - TypeScript interfaces and type definitions
- `react.tsx` - React components (optional, has type issues but works)
- `__tests__/` - Jest test suite (61/62 tests pass)

#### Demo Files (`demo/`)
- `index.html` - Full interactive demo with all controls
- `simple.html` - Basic demo with minimal controls

#### Build Output (`dist/`)
- Generated after `npm run build`
- Contains CJS (`index.js`) and ESM (`index.mjs`) versions
- Includes TypeScript declarations (`*.d.ts`)

### Common Commands Reference
```bash
# Essential commands (run these in order)
npm install                    # Install dependencies (15-20s)
npm run build                  # Build library (4-5s)
npm test                       # Run tests (30s, 1 test fails - known issue)
npm run serve                  # Start demo server (port 8080)

# Development commands
npm run dev                    # Build with watch mode
npm run lint                   # ESLint code checking (1s)
npm run typecheck              # TypeScript checking (2s, shows React errors)

# Alternative server commands
npm start                      # Same as npm run serve
python3 -m http.server 8080    # Alternative serving method
```

### Default Configuration Values
When creating ECG generators, these are the default values:
- Heart Rate: 60 BPM (not 75 - this is a common misconception)
- Duration: 10 seconds
- Sampling Rate: 1000 Hz
- Amplitude: 1.0
- All ST-segment elevations/depressions: 0 mV

### Important Notes for Development
- The library builds both CommonJS and ES modules for maximum compatibility
- React components are optional (peer dependency) and have type issues but work functionally
- All demos use ES modules and must be served over HTTP, not opened as local files
- The server on port 8080 automatically maps root `/` to `/demo/index.html` for convenience
- Export functionality generates real downloadable files - test this after changes
- Clinical patterns automatically populate ST-segment values when selected

### Debugging Tips
- If demo doesn't load: Check console for ES module errors, ensure proper HTTP serving
- If ECG doesn't generate: Check browser console for JavaScript errors
- If exports fail: Verify ECG data was generated first before trying to export
- If tests fail: The heartRate test failure is expected; focus on other failing tests
- If build fails: Usually TypeScript errors; check that types are properly defined

### Performance Expectations
- ECG generation is near-instantaneous (< 100ms for 10-second traces)
- Rendering 12 leads to canvas takes < 200ms  
- Build process is very fast (under 5 seconds total)
- Test suite runs quickly (30 seconds for full suite)
- Demo server starts immediately and serves files efficiently