import { describe, expect, it } from 'vitest';
import { formatCoordLabel } from '../../src/shared/coordinates.js';

describe('formatCoordLabel', () => {
  it.each([
    [36.5785, -118.2923, '36.58° N, 118.29° W'],
    [0, -140, '0.00° N, 140.00° W'],
    [-33.8688, 151.2093, '33.87° S, 151.21° E'],
    [51.4779, 0, '51.48° N, 0.00° E'],
  ])('(%f, %f) → %s', (lat, lon, expected) => {
    expect(formatCoordLabel(lat, lon)).toBe(expected);
  });
});
