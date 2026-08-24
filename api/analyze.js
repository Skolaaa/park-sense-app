// Vercel serverless function — proxies requests to OpenAI so the API key
// never leaves the server and is not visible in the browser.

// In-memory rate limiter — persists across warm invocations of the same instance.
const rateLimitStore = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }
  entry.count++;
  return { allowed: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'rate_limit', retryAfter: rl.retryAfter });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'no_key' });
  }

  const { imageData, selectedSide } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: 'imageData is required' });
  }

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
- noSignFound: boolean — set to TRUE if no parking sign is visible or legible in the image (e.g. blank wall, road, sky, unrelated object). When true, all other fields should be null/false/empty.
- canPark: boolean (can someone park here RIGHT NOW based on current Sydney time)
- timeLimit: string or null (e.g., "2 hours", "30 minutes")
- days: array of active restriction days (e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
- hours: string of active restriction hours (e.g., "9:00 AM - 6:00 PM")
- paymentRequired: boolean
- vehicleTypes: array (e.g., ["Passenger vehicles"])
- specialConditions: array of any special rules
- confidence: number between 0-1 (set to 0 when noSignFound is true)
- rawText: string (exact text visible on the sign; empty string if noSignFound is true)
- applicableSide: "left" | "right" | "both" | null
- estimatedFine: string or null

Important: Base canPark on the current Sydney time and day. Be precise about directional arrow interpretation.`;

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                image_url: { url: imageData, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      }),
    });

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json();
      return res.status(502).json({ error: errorData.error?.message || 'OpenAI request failed' });
    }

    const data = await openAiResponse.json();
    const content = data.choices[0].message.content;

    let result;
    try {
      // Strip markdown code fences if present, then try direct parse.
      let clean = content.replace(/```json\n?|\n?```/g, '').trim();
      try {
        result = JSON.parse(clean);
      } catch {
        // Fallback: extract the first {...} block in case the model added
        // explanatory text before or after the JSON.
        const match = clean.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('no_json_block');
        result = JSON.parse(match[0]);
      }
    } catch {
      console.error('[ParkSense] Failed to parse OpenAI response:', content);
      return res.status(502).json({ error: 'parse_error', detail: content.slice(0, 200) });
    }

    // Validate required fields
    const required = ['canPark', 'confidence', 'rawText'];
    for (const field of required) {
      if (!(field in result)) {
        return res.status(502).json({ error: `Missing field: ${field}` });
      }
    }

    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }

    result.timestamp = new Date().toISOString();
    result.model = 'gpt-4o';

    return res.status(200).json(result);

  } catch (err) {
    return res.status(502).json({ error: err.message || 'Unexpected error' });
  }
}
