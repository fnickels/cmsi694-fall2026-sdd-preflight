export interface Config {
  port: number;
  logDir: string;
  staticDir: string;
  nominatimUserAgent: string;
  geocodingUrl: string;
  forecastUrl: string;
  nominatimUrl: string;
  nominatimMinIntervalMs: number;
}

export const UPSTREAM_TIMEOUT_MS = 4000;
export const REQUEST_BUDGET_MS = 8000;

function int(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const userAgent = env['NOMINATIM_USER_AGENT'] ?? '';
  if (env['NODE_ENV'] === 'production' && userAgent === '') {
    throw new Error('NOMINATIM_USER_AGENT is required in production (Nominatim usage policy)');
  }
  return {
    port: int(env['PORT'], 3000, 'PORT'),
    logDir: env['LOG_DIR'] ?? './logs',
    staticDir: env['STATIC_DIR'] ?? 'dist/client',
    nominatimUserAgent: userAgent || 'location-weather-lookup (development)',
    geocodingUrl:
      env['OPEN_METEO_GEOCODING_URL'] ?? 'https://geocoding-api.open-meteo.com/v1/search',
    forecastUrl: env['OPEN_METEO_FORECAST_URL'] ?? 'https://api.open-meteo.com/v1/forecast',
    nominatimUrl: env['NOMINATIM_URL'] ?? 'https://nominatim.openstreetmap.org',
    nominatimMinIntervalMs: int(
      env['NOMINATIM_MIN_INTERVAL_MS'],
      1000,
      'NOMINATIM_MIN_INTERVAL_MS',
    ),
  };
}
