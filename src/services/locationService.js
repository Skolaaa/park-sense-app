// Fetches the user's current GPS coordinates and reverse-geocodes them to a
// street address using the free Nominatim API (no API key required).
// Gracefully returns null on any failure — location is purely supplemental.

export const LocationService = {
  async getCurrentAddress() {
    const coords = await this._getCoords();
    if (!coords) return null;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en-AU', 'User-Agent': 'ParkSenseApp/1.0' },
      });
      if (!response.ok) return { lat: coords.lat, lon: coords.lon, address: null };
      const data = await response.json();
      const address = data.display_name || null;
      return { lat: coords.lat, lon: coords.lon, address };
    } catch {
      return { lat: coords.lat, lon: coords.lon, address: null };
    }
  },

  _getCoords() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 30000 }
      );
    });
  },
};
