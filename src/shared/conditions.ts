import type { Condition, ConditionCategory } from './types.js';

const c = (category: ConditionCategory, description: string): Condition => ({
  category,
  description,
});

/** WMO 4677 weather interpretation codes as emitted by Open-Meteo. */
const BY_CODE: Readonly<Record<number, Condition>> = {
  0: c('clear', 'Clear sky'),
  1: c('partly-cloudy', 'Mainly clear'),
  2: c('partly-cloudy', 'Partly cloudy'),
  3: c('cloudy', 'Overcast'),
  45: c('fog', 'Fog'),
  48: c('fog', 'Depositing rime fog'),
  51: c('drizzle', 'Light drizzle'),
  53: c('drizzle', 'Moderate drizzle'),
  55: c('drizzle', 'Dense drizzle'),
  56: c('drizzle', 'Light freezing drizzle'),
  57: c('drizzle', 'Dense freezing drizzle'),
  61: c('rain', 'Slight rain'),
  63: c('rain', 'Moderate rain'),
  65: c('rain', 'Heavy rain'),
  66: c('rain', 'Light freezing rain'),
  67: c('rain', 'Heavy freezing rain'),
  71: c('snow', 'Slight snowfall'),
  73: c('snow', 'Moderate snowfall'),
  75: c('snow', 'Heavy snowfall'),
  77: c('snow', 'Snow grains'),
  80: c('rain', 'Slight rain showers'),
  81: c('rain', 'Moderate rain showers'),
  82: c('rain', 'Violent rain showers'),
  85: c('snow', 'Slight snow showers'),
  86: c('snow', 'Heavy snow showers'),
  95: c('thunderstorm', 'Thunderstorm'),
  96: c('thunderstorm', 'Thunderstorm with slight hail'),
  99: c('thunderstorm', 'Thunderstorm with heavy hail'),
};

export function conditionFor(code: number | null): Condition | null {
  if (code === null) return null;
  return BY_CODE[code] ?? null;
}
