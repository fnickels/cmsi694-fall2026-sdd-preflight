import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { MockAgent } from 'undici';
import {
  createTestApp,
  fixture,
  FORECAST_ORIGIN,
  readLogLines,
  restoreDispatcher,
  validator,
} from './helpers.js';

let app: FastifyInstance;
let agent: MockAgent;
let logDir: string;

afterEach(async () => {
  await app.close();
  await restoreDispatcher(agent);
});

async function setup() {
  const t = await createTestApp();
  ({ app, logDir } = t);
  agent = t.mockAgent;
  await app.ready();
}

const CURRENT =
  'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day';

function forecastIntercept() {
  return agent.get(FORECAST_ORIGIN).intercept({
    path: (p) => {
      const u = new URL(p, FORECAST_ORIGIN);
      return (
        u.pathname === '/v1/forecast' &&
        u.searchParams.get('latitude') === '34.05223' &&
        u.searchParams.get('longitude') === '-118.24368' &&
        u.searchParams.get('current') === CURRENT &&
        u.searchParams.get('timezone') === 'auto'
      );
    },
  });
}

describe('GET /api/weather', () => {
  it('returns a contract-valid observation and logs exact coordinates', async () => {
    await setup();
    forecastIntercept().reply(200, fixture('forecast-full.json') as object);
    const res = await app.inject({ url: '/api/weather?lat=34.05223&lon=-118.24368' });
    expect(res.statusCode).toBe(200);
    expect(validator('CurrentWeatherObservation')(res.json())).toBe(true);
    expect(res.json()).toMatchObject({
      temperatureC: 22.44,
      observedAt: '2026-11-17T15:45:00-08:00',
    });
    expect((await readLogLines(logDir))[0]).toMatchObject({
      requestType: 'weather',
      query: null,
      latitude: 34.05223,
      longitude: -118.24368,
      outcome: 'success',
      upstream: [{ provider: 'open-meteo-forecast', status: 200 }],
    });
  });

  it('returns nulls for missing measurements and stays contract-valid', async () => {
    await setup();
    forecastIntercept().reply(200, fixture('forecast-partial.json') as object);
    const res = await app.inject({ url: '/api/weather?lat=34.05223&lon=-118.24368' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ feelsLikeC: null, windDirectionDeg: null });
    expect(validator('CurrentWeatherObservation')(res.json())).toBe(true);
  });

  it.each(['lat=91&lon=0', 'lat=0&lon=181', 'lat=1&lon=abc', 'lat=1'])(
    'returns 400 for %s',
    async (qs) => {
      await setup();
      const res = await app.inject({ url: `/api/weather?${qs}` });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: { code: 'INVALID_INPUT' } });
    },
  );

  it(
    'returns 503 and logs upstream_timeout when the forecast is too slow',
    { timeout: 15_000 },
    async () => {
      await setup();
      forecastIntercept()
        .reply(200, fixture('forecast-full.json') as object)
        .delay(5000);
      const started = Date.now();
      const res = await app.inject({ url: '/api/weather?lat=34.05223&lon=-118.24368' });
      expect(Date.now() - started).toBeLessThan(8000);
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({ error: { code: 'WEATHER_UNAVAILABLE' } });
      expect((await readLogLines(logDir))[0]).toMatchObject({
        outcome: 'upstream_timeout',
        upstream: [{ provider: 'open-meteo-forecast', status: null }],
      });
    },
  );
});
