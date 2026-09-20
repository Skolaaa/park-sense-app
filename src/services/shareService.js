// "Share this sign": the verdict as a sentence, via the OS share sheet where
// there is one, or the clipboard where there is not. Returns 'shared',
// 'copied', or 'unavailable'.

export function shareText(result) {
  if (!result) return '';
  const where = result.location?.address ? ` at ${result.location.address.split(',').slice(0, 2).join(',')}` : '';
  const verdict = result.canPark
    ? `you can park${result.timeLimit ? ` for ${result.timeLimit}` : ''}`
    : 'no parking right now';
  const sign = result.rawText ? ` Sign: “${result.rawText}”.` : '';
  return `ParkSense says ${verdict}${where}.${sign} Read any Sydney parking sign: ${typeof window !== 'undefined' ? window.location.origin : ''}`;
}

export const ShareService = {
  async share(result) {
    const text = shareText(result);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ParkSense', text });
        return 'shared';
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return 'copied';
      }
    } catch (err) {
      if (err?.name === 'AbortError') return 'shared'; // user closed the sheet; not an error
    }
    return 'unavailable';
  },
};
