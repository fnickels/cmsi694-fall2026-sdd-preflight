import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { MockAgent } from 'undici';
import { createTestApp, fixture, GEO_ORIGIN, restoreDispatcher, validator } from './helpers.js';

let app: FastifyInstance;
let agent: MockAgent;

afterEach(async () => {
  await app.close();
  await restoreDispatcher(agent);
});

async function setup(name: string, file: string) {
  const t = await createTestApp();
  app = t.app;
  agent = t.mockAgent;
  agent
    .get(GEO_ORIGIN)
    .intercept({ path: (p) => new URL(p, GEO_ORIGIN).searchParams.get('name') === name })
    .reply(200, fixture(file) as object);
  await app.ready();
}

const collator = new Intl.Collator('en', { sensitivity: 'base' });

describe('GET /api/search – ambiguous names', () => {
  it('returns 5 alphabetical matches and suggests refining for "Springfield"', async () => {
    await setup('Springfield', 'geocoding-springfield.json');
    const res = await app.inject({ url: '/api/search?q=Springfield' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ matches: { region: string | null }[]; refineSuggested: boolean }>();
    expect(validator('SearchResult')(body)).toBe(true);
    expect(body.matches).toHaveLength(5);
    expect(body.refineSuggested).toBe(true);
    const regions = body.matches.map((m) => m.region ?? '');
    for (let i = 1; i < regions.length; i++) {
      expect(collator.compare(regions[i - 1] ?? '', regions[i] ?? '')).toBeLessThanOrEqual(0);
    }
  });

  it('resolves "Springfield, Illinois" to one match', async () => {
    await setup('Springfield, Illinois', 'geocoding-springfield-il.json');
    const res = await app.inject({ url: '/api/search?q=Springfield%2C%20Illinois' });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ matches: unknown[] }>().matches).toHaveLength(1);
  });
});
