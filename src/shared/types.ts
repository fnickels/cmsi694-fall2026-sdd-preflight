export type LocationSource = 'search' | 'zip' | 'position';

export interface Location {
  name: string;
  region: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2, uppercase. */
  countryCode: string | null;
  /** −90 … 90 */
  latitude: number;
  /** −180 … 180 */
  longitude: number;
  timeZone: string | null;
  displayName: string;
  source: LocationSource;
  isCoordinateLabel: boolean;
}

export type ConditionCategory =
  'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';

export interface Condition {
  category: ConditionCategory;
  description: string;
}

/** Metric, unrounded. Measurements are null when the upstream omitted them. */
export interface CurrentWeatherObservation {
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
  condition: Condition | null;
  observedAt: string;
  timeZone: string;
}

export interface SearchResult {
  query: string;
  queryType: 'search' | 'zip';
  matches: Location[];
  totalMatches: number;
  refineSuggested: boolean;
}

export type ApiErrorCode = 'INVALID_INPUT' | 'LOCATION_NOT_FOUND' | 'WEATHER_UNAVAILABLE';

export type ClientErrorCode =
  | 'EMPTY_INPUT'
  | 'INPUT_TOO_LONG'
  | 'LOCATION_NOT_FOUND'
  | 'WEATHER_UNAVAILABLE'
  | 'OFFLINE'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE';

export type UnitSystem = 'metric' | 'imperial';

export type UpstreamProvider = 'open-meteo-geocoding' | 'open-meteo-forecast' | 'nominatim';

export interface UpstreamCall {
  provider: UpstreamProvider;
  status: number | null;
  ms: number;
}

export type RequestType = 'search' | 'zip' | 'position' | 'weather';

export type RequestOutcome =
  'success' | 'not_found' | 'invalid_input' | 'upstream_error' | 'upstream_timeout';

/** One line in the request log (FR-015). Never contains user identity. */
export interface RequestLogEntry {
  ts: string;
  requestType: RequestType;
  query: string | null;
  latitude: number | null;
  longitude: number | null;
  outcome: RequestOutcome;
  upstream: UpstreamCall[];
  durationMs: number;
}
