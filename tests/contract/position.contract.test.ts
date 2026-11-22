import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { MockAgent } from 'undici';
import {
  createTestApp,
  fixture,
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

describe('GET /api/position', () => {
  it('reverse-geocodes and logs exact coordinates', async () => {
    await setup();
    agent
      .get(NOMINATIM_ORIGIN)
      .intercept({
        path: (p) =>
          p.startsWith('/reverse?') &&
          p.includes('lat=34.0536923') &&
          p.includes('lon=-118.2427676'),
      })
      .reply(200, fixture('nominatim-reverse-la.json') as object);
    const res = await app.inject({ url: '/api/position?lat=34.0536923&lon=-118.2427676' });
    expect(res.statusCode).toBe(200);
    expect(validator('Location')(res.json())).toBe(true);
    expect(res.json()).toMatchObject({
      displayName: 'Los Angeles, California, US',
      isCoordinateLabel: false,
    });
    expect((await readLogLines(logDir))[0]).toMatchObject({
      requestType: 'position',
      query: null,
      latitude: 34.0536923,
      longitude: -118.2427676,
      outcome: 'success',
      upstream: [{ provider: 'nominatim', status: 200 }],
    });
  });

  it('returns a coordinate label at sea', async () => {
    await setup();
    agent
      .get(NOMINATIM_ORIGIN)
      .intercept({ path: /^\/reverse\?/ })
      .reply(200, fixture('nominatim-reverse-none.json') as object);
    const res = await app.inject({ url: '/api/position?lat=0&lon=-140' });
    expect(res.statusCode).toBe(200);
    expect(validator('Location')(res.json())).toBe(true);
    expect(res.json()).toMatchObject({
      isCoordinateLabel: true,
      displayName: '0.00° N, 140.00° W',
    });
  });

  it('still answers 200 with a coordinate label when Nominatim fails', async () => {
    await setup();
    agent
      .get(NOMINATIM_ORIGIN)
      .intercept({ path: /^\/reverse\?/ })
      .reply(503, {});
    const res = await app.inject({ url: '/api/position?lat=10&lon=20' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      isCoordinateLabel: true,
      displayName: '10.00° N, 20.00° E',
    });
  });

  it('rejects out-of-range latitude', async () => {
    await setup();
    const res = await app.inject({ url: '/api/position?lat=-91&lon=0' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'INVALID_INPUT' } });
  });
});
