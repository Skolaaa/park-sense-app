// src/services/parkingAnalysis.js
// OpenAI GPT-4o vision integration for Sydney parking sign analysis

export class ParkingAnalysisService {
  static async analyzeImage(imageData, selectedSide = null) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add REACT_APP_OPENAI_API_KEY to your environment variables.');
    }

    try {
      const optimizedImage = await this.optimizeImage(imageData);

      const directionalContext = selectedSide
        ? `IMPORTANT DIRECTIONAL CONTEXT: The user is parked on the ${selectedSide.toUpperCase()} side of the sign. ` +
          `Sydney parking signs use arrows to indicate which rules apply to each direction — left-facing arrows ` +
          `govern vehicles to the left of the sign, right-facing arrows govern vehicles to the right. ` +
          `You MUST evaluate ONLY the rules that apply to the ${selectedSide.toUpperCase()} side. ` +
          `Ignore all rules that apply to the opposite direction.`
        : '';

      const systemPrompt = `You are an expert at reading and interpreting Australian parking signs, ` +
        `with deep knowledge of Sydney City Council and NSW Roads & Maritime Services rules.

Current time context: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}

${directionalContext}

Sydney-specific rules to apply:
- "No Stopping" means no stopping at all — canPark must be false, always.
- "No Parking" means a driver may stop for up to 2 minutes for passenger drop-off only — canPark is false for general parking.
- "P" signs (e.g., "1P", "2P", "P 1HR") indicate time-limited parking zones.
- Yellow "L" signs are Loading Zones — for goods vehicles only; passenger vehicles may stop 1-2 minutes maximum.
- Red Clearway signs override all other signs during their displayed hours — canPark is false during those hours.
- Permit zones (e.g., "Permit Holders Excepted 2P Mon-Fri"): a vehicle without a permit is subject to the base time limit.
- Single-headed arrows point toward the zone they govern. Double-headed arrows mean the sign applies in both directions.
- Street sweeping is typically indicated by "Council vehicles excepted" with a specific day and time.

NSW parking fines for context (use when setting estimatedFine):
- No Stopping violation: ~$344
- No Parking violation: ~$344
- Clearway violation: ~$344
- Loading zone violation: ~$344
- Time limit exceeded: ~$133
- Expired meter: ~$133

Return your response as a valid JSON object with these exact fields:
- canPark: boolean (can someone park here RIGHT NOW based on current Sydney time)
- timeLimit: string or null (e.g., "2 hours", "30 minutes")
- days: array of active restriction days (e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
- hours: string of active restriction hours (e.g., "9:00 AM - 6:00 PM")
- paymentRequired: boolean
- vehicleTypes: array (e.g., ["Passenger vehicles"])
- specialConditions: array of any special rules
- confidence: number between 0-1
- rawText: string (exact text visible on the sign)
- applicableSide: "left" | "right" | "both" | null ("both" if sign is non-directional; null if directionality cannot be determined)
- estimatedFine: string or null (e.g., "~$133", "~$344" — the fine if the current restriction were violated; null if canPark is true or fine is unclear)

Important: Base canPark on the current Sydney time and day. Be precise about directional arrow interpretation.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please analyse this parking sign and tell me if I can park here right now. Return only valid JSON with the required fields.',
                },
                {
                  type: 'image_url',
                  image_url: { url: optimizedImage, detail: 'high' },
                },
              ],
            },
          ],
          max_tokens: 600,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      let result;
      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        result = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Invalid response format from AI');
      }

      const requiredFields = ['canPark', 'confidence', 'rawText'];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        result.confidence = 0.5;
      }

      result.timestamp = new Date().toISOString();
      result.model = 'gpt-4o';

      return result;

    } catch (error) {
      console.error('Parking analysis error:', error);

      if (error.message.includes('API key')) {
        throw error;
      }

      return {
        canPark: null,
        timeLimit: null,
        days: [],
        hours: null,
        paymentRequired: null,
        vehicleTypes: [],
        specialConditions: ['Unable to analyse — please check sign manually'],
        confidence: 0,
        rawText: 'Error reading sign',
        applicableSide: null,
        estimatedFine: null,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

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
