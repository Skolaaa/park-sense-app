// NSW parking penalty amounts, keyed by the plate kind the verdict engine
// produces. Amounts are indexed every 1 July, so this file carries the date
// it was last checked and the source it was checked against. When
// `REVIEW_BY` has passed the API still answers, but marks the figure as
// possibly stale so the UI can say so instead of quoting an old number.
//
// Source: Transport for NSW parking offence schedule,
// https://www.nsw.gov.au/sites/default/files/2021-09/demerits-parking.pdf
// (marked "as at 1 Jul 2025"). Secondary sources disagree on some lines,
// which is why each entry carries its own confidence.

export const FINES_AS_AT = '2025-07-01';
export const FINES_REVIEW_BY = '2026-07-01';
export const FINES_SOURCE = 'https://www.nsw.gov.au/sites/default/files/2021-09/demerits-parking.pdf';

// `confidence`: 'high' where two independent sources agreed; 'low' where the
// secondary sources contradicted each other and the primary could not be
// opened at the time of writing. Verify the low ones before a public launch.
export const FINE_SCHEDULE = {
  no_stopping:   { amount: 330, label: 'No Stopping',          confidence: 'high' },
  clearway:      { amount: 330, label: 'Clearway',             confidence: 'low' },
  bus_zone:      { amount: 330, label: 'Bus zone',             confidence: 'low' },
  no_parking:    { amount: 140, label: 'No Parking',           confidence: 'high' },
  loading_zone:  { amount: 235, label: 'Loading zone',         confidence: 'high' },
  taxi_zone:     { amount: 235, label: 'Taxi zone',            confidence: 'low' },
  works_zone:    { amount: 235, label: 'Works zone',           confidence: 'low' },
  disabled_only: { amount: 704, label: 'Disability parking',   confidence: 'high' },
  permit_only:   { amount: 140, label: 'Permit holders only',  confidence: 'low' },
  time_limited:  { amount: 140, label: 'Exceed time limit',    confidence: 'high' },
  meter:         { amount: 140, label: 'Expired meter',        confidence: 'high' },
};

export function fineFor(kind, today = new Date()) {
  const entry = FINE_SCHEDULE[kind];
  if (!entry) return null;
  const stale = today.toISOString().slice(0, 10) > FINES_REVIEW_BY;
  return {
    kind,
    amount: entry.amount,
    display: `~$${entry.amount}`,
    label: entry.label,
    confidence: entry.confidence,
    asAt: FINES_AS_AT,
    stale,
    source: FINES_SOURCE,
  };
}

// The block the model sees. Kept short: the model is asked to classify plates,
// not to know fine amounts, so this is context only.
export function finesPromptBlock() {
  return Object.values(FINE_SCHEDULE)
    .map((f) => `- ${f.label}: ~$${f.amount}`)
    .join('\n');
}
