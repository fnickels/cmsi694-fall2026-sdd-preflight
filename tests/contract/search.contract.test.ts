import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { MockAgent } from 'undici';
import {
  createTestApp,
  fixture,
  GEO_ORIGIN,
  NOMINATIM_ORIGIN,
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

function geocodingReply(name: string, status: number, body: unknown, zip = false) {
  agent
    .get(GEO_ORIGIN)
    .intercept({
      path: (p) => {
        const u = new URL(p, GEO_ORIGIN);
        return (
          u.pathname === '/v1/search' &&
          u.searchParams.get('name') === name &&
          u.searchParams.get('count') === '100' &&
          u.searchParams.get('language') === 'en' &&
          (u.searchParams.get('countryCode') === 'US') === zip
        );
      },
    })
    .reply(status, body as object);
}

describe('GET /api/search', () => {
  it('returns a single match for "Los Angeles, California" and logs it', async () => {
    await setup();
    geocodingReply('Los Angeles, California', 200, fixture('geocoding-la-ca.json'));
    const res = await app.inject({ url: '/api/search?q=Los%20Angeles%2C%20California' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ matches: unknown[] }>();
    expect(validator('SearchResult')(body)).toBe(true);
    expect(body.matches).toHaveLength(1);

    const logs = await readLogLines(logDir);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      requestType: 'search',
      query: 'Los Angeles, California',
      latitude: null,
      longitude: null,
      outcome: 'success',
      upstream: [{ provider: 'open-meteo-geocoding', status: 200 }],
    });
  });

  it('treats 90210 as a US ZIP', async () => {
    await setup();
    geocodingReply('90210', 200, fixture('geocoding-zip-90210.json'), true);
    const res = await app.inject({ url: '/api/search?q=90210' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ queryType: 'zip' });
    expect((await readLogLines(logDir))[0]).toMatchObject({
      requestType: 'zip',
      query: '90210',
      outcome: 'success',
    });
  });

  it('returns 404 LOCATION_NOT_FOUND when nothing matches', async () => {
    await setup();
    geocodingReply('Xyzzyqwerty', 200, fixture('geocoding-empty.json'));
    agent
      .get(NOMINATIM_ORIGIN)
      .intercept({ path: /^\/search\?/ })
      .reply(200, []);
    const res = await app.inject({ url: '/api/search?q=Xyzzyqwerty' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'LOCATION_NOT_FOUND' } });
    expect((await readLogLines(logDir))[0]).toMatchObject({
      outcome: 'not_found',
      upstream: [{ provider: 'open-meteo-geocoding' }, { provider: 'nominatim' }],
    });
  });

  it.each([
    ['', 'empty'],
    ['%20%20%20', 'whitespace'],
    ['a'.repeat(101), 'too long'],
  ])('returns 400 for %s (%s)', async (q) => {
    await setup();
    const res = await app.inject({ url: `/api/search?q=${q}` });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'INVALID_INPUT' } });
  });

  it.each([503, 429])('maps upstream HTTP %i to 503 WEATHER_UNAVAILABLE', async (status) => {
    await setup();
    geocodingReply('Paris', status, { error: true });
    const res = await app.inject({ url: '/api/search?q=Paris' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: { code: 'WEATHER_UNAVAILABLE' } });
    expect((await readLogLines(logDir))[0]).toMatchObject({
      outcome: 'upstream_error',
      upstream: [{ provider: 'open-meteo-geocoding', status }],
    });
  });
});
