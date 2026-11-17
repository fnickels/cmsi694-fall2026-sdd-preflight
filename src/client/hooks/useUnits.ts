import { useCallback, useState } from 'react';
import type { UnitSystem } from '../../shared/types';
import { defaultUnitsForLocale } from '../../shared/units';

const STORAGE_KEY = 'weather.units';

function readStored(): UnitSystem | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'metric' || v === 'imperial' ? v : null;
  } catch {
    return null;
  }
}

export interface UnitPreference {
  system: UnitSystem;
  /** False while inferred from the browser locale (FR-009). */
  explicit: boolean;
  setSystem: (system: UnitSystem) => void;
}

/** Stored only on this device and only once the user chooses (FR-008, data-model.md). */
export function useUnits(): UnitPreference {
  const [state, setState] = useState(() => {
    const stored = readStored();
    return stored
      ? { system: stored, explicit: true }
      : { system: defaultUnitsForLocale(navigator.language), explicit: false };
  });

  const setSystem = useCallback((system: UnitSystem) => {
    setState({ system, explicit: true });
    try {
      localStorage.setItem(STORAGE_KEY, system);
    } catch {
      // Storage can be unavailable (e.g. some private-browsing modes); the choice still applies now.
    }
  }, []);

  return { ...state, setSystem };
}
