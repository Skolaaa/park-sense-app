import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerService } from '../services/timerService';
import { NotificationService } from '../services/notificationService';
import { TIMER_CONFIG } from '../utils/constants';

function formatTime(ms) {
  if (ms <= 0) return '0:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback((endTime, total) => {
    stopInterval();
    endTimeRef.current = endTime;

    intervalRef.current = setInterval(() => {
      const remaining = endTimeRef.current - Date.now();
      if (remaining <= 0) {
        setRemainingMs(0);
        setIsRunning(false);
        stopInterval();
        TimerService.clear();
        NotificationService.sendExpired();
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);
  }, [stopInterval]);

  // Auto-resume from localStorage on mount.
  useEffect(() => {
    const session = TimerService.load();
    if (session) {
      const endTime = session.startTime + session.durationMs;
      setTotalMs(session.durationMs);
      setRemainingMs(session.remainingMs);
      setIsRunning(true);
      startInterval(endTime, session.durationMs);
      // Re-schedule notification in case the page was refreshed.
      NotificationService.scheduleWarning(session.remainingMs);
    }
    return stopInterval;
  }, [startInterval, stopInterval]);

  const startTimer = useCallback((durationMs) => {
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    TimerService.save({ startTime, durationMs });
    setTotalMs(durationMs);
    setRemainingMs(durationMs);
    setIsRunning(true);
    startInterval(endTime, durationMs);
  }, [startInterval]);

  const stopTimer = useCallback(() => {
    stopInterval();
    TimerService.clear();
    NotificationService.cancelScheduled();
    setIsRunning(false);
    setRemainingMs(0);
    setTotalMs(0);
  }, [stopInterval]);

  const percentRemaining = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
  const isWarningPhase = isRunning && remainingMs > 0 && remainingMs <= TIMER_CONFIG.WARNING_THRESHOLD_MS;
  const formattedTime = formatTime(remainingMs);

  return {
    isRunning,
    remainingMs,
    totalMs,
    formattedTime,
    percentRemaining,
    isWarningPhase,
    startTimer,
    stopTimer,
  };
}
