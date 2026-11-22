import { describe, expect, it } from 'vitest';
import { formatWindDirection, toCompass16 } from '../../src/shared/compass.js';

describe('toCompass16', () => {
  it.each([
    [0, 'N'],
    [11.24, 'N'],
    [11.25, 'NNE'],
    [90, 'E'],
    [180, 'S'],
    [270, 'W'],
    [330, 'NNW'],
    [348.75, 'N'],
    [360, 'N'],
  ])('%f° → %s', (deg, expected) => {
    expect(toCompass16(deg)).toBe(expected);
  });
});

describe('formatWindDirection', () => {
  it('combines compass point and rounded degrees', () => {
    expect(formatWindDirection(329.6)).toBe('NNW 330°');
  });
  it('returns null for null', () => {
    expect(formatWindDirection(null)).toBeNull();
  });
});
