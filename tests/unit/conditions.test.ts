import { describe, expect, it } from 'vitest';
import { conditionFor } from '../../src/shared/conditions.js';

describe('conditionFor', () => {
  it.each([
    [0, 'clear', 'Clear sky'],
    [1, 'partly-cloudy', 'Mainly clear'],
    [2, 'partly-cloudy', 'Partly cloudy'],
    [3, 'cloudy', 'Overcast'],
  ] as const)('%i → %s "%s"', (code, category, description) => {
    expect(conditionFor(code)).toEqual({ category, description });
  });

  it.each([
    [[45, 48], 'fog'],
    [[51, 53, 55, 56, 57], 'drizzle'],
    [[61, 63, 65, 66, 67, 80, 81, 82], 'rain'],
    [[71, 73, 75, 77, 85, 86], 'snow'],
    [[95, 96, 99], 'thunderstorm'],
  ] as const)('%j → %s', (codes, category) => {
    for (const code of codes) {
      const c = conditionFor(code);
      expect(c?.category).toBe(category);
      expect(c?.description).toMatch(/\S/);
    }
  });

  it('returns null for unknown codes and null', () => {
    expect(conditionFor(42)).toBeNull();
    expect(conditionFor(null)).toBeNull();
  });
});
