import type { UnitSystem } from './types.js';

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function kmhToMph(kmh: number): number {
  return kmh / 1.609344;
}

export function formatTemp(celsius: number | null, units: UnitSystem): string | null {
  if (celsius === null) return null;
  return units === 'imperial' ? `${cToF(celsius).toFixed(1)} °F` : `${celsius.toFixed(1)} °C`;
}

export function formatWind(kmh: number | null, units: UnitSystem): string | null {
  if (kmh === null) return null;
  return units === 'imperial' ? `${kmhToMph(kmh).toFixed(1)} mph` : `${kmh.toFixed(1)} km/h`;
}

export function formatHumidity(pct: number | null): string | null {
  if (pct === null) return null;
  return `${Math.round(pct)}%`;
}

/** Imperial when the locale's region subtag is US, otherwise metric (FR-009). */
export function defaultUnitsForLocale(locale: string): UnitSystem {
  try {
    return new Intl.Locale(locale).region === 'US' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}
