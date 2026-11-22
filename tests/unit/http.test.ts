import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MockAgent } from 'undici';
import { fetchJson, UpstreamError } from '../../src/server/providers/http.js';
import { installMockAgent, restoreDispatcher } from '../contract/helpers.js';

const ORIGIN = 'http://upstream.test';
let agent: MockAgent;

beforeEach(() => {
  agent = installMockAgent();
});
afterEach(async () => {
  await restoreDispatcher(agent);
});

async function catchErr(p: Promise<unknown>): Promise<UpstreamError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof UpstreamError) return e;
    throw e;
  }
  throw new Error('expected rejection');
}

describe('fetchJson', () => {
  it('returns body and call metadata on 200', async () => {
    agent.get(ORIGIN).intercept({ path: '/ok' }).reply(200, { a: 1 });
    const res = await fetchJson(`${ORIGIN}/ok`, { provider: 'open-meteo-forecast' });
    expect(res.body).toEqual({ a: 1 });
    expect(res.call.provider).toBe('open-meteo-forecast');
    expect(res.call.status).toBe(200);
    expect(res.call.ms).toBeGreaterThanOrEqual(0);
  });

  it.each([500, 429])('throws kind http on %i', async (status) => {
    agent.get(ORIGIN).intercept({ path: '/bad' }).reply(status, { error: true });
    const err = await catchErr(fetchJson(`${ORIGIN}/bad`, { provider: 'nominatim' }));
    expect(err.kind).toBe('http');
    expect(err.call.status).toBe(status);
  });

  it('throws kind timeout when the reply is too slow', async () => {
    agent.get(ORIGIN).intercept({ path: '/slow' }).reply(200, {}).delay(500);
    const err = await catchErr(
      fetchJson(`${ORIGIN}/slow`, { provider: 'nominatim', timeoutMs: 50 }),
    );
    expect(err.kind).toBe('timeout');
    expect(err.call.status).toBeNull();
  });

  it('throws kind malformed on non-JSON body', async () => {
    agent.get(ORIGIN).intercept({ path: '/html' }).reply(200, '<html>');
    const err = await catchErr(fetchJson(`${ORIGIN}/html`, { provider: 'nominatim' }));
    expect(err.kind).toBe('malformed');
    expect(err.call.status).toBe(200);
  });

  it('throws kind network on connection error', async () => {
    agent.get(ORIGIN).intercept({ path: '/down' }).replyWithError(new Error('ECONNREFUSED'));
    const err = await catchErr(fetchJson(`${ORIGIN}/down`, { provider: 'nominatim' }));
    expect(err.kind).toBe('network');
    expect(err.call.status).toBeNull();
  });

  it('sends custom headers', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/h', headers: { 'user-agent': 'tester' } })
      .reply(200, {});
    await expect(
      fetchJson(`${ORIGIN}/h`, { provider: 'nominatim', headers: { 'User-Agent': 'tester' } }),
    ).resolves.toBeDefined();
  });
});

describe('fetchJson retry on connection failure', () => {
  it('retries once after a network error and reports both attempts', async () => {
    agent.get(ORIGIN).intercept({ path: '/flaky' }).replyWithError(new Error('ECONNRESET'));
    agent.get(ORIGIN).intercept({ path: '/flaky' }).reply(200, { ok: true });
    const res = await fetchJson(`${ORIGIN}/flaky`, { provider: 'open-meteo-geocoding' });
    expect(res.body).toEqual({ ok: true });
    expect(res.calls?.map((c) => c.status)).toEqual([null, 200]);
    expect(res.call).toBe(res.calls?.[1]);
  });

  it('gives up after the second network error', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/down2' })
      .replyWithError(new Error('ECONNREFUSED'))
      .times(2);
    const err = await catchErr(fetchJson(`${ORIGIN}/down2`, { provider: 'open-meteo-geocoding' }));
    expect(err.kind).toBe('network');
    expect(err.calls).toHaveLength(2);
  });

  it('does not retry timeouts or HTTP errors', async () => {
    agent.get(ORIGIN).intercept({ path: '/slow2' }).reply(200, {}).delay(500);
    const timeout = await catchErr(
      fetchJson(`${ORIGIN}/slow2`, { provider: 'nominatim', timeoutMs: 50 }),
    );
    expect(timeout.calls).toHaveLength(1);

    agent.get(ORIGIN).intercept({ path: '/503' }).reply(503, {});
    const http = await catchErr(fetchJson(`${ORIGIN}/503`, { provider: 'nominatim' }));
    expect(http.calls).toHaveLength(1);
  });

  it('does not retry once the caller has aborted', async () => {
    const controller = new AbortController();
    agent.get(ORIGIN).intercept({ path: '/abort' }).replyWithError(new Error('ECONNRESET'));
    controller.abort();
    const err = await catchErr(
      fetchJson(`${ORIGIN}/abort`, { provider: 'nominatim', signal: controller.signal }),
    );
    expect(err.calls).toHaveLength(1);
  });
});
