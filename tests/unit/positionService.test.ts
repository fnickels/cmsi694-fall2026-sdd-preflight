import { describe, expect, it, vi } from 'vitest';
import { createPositionService } from '../../src/server/services/positionService.js';
import type { Nominatim } from '../../src/server/providers/nominatim.js';
import { UpstreamError } from '../../src/server/providers/http.js';
import { fixture } from '../contract/helpers.js';

const call = { provider: 'nominatim' as const, status: 200, ms: 4 };

function nominatimReverse(impl: () => Promise<{ body: unknown; call: typeof call }>): Nominatim {
  return { search: vi.fn(), reverse: vi.fn(impl) };
}

const coordinateLabel = {
  name: '0.00° N, 140.00° W',
  displayName: '0.00° N, 140.00° W',
  region: null,
  country: null,
  countryCode: null,
  timeZone: null,
  latitude: 0,
  longitude: -140,
  isCoordinateLabel: true,
  source: 'position',
};

describe('positionService', () => {
  it('maps a city result to a Location, preserving exact input coordinates', async () => {
    const nominatim = nominatimReverse(() =>
      Promise.resolve({ body: fixture('nominatim-reverse-la.json'), call }),
    );
    const { location, calls } = await createPositionService({ nominatim }).describe(
      34.0536923,
      -118.2427676,
    );
    expect(nominatim.reverse).toHaveBeenCalledWith(34.0536923, -118.2427676, undefined);
    expect(location).toEqual({
      name: 'Los Angeles',
      region: 'California',
      country: 'United States',
      countryCode: 'US',
      latitude: 34.0536923,
      longitude: -118.2427676,
      timeZone: null,
      displayName: 'Los Angeles, California, US',
      source: 'position',
      isCoordinateLabel: false,
    });
    expect(calls).toEqual([call]);
  });

  it('falls back to a coordinate label when no place is found', async () => {
    const nominatim = nominatimReverse(() =>
      Promise.resolve({ body: fixture('nominatim-reverse-none.json'), call }),
    );
    const { location } = await createPositionService({ nominatim }).describe(0, -140);
    expect(location).toEqual(coordinateLabel);
  });

  it.each(['timeout', 'http'] as const)(
    'falls back to a coordinate label on upstream %s',
    async (kind) => {
      const failed = {
        provider: 'nominatim' as const,
        status: kind === 'http' ? 503 : null,
        ms: 4000,
      };
      const nominatim = nominatimReverse(() => Promise.reject(new UpstreamError(kind, failed)));
      const { location, calls } = await createPositionService({ nominatim }).describe(0, -140);
      expect(location).toEqual(coordinateLabel);
      expect(calls).toEqual([failed]);
    },
  );

  it('uses town or village when there is no city', async () => {
    const body = {
      name: 'Lone Pine',
      addresstype: 'village',
      address: {
        village: 'Lone Pine',
        state: 'California',
        country: 'United States',
        country_code: 'us',
      },
    };
    const nominatim = nominatimReverse(() => Promise.resolve({ body, call }));
    const { location } = await createPositionService({ nominatim }).describe(36.6, -118.06);
    expect(location.displayName).toBe('Lone Pine, California, US');
  });
});
