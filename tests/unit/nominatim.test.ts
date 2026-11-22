import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockAgent } from 'undici';
import { createNominatim } from '../../src/server/providers/nominatim.js';
import { installMockAgent, restoreDispatcher } from '../contract/helpers.js';

const ORIGIN = 'http://nominatim.test';
let agent: MockAgent;

beforeEach(() => {
  agent = installMockAgent();
});
afterEach(async () => {
  vi.useRealTimers();
  await restoreDispatcher(agent);
});

describe('createNominatim', () => {
  it('search sends the required parameters and User-Agent', async () => {
    agent
      .get(ORIGIN)
      .intercept({
        path: (p) =>
          p.startsWith('/search?') &&
          p.includes('q=%E6%9D%B1%E4%BA%AC') &&
          p.includes('format=jsonv2') &&
          p.includes('addressdetails=1') &&
          p.includes('accept-language=en') &&
          p.includes('featureType=settlement') &&
          p.includes('limit=10'),
        headers: { 'user-agent': 'ua-test' },
      })
      .reply(200, [{ name: 'Tokyo' }]);
    const n = createNominatim({ baseUrl: ORIGIN, userAgent: 'ua-test', minIntervalMs: 0 });
    const res = await n.search('東京');
    expect(res.body).toEqual([{ name: 'Tokyo' }]);
    expect(res.call).toMatchObject({ provider: 'nominatim', status: 200 });
  });

  it('reverse sends the required parameters', async () => {
    agent
      .get(ORIGIN)
      .intercept({
        path: (p) =>
          p.startsWith('/reverse?') &&
          p.includes('lat=34.05') &&
          p.includes('lon=-118.24') &&
          p.includes('format=jsonv2') &&
          p.includes('zoom=10') &&
          p.includes('accept-language=en'),
        headers: { 'user-agent': 'ua-test' },
      })
      .reply(200, { name: 'Los Angeles' });
    const n = createNominatim({ baseUrl: ORIGIN, userAgent: 'ua-test', minIntervalMs: 0 });
    const res = await n.reverse(34.05, -118.24);
    expect(res.body).toEqual({ name: 'Los Angeles' });
  });

  it('spaces call starts by at least minIntervalMs (global queue per instance)', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: /\/search/ })
      .reply(200, [])
      .times(2);
    const n = createNominatim({ baseUrl: ORIGIN, userAgent: 'ua', minIntervalMs: 200 });
    const starts: number[] = [];
    const t0 = performance.now();
    const track = (p: Promise<unknown>) => p.then(() => starts.push(performance.now() - t0));
    await Promise.all([track(n.search('a')), track(n.search('b'))]);
    starts.sort((a, b) => a - b);
    expect((starts[1] ?? 0) - (starts[0] ?? 0)).toBeGreaterThanOrEqual(190);
  });
});
