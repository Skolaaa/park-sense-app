// src/services/parkingAnalysis.js
// Real OpenAI GPT-4V integration for parking sign analysis

export class ParkingAnalysisService {
  static async analyzeImage(imageData) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add REACT_APP_OPENAI_API_KEY to your environment variables.');
    }

    try {
      // Optimize image size for faster upload
      const optimizedImage = await this.optimizeImage(imageData);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",  // Latest vision model
          messages: [
            {
              role: "system",
              content: `You are an expert at reading and interpreting parking signs. Analyze parking signs with extreme accuracy and provide structured information about parking rules.

Current time context: ${new Date().toLocaleString()}

Return your response as a valid JSON object with these exact fields:
- canPark: boolean (can someone park here RIGHT NOW based on current time)
- timeLimit: string or null (e.g., "2 hours", "30 minutes")
- days: array of active days (e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
- hours: string of active hours (e.g., "9:00 AM - 6:00 PM", "7:00 AM - 9:00 AM, 4:00 PM - 6:00 PM")
- paymentRequired: boolean
- vehicleTypes: array (e.g., ["Passenger vehicles", "Commercial vehicles"])
- specialConditions: array of any special rules (e.g., ["No parking during street cleaning", "Loading zone"])
- confidence: number between 0-1 (your confidence in this interpretation)
- rawText: string (the exact text you see on the sign)

Important: Base your "canPark" decision on the current time and day. Be precise about time interpretations.`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this parking sign and tell me if I can park here right now. Return only valid JSON with the required fields."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: optimizedImage,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1 // Low temperature for consistent, accurate results
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      let result;
      try {
        // Clean the response (remove any markdown formatting)
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        result = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Invalid response format from AI');
      }

      // Validate required fields
      const requiredFields = ['canPark', 'confidence', 'rawText'];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Ensure confidence is a number between 0 and 1
      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        result.confidence = 0.5; // Default if invalid
      }

      // Add metadata
      result.timestamp = new Date().toISOString();
      result.model = 'gpt-4o';
      
      return result;

    } catch (error) {
      console.error('Parking analysis error:', error);
      
      // Return fallback response on error
      if (error.message.includes('API key')) {
        throw error; // Re-throw API key errors
      }
      
      // For other errors, return a fallback
      return {
        canPark: null,
        timeLimit: null,
        days: [],
        hours: null,
        paymentRequired: null,
        vehicleTypes: [],
        specialConditions: ['Unable to analyze - please check sign manually'],
        confidence: 0,
        rawText: 'Error reading sign',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Optimize image for faster upload and better AI analysis
  static async optimizeImage(imageData, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimized format
        const optimizedData = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedData);
      };
      
      img.src = imageData;
    });
  }

  // Fallback to mock data if needed (for testing without API key)
  static async getMockResponse() {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    
    const now = new Date();
    const hour = now.getHours();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Smart mock based on current time
    const isWeekday = !['Saturday', 'Sunday'].includes(day);
    const isDuringBusinessHours = hour >= 9 && hour <= 18;
    
    return {
      canPark: !(isWeekday && isDuringBusinessHours),
      timeLimit: isWeekday ? "2 hours" : null,
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      hours: "9:00 AM - 6:00 PM",
      paymentRequired: isWeekday && isDuringBusinessHours,
      vehicleTypes: ["Passenger vehicles"],
      specialConditions: [],
      confidence: 0.85,
      rawText: "2 HR PARKING 9AM-6PM MON-FRI PAYMENT REQUIRED",
      timestamp: new Date().toISOString(),
      model: 'mock'
    };
  }
}

// Helper function to validate parking analysis result
export const validateParkingResult = (result) => {
  const required = ['canPark', 'confidence', 'rawText'];
  return required.every(field => field in result);
};