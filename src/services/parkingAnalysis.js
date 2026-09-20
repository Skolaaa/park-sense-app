// src/services/parkingAnalysis.js
// Calls the /api/analyze serverless proxy, which holds the OpenAI API key
// server-side. Falls back to mock data if the proxy is unavailable or unconfigured.

import { Identity } from './identity';

// Belt-and-braces cap on the local image decode/resize step. This runs before
// the fetch AbortController is created, so the 45s request timeout cannot
// rescue a decode that never settles.
const IMAGE_LOAD_TIMEOUT_MS = 15000;

export class ParkingAnalysisService {
  static async analyzeImage(imageData, selectedSide = null) {
    const optimizedImage = await this.optimizeImage(imageData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...Identity.headers() },
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
      if (errorData.error === 'quota') {
        throw new Error(errorData.message || 'Daily scan limit reached. It resets at midnight Sydney time.');
      }
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
  //
  // Every exit path must settle the promise. Malformed or truncated image data
  // fires `onerror` (or, in rare cases, neither handler) — without these guards
  // the promise hangs forever and analyzeImage never returns, leaving the user
  // stuck on the ANALYZING view with no error and no timeout.
  static async optimizeImage(imageData, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      let settled = false;
      let timeoutId = null;

      const settleWith = (fn) => (value) => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
        fn(value);
      };

      const succeed = settleWith(resolve);
      const fail = settleWith(reject);

      timeoutId = setTimeout(
        () => fail(new Error('Could not process that photo — please retake it')),
        IMAGE_LOAD_TIMEOUT_MS
      );

      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          succeed(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          // Canvas can still throw here (zero-size image, tainted canvas).
          console.error('[ParkSense] Failed to resize captured image:', err);
          fail(new Error('Could not process that photo — please retake it'));
        }
      };

      img.onerror = () => {
        console.error('[ParkSense] Failed to decode captured image');
        fail(new Error('Could not read that photo — please retake it'));
      };

      img.src = imageData;
    });
  }

  // Demo data in the same shape the proxy returns. A 2P weekday sign: inside
  // its hours you can park for two hours; outside them there is no limit.
  static async getMockResponse() {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date();
    const sydney = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', hour12: false })
      .formatToParts(now)
      .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
    const hour = Number(sydney.hour) % 24;
    const isWeekday = !['Sat', 'Sun'].includes(sydney.weekday);
    const inHours = isWeekday && hour >= 9 && hour < 18;

    const plate = {
      text: '2P 9AM-6PM MON-FRI', kind: 'time_limited', timeLimitMinutes: 120,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startMinutes: 540, endMinutes: 1080,
      publicHolidayClause: 'silent', schoolDaysOnly: false, arrow: 'both',
      paymentRequired: false, permitExcepted: false, vehicleTypes: [],
    };

    return {
      noSignFound: false,
      canPark: true,
      kind: inHours ? 'time_limited' : 'unrestricted',
      timeLimit: inHours ? '2 hours' : null,
      timeLimitMinutes: inHours ? 120 : null,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hours: '9:00 AM - 6:00 PM',
      paymentRequired: false,
      vehicleTypes: [],
      specialConditions: [],
      confidence: 0.85,
      rawText: '2P 9AM-6PM MON-FRI',
      applicableSide: 'both',
      estimatedFine: inHours ? '~$140' : null,
      fine: inHours ? { kind: 'time_limited', amount: 140, display: '~$140', label: 'Exceed time limit', confidence: 'high', stale: false } : null,
      plates: [plate],
      timeline: [],
      nextChange: null,
      mustLeaveByMs: inHours ? now.getTime() + 120 * 60_000 : null,
      calendar: { isPublicHoliday: false, holidayName: null, isSchoolDay: isWeekday, source: 'mock' },
      timestamp: now.toISOString(),
      model: 'mock',
      isMockData: true,
    };
  }
}

export const validateParkingResult = (result) => {
  const required = ['canPark', 'confidence', 'rawText'];
  return required.every(field => field in result);
};
