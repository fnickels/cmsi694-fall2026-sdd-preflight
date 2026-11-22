import { describe, expect, it, vi } from 'vitest';
import { createSearchService } from '../../src/server/services/searchService.js';
import type { Geocoding, GeocodingResult } from '../../src/server/providers/openMeteoGeocoding.js';
import type { Nominatim } from '../../src/server/providers/nominatim.js';
import { UpstreamError } from '../../src/server/providers/http.js';
import { AppError } from '../../src/server/errors.js';
import { fixture } from '../contract/helpers.js';

const geoCall = { provider: 'open-meteo-geocoding' as const, status: 200, ms: 5 };
const nomCall = { provider: 'nominatim' as const, status: 200, ms: 7 };

function geocodingReturning(file: string): Geocoding {
  const body = fixture(file) as { results?: GeocodingResult[] };
  return { search: vi.fn(() => Promise.resolve({ results: body.results ?? [], call: geoCall })) };
}

function nominatimReturning(body: unknown): Nominatim {
  return {
    search: vi.fn(() => Promise.resolve({ body, call: nomCall })),
    reverse: vi.fn(),
  };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
  throw new Error('expected rejection');
}

describe('searchService', () => {
  it('treats 5-digit input as a US ZIP', async () => {
    const geocoding = geocodingReturning('geocoding-zip-90210.json');
    const svc = createSearchService({ geocoding, nominatim: nominatimReturning([]) });
    const { result } = await svc.search('90210');
    expect(geocoding.search).toHaveBeenCalledWith(
      '90210',
      expect.objectContaining({ countryCode: 'US' }),
    );
    expect(result.queryType).toBe('zip');
    expect(result.matches[0]?.source).toBe('zip');
    expect(result.matches[0]?.displayName).toBe('Beverly Hills, California, US');
  });

  it('keeps only current populated places and builds the display name', async () => {
    const geocoding = geocodingReturning('geocoding-la-ca.json');
    const svc = createSearchService({ geocoding, nominatim: nominatimReturning([]) });
    const { result, calls } = await svc.search('  Los Angeles, California ');
    expect(geocoding.search).toHaveBeenCalledWith(
      'Los Angeles, California',
      expect.not.objectContaining({ countryCode: 'US' }),
    );
    expect(result).toMatchObject({
      query: 'Los Angeles, California',
      queryType: 'search',
      totalMatches: 1,
      refineSuggested: false,
    });
    expect(result.matches).toEqual([
      {
        name: 'Los Angeles',
        region: 'California',
        country: 'United States',
        countryCode: 'US',
        latitude: 34.05223,
        longitude: -118.24368,
        timeZone: 'America/Los_Angeles',
        displayName: 'Los Angeles, California, US',
        source: 'search',
        isCoordinateLabel: false,
      },
    ]);
    expect(calls).toEqual([geoCall]);
  });

  it('dedupes by name, region and country, caps at 5, and flags refine', async () => {
    const results: GeocodingResult[] = [];
    for (let i = 0; i < 8; i++) {
      const r = {
        id: i,
        name: 'Paris',
        latitude: i,
        longitude: i,
        feature_code: 'PPL',
        country_code: 'US',
        country: 'United States',
        admin1: `State ${i}`,
        timezone: 'UTC',
      };
      results.push(r);
    }
    const [first] = results;
    if (first) results.push({ ...first, id: 99, latitude: 50 });
    const geocoding: Geocoding = { search: () => Promise.resolve({ results, call: geoCall }) };
    const svc = createSearchService({ geocoding, nominatim: nominatimReturning([]) });
    const { result } = await svc.search('Paris');
    expect(result.totalMatches).toBe(8);
    expect(result.matches).toHaveLength(5);
    expect(result.refineSuggested).toBe(true);
    expect(result.matches[0]?.latitude).toBe(0);
  });

  it('skips the region in the display name when null or equal to the name', async () => {
    const results: GeocodingResult[] = [
      {
        id: 1,
        name: 'Singapore',
        latitude: 1.29,
        longitude: 103.85,
        feature_code: 'PPLC',
        country_code: 'SG',
        country: 'Singapore',
        admin1: 'Singapore',
        timezone: 'Asia/Singapore',
      },
    ];
    const svc = createSearchService({
      geocoding: { search: () => Promise.resolve({ results, call: geoCall }) },
      nominatim: nominatimReturning([]),
    });
    const { result } = await svc.search('Singapore');
    expect(result.matches[0]?.displayName).toBe('Singapore, SG');
  });

  it('falls back to Nominatim when Open-Meteo finds nothing', async () => {
    const nominatim = nominatimReturning(fixture('nominatim-search-tokyo.json'));
    const svc = createSearchService({
      geocoding: geocodingReturning('geocoding-empty.json'),
      nominatim,
    });
    const { result, calls } = await svc.search('東京');
    expect(nominatim.search).toHaveBeenCalledWith('東京', undefined);
    expect(result.matches[0]).toMatchObject({
      name: 'Tokyo',
      region: null,
      country: 'Japan',
      countryCode: 'JP',
      timeZone: null,
      latitude: 35.6812,
      longitude: 139.7671,
      displayName: 'Tokyo, JP',
    });
    expect(calls).toEqual([geoCall, nomCall]);
  });

  it('throws LOCATION_NOT_FOUND when both providers find nothing', async () => {
    const svc = createSearchService({
      geocoding: geocodingReturning('geocoding-empty.json'),
      nominatim: nominatimReturning([]),
    });
    expect(await codeOf(svc.search('Xyzzyqwerty'))).toBe('LOCATION_NOT_FOUND');
  });

  it('throws INVALID_INPUT for empty or too-long input', async () => {
    const svc = createSearchService({
      geocoding: geocodingReturning('geocoding-empty.json'),
      nominatim: nominatimReturning([]),
    });
    expect(await codeOf(svc.search('   '))).toBe('INVALID_INPUT');
    expect(await codeOf(svc.search('x'.repeat(101)))).toBe('INVALID_INPUT');
  });

  it('maps upstream failures to WEATHER_UNAVAILABLE and keeps the call', async () => {
    const failed = { provider: 'open-meteo-geocoding' as const, status: 503, ms: 3 };
    const geocoding: Geocoding = {
      search: () => Promise.reject(new UpstreamError('http', failed)),
    };
    const svc = createSearchService({ geocoding, nominatim: nominatimReturning([]) });
    const calls: unknown[] = [];
    let err: unknown;
    try {
      await svc.search('Paris', { calls: calls as never[] });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('WEATHER_UNAVAILABLE');
    expect((err as AppError).cause).toBeInstanceOf(UpstreamError);
    expect(calls).toEqual([failed]);
  });
});
