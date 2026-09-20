import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../app';

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: false }) });
});
afterEach(() => { delete global.fetch; });

test('home renders the call to action and the steps', () => {
  render(<App />);
  expect(screen.getByText('Can I park here?')).toBeInTheDocument();
  expect(screen.getByText('Scan a sign')).toBeInTheDocument();
  expect(screen.getByText('Photograph the parking sign')).toBeInTheDocument();
});

test('settings opens and returns', () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText('Settings'));
  expect(screen.getByText('Community data')).toBeInTheDocument();
  expect(screen.getByText('Parking reminders')).toBeInTheDocument();
  fireEvent.click(screen.getAllByText('Back')[0]);
  expect(screen.getByText('Can I park here?')).toBeInTheDocument();
});

test('privacy is reachable from the footer and from settings', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Privacy'));
  expect(screen.getByText('Community data (off unless you turn it on)')).toBeInTheDocument();
  fireEvent.click(screen.getAllByText('Back')[0]);
  fireEvent.click(screen.getByLabelText('Settings'));
  fireEvent.click(screen.getAllByText('Read')[1]);
  expect(screen.getByText('Terms of use')).toBeInTheDocument();
});

test('recent scans appear on the home screen and open the stored result', () => {
  localStorage.setItem('parksense_history', JSON.stringify([{
    id: 'x1', savedAt: Date.now(), thumbnail: null,
    result: { canPark: false, kind: 'no_stopping', timeLimit: null, rawText: 'NO STOPPING', confidence: 0.9, timestamp: new Date().toISOString(), specialConditions: [], timeline: [], location: { address: 'Crown St, Surry Hills' } },
  }]));
  render(<App />);
  expect(screen.getByText('Recent')).toBeInTheDocument();
  fireEvent.click(screen.getByText('No parking'));
  expect(screen.getByText('No parking right now')).toBeInTheDocument();
  expect(screen.getByText('An earlier result')).toBeInTheDocument();
  expect(screen.queryByText(/Start .* timer/)).not.toBeInTheDocument();
});

test('community toggle in settings persists', () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText('Settings'));
  fireEvent.click(screen.getByLabelText('Share anonymously'));
  expect(localStorage.getItem('parksense_community_consent')).toBe('granted');
});
