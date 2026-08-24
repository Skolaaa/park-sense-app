import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppErrorBoundary from '../components/AppErrorBoundary';

// The recovery heading is split across a <br /> for the display type. Matching
// on accessible name is unreliable there (the <br /> is not a word separator in
// name computation), so query the heading and normalise its text.
const recoveryHeading = () => {
  const h = screen.queryByRole('heading', { level: 1 });
  if (!h) return null;
  return h.textContent.replace(/\s+/g, ' ').trim() === 'Something went wrong' ? h : null;
};

// React (and jsdom) log every boundary-caught error; silence the noise so the
// suite output stays readable, while still asserting on the calls we care about.
let consoleErrorSpy;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Boom = () => {
  throw new Error('kaboom');
};

describe('AppErrorBoundary', () => {
  test('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>all good</p>
      </AppErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  test('renders the recovery screen instead of a blank page when a child throws', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );
    expect(recoveryHeading()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to start' })).toBeInTheDocument();
  });

  test('logs the error with the [ParkSense] prefix', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );
    const logged = consoleErrorSpy.mock.calls.some(
      ([first]) => typeof first === 'string' && first.startsWith('[ParkSense]')
    );
    expect(logged).toBe(true);
  });

  test('surfaces the error message for debugging', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  test('Reload triggers a full page reload', () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: jest.fn() };

    try {
      render(
        <AppErrorBoundary>
          <Boom />
        </AppErrorBoundary>
      );
      fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
      expect(window.location.reload).toHaveBeenCalled();
    } finally {
      window.location = originalLocation;
    }
  });

  test('Back to start remounts the app and recovers without a page reload', () => {
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error('kaboom');
      return <p>recovered</p>;
    };

    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>
    );
    expect(recoveryHeading()).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Back to start' }));

    expect(screen.getByText('recovered')).toBeInTheDocument();
    expect(recoveryHeading()).not.toBeInTheDocument();
  });
});
