import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsDisplay from '../components/ResultsDisplay';

const NOW = Date.parse('2026-10-05T10:00:00+11:00'); // Labour Day

const base = {
  noSignFound: false, canPark: true, kind: 'unrestricted', timeLimit: null, timeLimitMinutes: null,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], hours: '8:00 AM - 6:00 PM',
  paymentRequired: false, vehicleTypes: [], confidence: 0.92, rawText: '2P 8AM-6PM MON-FRI', applicableSide: 'both',
  estimatedFine: null, fine: null, location: null,
  calendar: { isPublicHoliday: true, holidayName: 'Labour Day', isSchoolDay: false },
  specialConditions: ['Today is a public holiday (Labour Day). A sign that lists particular days does not apply on a public holiday unless it says so — NSW Road Rules 2014 reg 318.'],
  timeline: [{ startMs: NOW, endMs: NOW + 12 * 3600_000, canPark: true, kind: 'unrestricted', timeLimitMinutes: null }],
  nextChange: null, mustLeaveByMs: null,
};

const noop = () => {};
const renderResult = (over = {}, props = {}) =>
  render(
    <ResultsDisplay
      analysisResult={{ ...base, ...over }}
      onAnalyzeAnother={noop}
      onStartTimer={noop}
      onStopTimer={noop}
      onViewTimer={noop}
      onReportWrongReading={props.onReportWrongReading}
      communityEnabled={false}
      timerRunning={false}
      timerFormattedTime="0:00:00"
      timerWarningPhase={false}
    />
  );

test('a public holiday is the headline callout, citing reg 318', () => {
  renderResult();
  expect(screen.getByText(/Public holiday — Labour Day/)).toBeInTheDocument();
  expect(screen.getByText(/reg 318/)).toBeInTheDocument();
  expect(screen.getByText('You can park here')).toBeInTheDocument();
});

test('the disclaimer is always present on a verdict', () => {
  renderResult();
  expect(screen.getByText(/Check it yourself before you walk away/)).toBeInTheDocument();
});

test('shows leave-by time and the twelve-hour strip when there is a change coming', () => {
  const leaveBy = NOW + 2 * 3600_000;
  renderResult({
    kind: 'time_limited', timeLimit: '2 hours', timeLimitMinutes: 120, estimatedFine: '~$140',
    fine: { display: '~$140', stale: false }, calendar: { isPublicHoliday: false }, specialConditions: [],
    mustLeaveByMs: leaveBy,
    nextChange: { atMs: NOW + 4 * 3600_000, canPark: false, kind: 'no_stopping' },
    timeline: [
      { startMs: NOW, endMs: NOW + 4 * 3600_000, canPark: true, kind: 'time_limited', timeLimitMinutes: 120 },
      { startMs: NOW + 4 * 3600_000, endMs: NOW + 6 * 3600_000, canPark: false, kind: 'no_stopping', timeLimitMinutes: null },
      { startMs: NOW + 6 * 3600_000, endMs: NOW + 12 * 3600_000, canPark: true, kind: 'unrestricted', timeLimitMinutes: null },
    ],
  });
  expect(screen.getByText('Leave by')).toBeInTheDocument();
  expect(screen.getByText('Fine if you overstay')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /next twelve hours/i })).toBeInTheDocument();
  expect(screen.getByText('Start 2 hours timer')).toBeInTheDocument();
});

test('a prohibited verdict names the restriction and shows when it opens', () => {
  renderResult({
    canPark: false, kind: 'no_stopping', estimatedFine: '~$330', fine: { display: '~$330', stale: false },
    calendar: { isPublicHoliday: false }, specialConditions: [],
    nextChange: { atMs: NOW + 3600_000, canPark: true, kind: 'unrestricted' },
    timeline: [
      { startMs: NOW, endMs: NOW + 3600_000, canPark: false, kind: 'no_stopping', timeLimitMinutes: null },
      { startMs: NOW + 3600_000, endMs: NOW + 12 * 3600_000, canPark: true, kind: 'unrestricted', timeLimitMinutes: null },
    ],
  });
  expect(screen.getByText('No parking right now')).toBeInTheDocument();
  expect(screen.getByText(/No Stopping is in force/)).toBeInTheDocument();
  expect(screen.getByText('Parking opens')).toBeInTheDocument();
  expect(screen.getByText('~$330')).toBeInTheDocument();
});

test('an ambiguous side is flagged', () => {
  renderResult({ sideAmbiguous: true });
  expect(screen.getByText('Which side are you on?')).toBeInTheDocument();
});

test('the wrong-reading report sends the result and the text', () => {
  const onReportWrongReading = jest.fn();
  renderResult({}, { onReportWrongReading });
  fireEvent.click(screen.getByText('Report a wrong reading'));
  fireEvent.change(screen.getByLabelText(/What did the sign actually say/), { target: { value: 'It is 1P' } });
  fireEvent.click(screen.getByText('Send report'));
  expect(onReportWrongReading).toHaveBeenCalledWith(expect.objectContaining({ rawText: '2P 8AM-6PM MON-FRI' }), 'It is 1P');
  expect(screen.getByText(/Thanks/)).toBeInTheDocument();
});

test('the low-confidence screen still offers the report path', () => {
  renderResult({ confidence: 0.4 }, { onReportWrongReading: jest.fn() });
  expect(screen.getByText('Check this one yourself')).toBeInTheDocument();
  expect(screen.getByText('Report a wrong reading')).toBeInTheDocument();
});
