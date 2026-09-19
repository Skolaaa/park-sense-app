import { APP_CONFIG } from '../utils/constants';
import packageJson from '../../package.json';

describe('APP_CONFIG', () => {
  // The version used to be hardcoded and drifted from package.json on every
  // release. This locks the two together.
  test('version tracks package.json', () => {
    expect(APP_CONFIG.version).toBe(packageJson.version);
  });

  test('version is a semver string, not a placeholder', () => {
    expect(APP_CONFIG.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('name and description are set', () => {
    expect(APP_CONFIG.name).toBe('ParkSense');
    expect(APP_CONFIG.description).toBeTruthy();
  });
});
