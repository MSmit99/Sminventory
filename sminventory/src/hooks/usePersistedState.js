import { useState, useEffect } from "react";

/**
 * Like useState, but persisted to localStorage under `key`.
 * Survives page refreshes; falls back to `defaultValue` the first
 * time (or if localStorage is unavailable / the stored value is
 * corrupt JSON).
 */
export function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (e.g. private browsing) — fail silently,
      // the setting just won't persist this session.
    }
  }, [key, value]);

  return [value, setValue];
}