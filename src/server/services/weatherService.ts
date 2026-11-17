import { conditionFor } from '../../shared/conditions.js';
import type { CurrentWeatherObservation, UpstreamCall } from '../../shared/types.js';
import { AppError } from '../errors.js';
import { UpstreamError } from '../providers/http.js';
import type { Forecast } from '../providers/openMeteoForecast.js';

interface ForecastBody {
  timezone?: unknown;
  utc_offset_seconds?: unknown;
  current?: Record<string, unknown>;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const abs = Math.abs(seconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** Converts Open-Meteo local time "YYYY-MM-DDTHH:mm" plus offset into ISO 8601 with offset. */
function toIso(localTime: string, offsetSeconds: number): string | null {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?$/.exec(localTime);
  if (!m) return null;
  return `${m[1] ?? ''}${m[2] ?? ':00'}${formatOffset(offsetSeconds)}`;
}

export function normalizeForecast(body: unknown): CurrentWeatherObservation {
  const b = (body ?? {}) as ForecastBody;
  const cur = b.current;
  const offset = num(b.utc_offset_seconds) ?? 0;
  const observedAt = cur && typeof cur['time'] === 'string' ? toIso(cur['time'], offset) : null;
  if (!cur || observedAt === null || typeof b.timezone !== 'string' || b.timezone === '') {
    throw new AppError('WEATHER_UNAVAILABLE');
  }
  const weatherCode = num(cur['weather_code']);
  const isDayRaw = num(cur['is_day']);
  return {
    temperatureC: num(cur['temperature_2m']),
    feelsLikeC: num(cur['apparent_temperature']),
    humidityPct: num(cur['relative_humidity_2m']),
    windSpeedKmh: num(cur['wind_speed_10m']),
    windDirectionDeg: num(cur['wind_direction_10m']),
    weatherCode,
    isDay: isDayRaw === null ? null : isDayRaw === 1,
    condition: conditionFor(weatherCode),
    observedAt,
    timeZone: b.timezone,
  };
}

export function createWeatherService({ forecast }: { forecast: Forecast }) {
  async function current(
    lat: number,
    lon: number,
    { calls = [], signal }: { calls?: UpstreamCall[]; signal?: AbortSignal } = {},
  ) {
    try {
      const { body, call } = await forecast.current(lat, lon, signal);
      calls.push(call);
      return { observation: normalizeForecast(body), calls };
    } catch (e) {
      if (e instanceof UpstreamError) {
        calls.push(e.call);
        throw new AppError('WEATHER_UNAVAILABLE', { cause: e });
      }
      throw e;
    }
  }
  return { current };
}

export type WeatherService = ReturnType<typeof createWeatherService>;
