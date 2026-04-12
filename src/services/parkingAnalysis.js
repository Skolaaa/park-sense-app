// src/services/parkingAnalysis.js
// Calls the /api/analyze serverless proxy, which holds the OpenAI API key
// server-side. Falls back to mock data if the proxy is unavailable or unconfigured.

export class ParkingAnalysisService {
  static async analyzeImage(imageData, selectedSide = null) {
    const optimizedImage = await this.optimizeImage(imageData);

    let response;
    try {
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: optimizedImage, selectedSide }),
      });
    } catch {
      // Network error (e.g. running npm start without vercel dev) — use mock.
      const mock = await this.getMockResponse();
      return mock;
    }

    // API key not configured server-side → fall back to mock.
    if (response.status === 503) {
      const mock = await this.getMockResponse();
      return mock;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Analysis failed (${response.status})`);
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
