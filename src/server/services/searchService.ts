import { isUsZip, validateQuery } from '../../shared/input.js';
import type { Location, SearchResult, UpstreamCall } from '../../shared/types.js';
import { AppError } from '../errors.js';
import { UpstreamError } from '../providers/http.js';
import type { Nominatim } from '../providers/nominatim.js';
import type { Geocoding, GeocodingResult } from '../providers/openMeteoGeocoding.js';

const MAX_MATCHES = 5;
/** Sections of places, historical, abandoned, destroyed (research R2). */
const EXCLUDED_FEATURES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW']);
const SETTLEMENT_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'municipality', 'province']);

export function buildDisplayName(
  name: string,
  region: string | null,
  countryCode: string | null,
): string {
  const parts = [name];
  if (region && region !== name) parts.push(region);
  if (countryCode) parts.push(countryCode);
  return parts.join(', ');
}

function isCurrentPopulatedPlace(r: GeocodingResult): boolean {
  const fc = r.feature_code ?? '';
  return fc.startsWith('PPL') && !EXCLUDED_FEATURES.has(fc);
}

/**
 * A ZIP lookup (countryCode=US) returns the place that owns the ZIP, which GeoNames may code as
 * a section of a larger place (e.g. 90210 → Beverly Hills, PPLX), so only the PPL prefix applies.
 */
function isZipPlace(r: GeocodingResult): boolean {
  return (r.feature_code ?? '').startsWith('PPL');
}

function fromOpenMeteo(r: GeocodingResult, source: Location['source']): Location {
  const region = r.admin1 ?? null;
  const countryCode = r.country_code ? r.country_code.toUpperCase() : null;
  return {
    name: r.name,
    region,
    country: r.country ?? null,
    countryCode,
    latitude: r.latitude,
    longitude: r.longitude,
    timeZone: r.timezone ?? null,
    displayName: buildDisplayName(r.name, region, countryCode),
    source,
    isCoordinateLabel: false,
  };
}

interface NominatimPlace {
  name?: string;
  lat?: string;
  lon?: string;
  addresstype?: string;
  address?: { state?: string; country?: string; country_code?: string };
}

function fromNominatim(p: NominatimPlace): Location | null {
  const latitude = Number(p.lat);
  const longitude = Number(p.lon);
  if (!p.name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!SETTLEMENT_TYPES.has(p.addresstype ?? '')) return null;
  const region = p.address?.state ?? null;
  const countryCode = p.address?.country_code ? p.address.country_code.toUpperCase() : null;
  return {
    name: p.name,
    region,
    country: p.address?.country ?? null,
    countryCode,
    latitude,
    longitude,
    timeZone: null,
    displayName: buildDisplayName(p.name, region, countryCode),
    source: 'search',
    isCoordinateLabel: false,
  };
}

const collator = new Intl.Collator('en', { sensitivity: 'base' });

function compareNullsLast(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return collator.compare(a, b);
}

/** FR-004: alphabetical by region, then country (nulls last). Stable for full ties. */
function byRegionThenCountry(a: Location, b: Location): number {
  return compareNullsLast(a.region, b.region) || compareNullsLast(a.country, b.country);
}

function dedupe(locations: Location[]): Location[] {
  const seen = new Set<string>();
  return locations.filter((l) => {
    const key = `${l.name}\u0000${l.region ?? ''}\u0000${l.countryCode ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface SearchOptions {
  /** Collector that receives every upstream call, even when the search fails. */
  calls?: UpstreamCall[];
  signal?: AbortSignal;
}

export function createSearchService({
  geocoding,
  nominatim,
}: {
  geocoding: Geocoding;
  nominatim: Nominatim;
}) {
  async function search(raw: string, { calls = [], signal }: SearchOptions = {}) {
    const v = validateQuery(raw);
    if (!v.ok) throw new AppError('INVALID_INPUT');
    const query = v.value;
    const zip = isUsZip(query);
    const source: Location['source'] = zip ? 'zip' : 'search';

    try {
      const geo = await geocoding.search(query, {
        ...(zip ? { countryCode: 'US' } : {}),
        ...(signal ? { signal } : {}),
      });
      calls.push(geo.call);
      let locations = geo.results
        .filter(zip ? isZipPlace : isCurrentPopulatedPlace)
        .map((r) => fromOpenMeteo(r, source));

      if (locations.length === 0 && !zip) {
        const nom = await nominatim.search(query, signal);
        calls.push(nom.call);
        const places = Array.isArray(nom.body) ? (nom.body as NominatimPlace[]) : [];
        locations = places.map(fromNominatim).filter((l): l is Location => l !== null);
      }

      const unique = dedupe(locations).sort(byRegionThenCountry);
      if (unique.length === 0) throw new AppError('LOCATION_NOT_FOUND');

      const result: SearchResult = {
        query,
        queryType: zip ? 'zip' : 'search',
        matches: unique.slice(0, MAX_MATCHES),
        totalMatches: unique.length,
        refineSuggested: unique.length > MAX_MATCHES,
      };
      return { result, calls };
    } catch (e) {
      if (e instanceof UpstreamError) {
        calls.push(e.call);
        throw new AppError('WEATHER_UNAVAILABLE', { cause: e });
      }
      throw e;
    }
  }
  return { search };
}

export type SearchService = ReturnType<typeof createSearchService>;
