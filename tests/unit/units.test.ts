import { describe, expect, it } from 'vitest';
import {
  defaultUnitsForLocale,
  formatHumidity,
  formatTemp,
  formatWind,
} from '../../src/shared/units.js';

describe('formatTemp', () => {
  it('formats metric with one decimal', () => {
    expect(formatTemp(22.44, 'metric')).toBe('22.4 °C');
  });
  it('converts the unrounded value to °F before rounding', () => {
    expect(formatTemp(22.44, 'imperial')).toBe('72.4 °F');
  });
  it('handles extreme negatives', () => {
    expect(formatTemp(-50, 'metric')).toBe('-50.0 °C');
  });
  it('returns null for null', () => {
    expect(formatTemp(null, 'metric')).toBeNull();
  });
});

describe('formatWind', () => {
  it('formats km/h with one decimal', () => {
    expect(formatWind(19.8, 'metric')).toBe('19.8 km/h');
  });
  it('converts to mph', () => {
    expect(formatWind(19.8, 'imperial')).toBe('12.3 mph');
  });
  it('returns null for null', () => {
    expect(formatWind(null, 'imperial')).toBeNull();
  });
});

describe('formatHumidity', () => {
  it('rounds to a whole percent', () => {
    expect(formatHumidity(58.4)).toBe('58%');
  });
  it('returns null for null', () => {
    expect(formatHumidity(null)).toBeNull();
  });
});

describe('defaultUnitsForLocale', () => {
  it.each([
    ['en-US', 'imperial'],
    ['es-US', 'imperial'],
    ['en-GB', 'metric'],
    ['en', 'metric'],
    ['fr-FR', 'metric'],
  ] as const)('%s → %s', (locale, expected) => {
    expect(defaultUnitsForLocale(locale)).toBe(expected);
  });
});
