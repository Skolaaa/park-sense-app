// Mock LLM analysis service
// In production, this will call OpenAI GPT-4V API

export class ParkingAnalysisService {
  static async analyzeImage(imageData) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock responses for testing
    const mockResults = [
      {
        canPark: true,
        timeLimit: "2 hours",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        hours: "9:00 AM - 6:00 PM",
        paymentRequired: true,
        vehicleTypes: ["Passenger vehicles"],
        specialConditions: [],
        confidence: 0.92,
        rawText: "2 HR PARKING 9AM-6PM MON-FRI PAYMENT REQUIRED"
      },
      {
        canPark: false,
        timeLimit: null,
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        hours: "7:00 AM - 9:00 AM, 4:00 PM - 6:00 PM",
        paymentRequired: false,
        vehicleTypes: [],
        specialConditions: ["No Parking - Tow Zone"],
        confidence: 0.88,
        rawText: "NO PARKING 7-9AM 4-6PM MON-FRI TOW ZONE"
      },
      {
        canPark: true,
        timeLimit: "30 minutes",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        hours: "8:00 AM - 8:00 PM",
        paymentRequired: true,
        vehicleTypes: ["Passenger vehicles"],
        specialConditions: ["Loading zone - 15 min max for commercial vehicles"],
        confidence: 0.95,
        rawText: "30 MIN PARKING 8AM-8PM MON-SAT LOADING ZONE"
      }
    ];
    
    return mockResults[Math.floor(Math.random() * mockResults.length)];
  }

  // Future: Real OpenAI integration
  static async analyzeWithOpenAI(imageData, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this parking sign image and extract parking rules. Return a JSON object with:
                - canPark: boolean (can park right now)
                - timeLimit: string or null
                - days: array of active days
                - hours: string of active hours
                - paymentRequired: boolean
                - vehicleTypes: array of allowed vehicle types
                - specialConditions: array of special rules
                - confidence: number 0-1
                - rawText: the text you see on the sign`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }
}