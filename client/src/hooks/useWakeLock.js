import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Screen Wake Lock API hook
 * Keeps the mobile screen active during gameplay so connection is not dropped.
 */
export function useWakeLock(autoEnable = true) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  const wakeLockRef = useRef(null);

  // Check support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      setIsSupported(true);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        setIsActive(true);
        return true;
      }

      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setIsActive(true);
      setError(null);

      lock.addEventListener('release', () => {
        setIsActive(false);
        wakeLockRef.current = null;
      });

      return true;
    } catch (err) {
      console.warn('[WakeLock] Não foi possível ativar Screen Wake Lock:', err.name, err.message);
      setError(err.message);
      setIsActive(false);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('[WakeLock] Erro ao liberar Wake Lock:', err);
      }
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Re-acquire lock when returning to app (e.g. after phone is unlocked or switching tabs)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && autoEnable) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial request if autoEnable
    if (autoEnable) {
      requestWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isSupported, autoEnable, requestWakeLock, releaseWakeLock]);

  return {
    isSupported,
    isActive,
    error,
    requestWakeLock,
    releaseWakeLock
  };
}
