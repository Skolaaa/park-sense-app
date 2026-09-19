import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CameraCapture from '../components/CameraCapture';

function mockGetUserMedia(impl) {
  const getUserMedia = jest.fn(impl);
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia }, writable: true, configurable: true,
  });
  return getUserMedia;
}

describe('CameraCapture', () => {
  it('acquires the camera once across parent re-renders', async () => {
    const stop = jest.fn();
    const getUserMedia = mockGetUserMedia(() =>
      Promise.resolve({ getTracks: () => [{ stop }] })
    );

    // The parent passes a fresh onCancel closure on every render (it re-renders
    // once a second while a parking timer runs). That must not restart the camera.
    const { rerender } = render(
      <CameraCapture onCapture={() => {}} onCancel={() => {}} isActive={true} />
    );
    for (let i = 0; i < 3; i++) {
      rerender(<CameraCapture onCapture={() => {}} onCancel={() => {}} isActive={true} />);
    }

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });

  it('shows a permission-specific message when access is denied', async () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    mockGetUserMedia(() => Promise.reject(err));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CameraCapture onCapture={() => {}} onCancel={() => {}} isActive={true} />);

    expect(await screen.findByText(/is switched off/i)).toBeInTheDocument();
    expect(screen.getByText(/set Camera to Allow/i)).toBeInTheDocument();
    console.error.mockRestore();
  });

  it('shows a generic message for non-permission failures', async () => {
    const err = new Error('no device');
    err.name = 'NotFoundError';
    mockGetUserMedia(() => Promise.reject(err));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CameraCapture onCapture={() => {}} onCancel={() => {}} isActive={true} />);

    expect(await screen.findByText(/not available/i)).toBeInTheDocument();
    expect(screen.getByText(/holding the camera/i)).toBeInTheDocument();
    console.error.mockRestore();
  });

  it('releases the camera track on unmount', async () => {
    const stop = jest.fn();
    mockGetUserMedia(() => Promise.resolve({ getTracks: () => [{ stop }] }));

    const { unmount } = render(
      <CameraCapture onCapture={() => {}} onCancel={() => {}} isActive={true} />
    );
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
    unmount();

    await waitFor(() => expect(stop).toHaveBeenCalled());
  });
});
