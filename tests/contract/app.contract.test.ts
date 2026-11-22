import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { MockAgent } from 'undici';
import { AppError } from '../../src/server/errors.js';
import { createTestApp, restoreDispatcher, validator } from './helpers.js';

let app: FastifyInstance;
let agent: MockAgent;

afterEach(async () => {
  await app.close();
  await restoreDispatcher(agent);
});

async function setup() {
  const t = await createTestApp();
  app = t.app;
  agent = t.mockAgent;
  app.get('/api/__throw/:code', (req) => {
    const { code } = req.params as { code: string };
    if (code === 'boom') throw new Error('secret stack detail');
    throw new AppError(code as 'INVALID_INPUT' | 'LOCATION_NOT_FOUND' | 'WEATHER_UNAVAILABLE');
  });
  await app.ready();
}

describe('error envelope', () => {
  it('unknown /api route returns JSON 404', async () => {
    await setup();
    const res = await app.inject({ method: 'GET', url: '/api/unknown' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it.each([
    ['WEATHER_UNAVAILABLE', 503],
    ['INVALID_INPUT', 400],
    ['LOCATION_NOT_FOUND', 404],
  ])('AppError(%s) → %i with exact envelope', async (code, status) => {
    await setup();
    const res = await app.inject({ method: 'GET', url: `/api/__throw/${code}` });
    expect(res.statusCode).toBe(status);
    expect(res.json()).toEqual({ error: { code } });
    expect(validator('Error')(res.json())).toBe(true);
  });

  it('unexpected errors become WEATHER_UNAVAILABLE without leaking details', async () => {
    await setup();
    const res = await app.inject({ method: 'GET', url: '/api/__throw/boom' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: { code: 'WEATHER_UNAVAILABLE' } });
    expect(res.body).not.toContain('secret');
  });
});
