import { NotificationService } from './notificationService';
import { TIMER_CONFIG } from '../utils/constants';

beforeEach(() => {
  jest.useFakeTimers();
  NotificationService.cancelScheduled();
});

afterEach(() => {
  jest.useRealTimers();
  delete global.Notification;
});

// ─── requestPermission ───────────────────────────────────────────────────────

describe('requestPermission', () => {
  test('returns "denied" when Notification API is not available', async () => {
    delete global.Notification;
    await expect(NotificationService.requestPermission()).resolves.toBe('denied');
  });

  test('returns "granted" without prompting when already granted', async () => {
    global.Notification = { permission: 'granted', requestPermission: jest.fn() };
    const result = await NotificationService.requestPermission();
    expect(result).toBe('granted');
    expect(global.Notification.requestPermission).not.toHaveBeenCalled();
  });

  test('returns "denied" without prompting when already denied', async () => {
    global.Notification = { permission: 'denied', requestPermission: jest.fn() };
    const result = await NotificationService.requestPermission();
    expect(result).toBe('denied');
    expect(global.Notification.requestPermission).not.toHaveBeenCalled();
  });

  test('calls requestPermission when status is "default"', async () => {
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    const result = await NotificationService.requestPermission();
    expect(result).toBe('granted');
    expect(global.Notification.requestPermission).toHaveBeenCalled();
  });
});

// ─── scheduleWarning ─────────────────────────────────────────────────────────

describe('scheduleWarning', () => {
  test('fires at exactly (remainingMs - WARNING_THRESHOLD_MS), not before', () => {
    const sendWarning = jest.spyOn(NotificationService, 'sendWarning').mockImplementation(() => {});
    const msUntilWarning = 60000;
    const remainingMs = TIMER_CONFIG.WARNING_THRESHOLD_MS + msUntilWarning;

    NotificationService.scheduleWarning(remainingMs);

    // Should not fire one millisecond before the threshold.
    jest.advanceTimersByTime(msUntilWarning - 1);
    expect(sendWarning).not.toHaveBeenCalled();

    // Should fire exactly at the threshold.
    jest.advanceTimersByTime(1);
    expect(sendWarning).toHaveBeenCalledTimes(1);

    sendWarning.mockRestore();
  });

  test('fires immediately when already inside the warning window', () => {
    const sendWarning = jest.spyOn(NotificationService, 'sendWarning').mockImplementation(() => {});
    NotificationService.scheduleWarning(TIMER_CONFIG.WARNING_THRESHOLD_MS - 1);
    expect(sendWarning).toHaveBeenCalledTimes(1);
    sendWarning.mockRestore();
  });

  test('does not fire at all when remainingMs is 0', () => {
    const sendWarning = jest.spyOn(NotificationService, 'sendWarning').mockImplementation(() => {});
    NotificationService.scheduleWarning(0);
    jest.runAllTimers();
    expect(sendWarning).not.toHaveBeenCalled();
    sendWarning.mockRestore();
  });

  test('cancels the previous timeout before scheduling a new one', () => {
    const sendWarning = jest.spyOn(NotificationService, 'sendWarning').mockImplementation(() => {});
    // First schedule: fires after 60 000 ms.
    NotificationService.scheduleWarning(TIMER_CONFIG.WARNING_THRESHOLD_MS + 60000);
    // Reschedule with a longer window — the first timeout must be cancelled.
    NotificationService.scheduleWarning(TIMER_CONFIG.WARNING_THRESHOLD_MS + 120000);
    // The first timeout would have fired here if not cancelled.
    jest.advanceTimersByTime(60000);
    expect(sendWarning).not.toHaveBeenCalled();
    sendWarning.mockRestore();
  });
});

// ─── sendWarning ─────────────────────────────────────────────────────────────

describe('sendWarning', () => {
  test('does not create a Notification when permission is denied', () => {
    const constructorSpy = jest.fn();
    global.Notification = constructorSpy;
    global.Notification.permission = 'denied';
    NotificationService.sendWarning();
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  test('creates a Notification with the correct title and tag when permission is granted', () => {
    const constructorSpy = jest.fn();
    global.Notification = constructorSpy;
    global.Notification.permission = 'granted';
    NotificationService.sendWarning();
    expect(constructorSpy).toHaveBeenCalledWith(
      'ParkSense — Parking Expiring Soon',
      expect.objectContaining({ tag: 'parksense-warning' })
    );
  });
});

// ─── sendExpired ─────────────────────────────────────────────────────────────

describe('sendExpired', () => {
  test('does not create a Notification when permission is denied', () => {
    const constructorSpy = jest.fn();
    global.Notification = constructorSpy;
    global.Notification.permission = 'denied';
    NotificationService.sendExpired();
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  test('creates a Notification with the correct title and tag when permission is granted', () => {
    const constructorSpy = jest.fn();
    global.Notification = constructorSpy;
    global.Notification.permission = 'granted';
    NotificationService.sendExpired();
    expect(constructorSpy).toHaveBeenCalledWith(
      'ParkSense — Parking Time Expired',
      expect.objectContaining({ tag: 'parksense-expired' })
    );
  });
});

// ─── cancelScheduled ─────────────────────────────────────────────────────────

describe('cancelScheduled', () => {
  test('prevents a scheduled warning from firing', () => {
    const sendWarning = jest.spyOn(NotificationService, 'sendWarning').mockImplementation(() => {});
    NotificationService.scheduleWarning(TIMER_CONFIG.WARNING_THRESHOLD_MS + 5000);
    NotificationService.cancelScheduled();
    jest.runAllTimers();
    expect(sendWarning).not.toHaveBeenCalled();
    sendWarning.mockRestore();
  });

  test('is a no-op when nothing is scheduled', () => {
    expect(() => NotificationService.cancelScheduled()).not.toThrow();
  });
});
