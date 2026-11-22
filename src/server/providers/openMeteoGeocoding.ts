import type { UpstreamCall } from '../../shared/types.js';
import { fetchJson } from './http.js';

/** Subset of an Open-Meteo geocoding result that we use. */
export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  timezone?: string;
  population?: number | null;
}

export interface Geocoding {
  search(
    name: string,
    opts?: { countryCode?: string; signal?: AbortSignal },
  ): Promise<{ results: GeocodingResult[]; call: UpstreamCall; calls?: UpstreamCall[] }>;
}

export function createGeocoding({ baseUrl }: { baseUrl: string }): Geocoding {
  return {
    async search(name, { countryCode, signal } = {}) {
      const url = new URL(baseUrl);
      url.searchParams.set('name', name);
      url.searchParams.set('count', '100');
      url.searchParams.set('language', 'en');
      url.searchParams.set('format', 'json');
      if (countryCode) url.searchParams.set('countryCode', countryCode);
      const { body, call, calls } = await fetchJson<{ results?: GeocodingResult[] }>(
        url.toString(),
        {
          provider: 'open-meteo-geocoding',
          ...(signal ? { signal } : {}),
        },
      );
      return {
        results: Array.isArray(body.results) ? body.results : [],
        call,
        ...(calls ? { calls } : {}),
      };
    },
  };
}
