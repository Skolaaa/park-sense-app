// An opaque id for this install. It is made up here, kept in localStorage,
// and sent as a header so the server can meter scans per device. It is not
// an account and it identifies nothing but this browser profile; clearing
// site data makes a new one.

const STORAGE_KEY = 'parksense_device';
const HEADER = 'x-parksense-device';

function generate() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  let out = '';
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

let memoryId = null;

export const Identity = {
  HEADER,

  getDeviceId() {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
      const fresh = generate();
      localStorage.setItem(STORAGE_KEY, fresh);
      return fresh;
    } catch {
      // Private mode or blocked storage: keep one for the life of the page.
      if (!memoryId) memoryId = generate();
      return memoryId;
    }
  },

  headers() {
    return { [HEADER]: this.getDeviceId() };
  },
};
