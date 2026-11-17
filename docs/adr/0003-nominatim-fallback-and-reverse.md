# ADR 0003: Nominatim for reverse geocoding and as a search fallback

- **Status**: Accepted
- **Date**: 2026-11-17
- **Sources**: [research R3, R4](../../specs/001-location-weather-lookup/research.md)

## Context

"Use my location" needs reverse geocoding (FR-007), which Open-Meteo lacks. Open-Meteo also
returns no results for non-Latin place names such as "東京" (verified 2026-11-17).

## Decision

Use OpenStreetMap Nominatim for reverse geocoding, and for forward search only when
Open-Meteo returns zero populated places. All Nominatim calls go through one queue that
spaces call starts at least 1 second apart and send the configured `NOMINATIM_USER_AGENT`.
If reverse geocoding finds no place, or fails, the position is labeled with its coordinates
(e.g. `36.58° N, 118.29° W`).

## Alternatives considered

- Nominatim for every search: the 1 request/second limit would bottleneck all users.
- Browser-side reverse geocoding services: would send coordinates to a third party outside
  the request log.

## Consequences

- The UI always shows "© OpenStreetMap contributors" (ODbL attribution).
- Heavy use of non-Latin search or "Use my location" can queue for a few seconds.
