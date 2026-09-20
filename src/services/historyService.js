// Recent scans, kept on the device. The full result is stored (it is small:
// text and numbers) along with a tiny thumbnail so the list is recognisable.
// The full-size photo is never kept.

const STORAGE_KEY = 'parksense_history';
export const HISTORY_LIMIT = 20;

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: drop the thumbnails and try once more.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map((e) => ({ ...e, thumbnail: null }))));
    } catch {
      // Give up quietly; history is a convenience.
    }
  }
}

export const HistoryService = {
  list() {
    return read();
  },

  // Returns the stored entry. `result.location` may arrive later; call
  // `attachLocation` when it does.
  add(result, thumbnail = null) {
    if (!result || result.noSignFound || result.isMockData) return null;
    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      savedAt: Date.now(),
      thumbnail,
      result: { ...result, location: result.location ?? null },
    };
    const list = [entry, ...read()].slice(0, HISTORY_LIMIT);
    write(list);
    return entry;
  },

  attachLocation(id, location) {
    const list = read();
    const entry = list.find((e) => e.id === id);
    if (!entry) return;
    entry.result = { ...entry.result, location };
    write(list);
  },

  get(id) {
    return read().find((e) => e.id === id) || null;
  },

  remove(id) {
    write(read().filter((e) => e.id !== id));
  },

  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  },
};

// A small JPEG for the list. Runs on the client; resolves null on any failure.
export function makeThumbnail(dataUrl, size = 112) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const timeout = setTimeout(() => resolve(null), 4000);
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const scale = size / Math.max(img.width, img.height);
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => { clearTimeout(timeout); resolve(null); };
      img.src = dataUrl;
    } catch {
      resolve(null);
    }
  });
}
