import { formatCoordLabel } from '../../shared/coordinates.js';
import type { Location, UpstreamCall } from '../../shared/types.js';
import { UpstreamError } from '../providers/http.js';
import type { Nominatim } from '../providers/nominatim.js';
import { buildDisplayName } from './searchService.js';

const PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'suburb',
  'county',
  'state',
  'province',
  'region',
  'country',
]);

interface ReverseResult {
  name?: string;
  addresstype?: string;
  error?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

function coordinateLocation(latitude: number, longitude: number): Location {
  const label = formatCoordLabel(latitude, longitude);
  return {
    name: label,
    region: null,
    country: null,
    countryCode: null,
    latitude,
    longitude,
    timeZone: null,
    displayName: label,
    source: 'position',
    isCoordinateLabel: true,
  };
}

function toLocation(r: ReverseResult, latitude: number, longitude: number): Location | null {
  if (r.error || !PLACE_TYPES.has(r.addresstype ?? '')) return null;
  const a = r.address ?? {};
  const name = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? r.name;
  if (!name) return null;
  const region = a.state ?? null;
  const countryCode = a.country_code ? a.country_code.toUpperCase() : null;
  return {
    name,
    region,
    country: a.country ?? null,
    countryCode,
    // Exact browser coordinates are kept so weather is fetched for the user's real position.
    latitude,
    longitude,
    timeZone: null,
    displayName: buildDisplayName(name, region, countryCode),
    source: 'position',
    isCoordinateLabel: false,
  };
}

export function createPositionService({ nominatim }: { nominatim: Nominatim }) {
  /** Never fails for valid coordinates: weather can still be shown with a coordinate label. */
  async function describe(
    latitude: number,
    longitude: number,
    { calls = [], signal }: { calls?: UpstreamCall[]; signal?: AbortSignal } = {},
  ) {
    try {
      const { body, call } = await nominatim.reverse(latitude, longitude, signal);
      calls.push(call);
      const location =
        toLocation(body ?? {}, latitude, longitude) ?? coordinateLocation(latitude, longitude);
      return { location, calls };
    } catch (e) {
      if (!(e instanceof UpstreamError)) throw e;
      calls.push(e.call);
      return { location: coordinateLocation(latitude, longitude), calls };
    }
  }
  return { describe };
}

export type PositionService = ReturnType<typeof createPositionService>;
