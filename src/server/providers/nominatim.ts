import { fetchJson, type UpstreamResult } from './http.js';

export interface NominatimOptions {
  baseUrl: string;
  userAgent: string;
  minIntervalMs: number;
}

export interface Nominatim {
  search(q: string, signal?: AbortSignal): Promise<UpstreamResult>;
  reverse(lat: number, lon: number, signal?: AbortSignal): Promise<UpstreamResult>;
}

/**
 * Nominatim usage policy: identifying User-Agent and ≤ 1 request/second application-wide.
 * One instance per app enforces the global spacing between call starts.
 */
export function createNominatim({
  baseUrl,
  userAgent,
  minIntervalMs,
}: NominatimOptions): Nominatim {
  let nextSlot = 0;

  async function waitTurn(): Promise<void> {
    const now = Date.now();
    const start = Math.max(now, nextSlot);
    nextSlot = start + minIntervalMs;
    if (start > now) await new Promise((r) => setTimeout(r, start - now));
  }

  async function get(pathname: string, params: Record<string, string>, signal?: AbortSignal) {
    await waitTurn();
    const url = new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return fetchJson(url.toString(), {
      provider: 'nominatim',
      headers: { 'User-Agent': userAgent },
      ...(signal ? { signal } : {}),
    });
  }

  return {
    search: (q, signal) =>
      get(
        'search',
        {
          q,
          format: 'jsonv2',
          addressdetails: '1',
          'accept-language': 'en',
          featureType: 'settlement',
          limit: '10',
        },
        signal,
      ),
    reverse: (lat, lon, signal) =>
      get(
        'reverse',
        {
          lat: String(lat),
          lon: String(lon),
          format: 'jsonv2',
          zoom: '10',
          'accept-language': 'en',
        },
        signal,
      ),
  };
}
