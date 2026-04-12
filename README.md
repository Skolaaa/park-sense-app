# ParkSense — Smart Parking Sign Analysis

AI-powered parking sign interpreter for Sydney. Take a photo of any parking sign and instantly know if you can park, for how long, and set a timer so you never overstay.

## Features

- **AI sign analysis** — GPT-4o reads the sign and tells you if you can park right now based on the current time
- **Directional sign support** — Choose which side of the sign you're on; the AI applies only the rules relevant to your direction (critical for Sydney signs with arrows)
- **Parking timer** — Start a countdown from your time limit with a full-screen view and persistent overlay
- **15-minute expiry alert** — Browser notification (or in-app fallback) before your time runs out
- **Location detection** — Automatically captures your street address when a result comes in
- **Estimated fine** — Shows the NSW fine amount if the current restriction were violated
- **Sydney-specific rules** — Understands No Stopping vs No Parking, clearways, loading zones, permit zones, and directional arrows
- **Demo mode** — Works without an API key using realistic mock data

## Getting Started

### Prerequisites

- Node.js 16+
- A modern browser with camera support
- An OpenAI API key (optional — the app works in demo mode without one)

### Installation

```bash
git clone <repo-url>
cd park-sense-app
npm install
```

### Configuration

Create a `.env` file in the project root:

```
REACT_APP_OPENAI_API_KEY=sk-your-key-here
```

Without this key, the app runs in **Demo Mode** with mock data.

### Running

```bash
npm start    # http://localhost:3000
```

## How It Works

1. **Take a photo** of a parking sign using your device camera
2. **Select your side** — left or right of the sign (or skip if the sign applies to both directions)
3. **Get your result** — the AI reads the sign and tells you if you can park right now
4. **Start a timer** — if parking is allowed and a time limit applies, start a countdown with a 15-minute alert

## Deployment

The app is configured for [Vercel](https://vercel.com). Set `REACT_APP_OPENAI_API_KEY` as an environment variable in your Vercel project settings.

```bash
npm run build    # Production build → build/
```

## Tech Stack

- React 18
- Tailwind CSS (CDN)
- OpenAI GPT-4o (vision)
- Web Notifications API
- Geolocation API + OpenStreetMap Nominatim (reverse geocoding)

## Notes

- The OpenAI API key is used client-side. This is fine for personal use but should be proxied through a backend for production deployments.
- Browser notifications may not fire reliably when the app tab is backgrounded on mobile — an in-app alert is shown as a fallback.
