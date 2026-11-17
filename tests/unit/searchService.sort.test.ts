import { describe, expect, it } from 'vitest';
import { createSearchService } from '../../src/server/services/searchService.js';
import type { Geocoding, GeocodingResult } from '../../src/server/providers/openMeteoGeocoding.js';
import type { Nominatim } from '../../src/server/providers/nominatim.js';
import { fixture } from '../contract/helpers.js';

const call = { provider: 'open-meteo-geocoding' as const, status: 200, ms: 1 };
const nominatim: Nominatim = {
  search: () => Promise.reject(new Error('not used')),
  reverse: () => Promise.reject(new Error('not used')),
};
const springfield = (fixture('geocoding-springfield.json') as { results: GeocodingResult[] })
  .results;

function serviceWith(results: GeocodingResult[]) {
  const geocoding: Geocoding = { search: () => Promise.resolve({ results, call }) };
  return createSearchService({ geocoding, nominatim });
}

const collator = new Intl.Collator('en', { sensitivity: 'base' });

describe('searchService – alphabetical disambiguation (FR-004)', () => {
  it('returns the first 5 by region, then country', async () => {
    const { result } = await serviceWith(springfield).search('Springfield');
    expect(result.matches.map((m) => m.region)).toEqual([
      'Colorado',
      'Georgia',
      'Illinois',
      'Massachusetts',
      'Missouri',
    ]);
    // 15 populated places, minus 1 duplicate (Springfield, Ohio, US).
    expect(result.totalMatches).toBe(14);
    expect(result.refineSuggested).toBe(true);
  });

  it('sorts null regions last and ties by country', async () => {
    const mk = (
      id: number,
      admin1: string | undefined,
      cc: string,
      country: string,
    ): GeocodingResult => ({
      id,
      name: 'X',
      latitude: id,
      longitude: id,
      feature_code: 'PPL',
      country_code: cc,
      country,
      timezone: 'UTC',
      ...(admin1 ? { admin1 } : {}),
    });
    const { result } = await serviceWith([
      mk(1, undefined, 'BZ', 'Belize'),
      mk(2, 'georgia', 'US', 'United States'),
      mk(3, 'Georgia', 'GE', 'Georgia'),
      mk(4, 'Ávila', 'ES', 'Spain'),
    ]).search('X');
    expect(result.matches.map((m) => `${m.region ?? 'null'}/${m.countryCode ?? ''}`)).toEqual([
      'Ávila/ES',
      'Georgia/GE',
      'georgia/US',
      'null/BZ',
    ]);
  });

  it('is deterministic regardless of provider order', async () => {
    const reversed = [...springfield].reverse();
    const a = await serviceWith(springfield).search('Springfield');
    const b = await serviceWith(reversed).search('Springfield');
    expect(b.result.matches.map((m) => m.displayName)).toEqual(
      a.result.matches.map((m) => m.displayName),
    );
    const regions = a.result.matches.map((m) => m.region ?? '');
    for (let i = 1; i < regions.length; i++) {
      expect(collator.compare(regions[i - 1] ?? '', regions[i] ?? '')).toBeLessThanOrEqual(0);
    }
  });
});
