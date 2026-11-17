import { fetchJson, type UpstreamResult } from './http.js';

export const CURRENT_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'is_day',
] as const;

export interface Forecast {
  current(lat: number, lon: number, signal?: AbortSignal): Promise<UpstreamResult>;
}

export function createForecast({ baseUrl }: { baseUrl: string }): Forecast {
  return {
    current(lat, lon, signal) {
      const url = new URL(baseUrl);
      url.searchParams.set('latitude', String(lat));
      url.searchParams.set('longitude', String(lon));
      url.searchParams.set('current', CURRENT_VARIABLES.join(','));
      url.searchParams.set('timezone', 'auto');
      return fetchJson(url.toString(), {
        provider: 'open-meteo-forecast',
        ...(signal ? { signal } : {}),
      });
    },
  };
}
