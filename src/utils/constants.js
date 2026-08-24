// Single source of truth for the version is package.json, so the footer can
// never drift from the released version again.
//
// CRA's ModuleScopePlugin explicitly allowlists package.json, so importing it
// from src/ is supported. It must be a DEFAULT import — `import { version }`
// compiles in dev but fails `react-scripts build` with "Should not import the
// named export 'version' ... from default-exporting module".
import packageJson from '../../package.json';

export const APP_CONFIG = {
  name: 'ParkSense',
  version: packageJson.version,
  description: 'Smart parking sign analysis',
};

export const CAMERA_CONFIG = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
};

export const ANALYSIS_STATES = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
  ERROR: 'error'
};

export const VIEW_STATES = {
  HOME: 'home',
  CAMERA: 'camera',
  PREVIEW: 'preview',
  SIDE_SELECTION: 'side_selection',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
  TIMER: 'timer',
};

export const TIMER_CONFIG = {
  STORAGE_KEY: 'parksense_timer',
  WARNING_THRESHOLD_MS: 15 * 60 * 1000,
};