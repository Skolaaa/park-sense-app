// Parses a human-readable time limit string into milliseconds.
// Examples: "2 hours" → 7200000, "30 minutes" → 1800000,
//           "1 hour 30 minutes" → 5400000, "90 min" → 5400000
// Returns null if the string cannot be parsed.

export function parseTimeLimit(timeLimit) {
  if (!timeLimit || typeof timeLimit !== 'string') return null;

  const lower = timeLimit.toLowerCase();

  const hourMatch = lower.match(/(\d+)\s*hour/);
  const minMatch = lower.match(/(\d+)\s*min/);

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;

  const totalMs = (hours * 60 + minutes) * 60 * 1000;
  return totalMs > 0 ? totalMs : null;
}
