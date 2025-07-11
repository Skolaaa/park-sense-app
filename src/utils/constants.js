export const APP_CONFIG = {
  name: 'ParkSense',
  version: '1.0.0',
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
  ANALYZING: 'analyzing',
  RESULTS: 'results'
};