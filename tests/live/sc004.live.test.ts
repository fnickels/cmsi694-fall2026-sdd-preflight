/**
 * SC-004 live accuracy check (opt-in: `LIVE=1 npm run test:live`). Compares the app's temperature
 * (real Open-Meteo, through the real services) with the nearest fresh US National Weather Service
 * observation. Not part of the CI gate: it depends on third-party uptime.
 */
import { describe, expect, it } from 'vitest';
import { fetch } from 'undici';
import { loadConfig } from '../../src/server/config.js';
import { createNominatim } from '../../src/server/providers/nominatim.js';
import { createForecast } from '../../src/server/providers/openMeteoForecast.js';
import { createGeocoding } from '../../src/server/providers/openMeteoGeocoding.js';
import { createSearchService } from '../../src/server/services/searchService.js';
import { createWeatherService } from '../../src/server/services/weatherService.js';

const CITIES = [
  'Los Angeles, California',
  'Chicago, Illinois',
  'Denver, Colorado',
  'Miami, Florida',
  'Seattle, Washington',
  'Phoenix, Arizona',
  'Dallas, Texas',
  'Atlanta, Georgia',
  'Boston, Massachusetts',
  'Minneapolis, Minnesota',
  'Salt Lake City, Utah',
  'Portland, Oregon',
  'Nashville, Tennessee',
  'Kansas City, Missouri',
  'Detroit, Michigan',
  'Philadelphia, Pennsylvania',
  'Charlotte, North Carolina',
  'Albuquerque, New Mexico',
  'Las Vegas, Nevada',
  'Boise, Idaho',
  'Omaha, Nebraska',
  'Pittsburgh, Pennsylvania',
  'Sacramento, California',
  'Indianapolis, Indiana',
  'Columbus, Ohio',
];
const MAX_AGE_MS = 90 * 60 * 1000;
const TOLERANCE_C = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const config = loadConfig();
const userAgent = config.nominatimUserAgent;

async function nws<T>(url: string): Promise<T | null> {
  await sleep(250);
  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent, accept: 'application/geo+json' },
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok ? ((await res.json()) as T) : null;
}

async function referenceTemperature(lat: number, lon: number): Promise<number | null> {
  const points = await nws<{ properties?: { observationStations?: string } }>(
    `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
  );
  const stationsUrl = points?.properties?.observationStations;
  if (!stationsUrl) return null;
  const stations = await nws<{ features?: { properties: { stationIdentifier: string } }[] }>(
    stationsUrl,
  );
  for (const f of (stations?.features ?? []).slice(0, 5)) {
    const obs = await nws<{
      properties?: { timestamp?: string; temperature?: { value: number | null } };
    }>(`https://api.weather.gov/stations/${f.properties.stationIdentifier}/observations/latest`);
    const value = obs?.properties?.temperature?.value;
    const ts = obs?.properties?.timestamp;
    if (typeof value === 'number' && ts && Date.now() - Date.parse(ts) <= MAX_AGE_MS) return value;
  }
  return null;
}

describe.skipIf(process.env['LIVE'] !== '1')('SC-004 live temperature accuracy', () => {
  it('is within 2 °C of NWS observations for at least 95% of ≥ 20 US cities', async () => {
    const search = createSearchService({
      geocoding: createGeocoding({ baseUrl: config.geocodingUrl }),
      nominatim: createNominatim({ baseUrl: config.nominatimUrl, userAgent, minIntervalMs: 1000 }),
    });
    const weather = createWeatherService({
      forecast: createForecast({ baseUrl: config.forecastUrl }),
    });

    const rows: { city: string; app: number; ref: number; diff: number }[] = [];
    for (const city of CITIES) {
      try {
        const { result } = await search.search(city);
        // Prefix matches ("Chicago Ridge") also come back, so pick the exact name as a user would.
        const cityName = city.split(',')[0]?.trim();
        const place = result.matches.find((m) => m.name === cityName);
        if (!place) {
          console.warn(`skipped ${city}: no exact-name match`);
          continue;
        }
        const { observation } = await weather.current(place.latitude, place.longitude);
        const ref = await referenceTemperature(place.latitude, place.longitude);
        if (observation.temperatureC === null || ref === null) continue;
        rows.push({
          city,
          app: observation.temperatureC,
          ref,
          diff: Math.abs(observation.temperatureC - ref),
        });
      } catch (e) {
        console.warn(`skipped ${city}: ${(e as Error).message}`);
      }
    }

    console.table(rows.map((r) => ({ ...r, ok: r.diff <= TOLERANCE_C })));
    expect(rows.length).toBeGreaterThanOrEqual(20);
    const withinTolerance = rows.filter((r) => r.diff <= TOLERANCE_C).length;
    expect(withinTolerance / rows.length).toBeGreaterThanOrEqual(0.95);
  });
});
