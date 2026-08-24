// src/services/parkingAnalysis.js
// Calls the /api/analyze serverless proxy, which holds the OpenAI API key
// server-side. Falls back to mock data if the proxy is unavailable or unconfigured.

export class ParkingAnalysisService {
  static async analyzeImage(imageData, selectedSide = null) {
    const optimizedImage = await this.optimizeImage(imageData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: optimizedImage, selectedSide }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error('Analysis timed out — please try again');
      // Network error (e.g. running npm start without vercel dev) — use mock.
      return await this.getMockResponse();
    }
    clearTimeout(timeoutId);

    // API key not configured server-side → fall back to mock.
    if (response.status === 503) {
      return await this.getMockResponse();
    }

    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      const wait = errorData.retryAfter ? ` Try again in ${errorData.retryAfter}s.` : '';
      throw new Error(`Too many requests — please wait a moment before trying again.${wait}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.detail
        ? `${errorData.error}: ${errorData.detail}`
        : errorData.error || `Analysis failed (${response.status})`;
      throw new Error(msg);
    }

    return await response.json();
  }

  // Resize and compress the image before sending to reduce upload size.
  static async optimizeImage(imageData, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.src = imageData;
    });
  }

  static async getMockResponse() {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date();
    const hour = now.getHours();
    const day = now.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'Australia/Sydney' });

    const isWeekday = !['Saturday', 'Sunday'].includes(day);
    const isDuringRestrictionHours = hour >= 9 && hour <= 18;

    return {
      canPark: !(isWeekday && isDuringRestrictionHours),
      timeLimit: isWeekday ? '2 hours' : null,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hours: '9:00 AM - 6:00 PM',
      paymentRequired: isWeekday && isDuringRestrictionHours,
      vehicleTypes: ['Passenger vehicles'],
      specialConditions: [],
      confidence: 0.85,
      rawText: '2P 9AM-6PM MON-FRI COUNCIL AREA',
      applicableSide: 'both',
      estimatedFine: (isWeekday && isDuringRestrictionHours) ? null : '~$133',
      timestamp: new Date().toISOString(),
      model: 'mock',
      isMockData: true,
    };
  }
}

export const validateParkingResult = (result) => {
  const required = ['canPark', 'confidence', 'rawText'];
  return required.every(field => field in result);
};
