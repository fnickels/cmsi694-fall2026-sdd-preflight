import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getJson } from '../../src/client/api';
import { setOnline } from './setup';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e.code;
    throw e;
  }
  throw new Error('expected rejection');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('getJson', () => {
  it('resolves parsed JSON on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, { a: 1 }))),
    );
    await expect(getJson('/api/x')).resolves.toEqual({ a: 1 });
  });

  it.each(['LOCATION_NOT_FOUND', 'WEATHER_UNAVAILABLE'])('maps %s envelope', async (code) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(404, { error: { code } }))),
    );
    expect(await codeOf(getJson('/api/x'))).toBe(code);
  });

  it('maps unknown codes and statuses to WEATHER_UNAVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(500, { nope: 1 }))),
    );
    expect(await codeOf(getJson('/api/x'))).toBe('WEATHER_UNAVAILABLE');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(400, { error: { code: 'INVALID_INPUT' } }))),
    );
    expect(await codeOf(getJson('/api/x'))).toBe('WEATHER_UNAVAILABLE');
  });

  it('returns OFFLINE without calling fetch when navigator is offline', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setOnline(false);
    expect(await codeOf(getJson('/api/x'))).toBe('OFFLINE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a fetch TypeError to OFFLINE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    expect(await codeOf(getJson('/api/x'))).toBe('OFFLINE');
  });

  it('aborts after 10 seconds with WEATHER_UNAVAILABLE', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      ),
    );
    const p = codeOf(getJson('/api/x'));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await p).toBe('WEATHER_UNAVAILABLE');
  });
});
