# Data Model: Location Weather Lookup

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

All types live in `src/shared/` and are used by both client and server. Values crossing the
API are **metric and unrounded**. Rounding and unit conversion happen only at display time
(FR-003, FR-008).

---

## Location

A place the user wants weather for (spec Key Entities).

| Field | Type | Required | Notes / validation |
|---|---|---|---|
| `name` | string | yes | Place name, e.g. "Springfield". For coordinate-only labels, the formatted coordinates. |
| `region` | string \| null | yes | Upstream `admin1` / Nominatim `address.state`. Null if unknown. |
| `country` | string \| null | yes | English country name. Null only for coordinate-only labels. |
| `countryCode` | string \| null | yes | ISO 3166-1 alpha-2, uppercase. |
| `latitude` | number | yes | −90 … 90. |
| `longitude` | number | yes | −180 … 180. |
| `timeZone` | string \| null | yes | IANA zone (e.g. "America/Chicago"). May be null from reverse geocoding; filled from the weather response. |
| `displayName` | string | yes | Derived: `name, region, countryCode`, skipping nulls and a region identical to the name. FR-002. |
| `source` | `"search"` \| `"zip"` \| `"position"` | yes | How the location was obtained. Also used as the log `requestType`. |
| `isCoordinateLabel` | boolean | yes | `true` when reverse geocoding found no place name (FR-007). `displayName` is then e.g. `36.58° N, 118.29° W`. |

**Identity**: `(latitude rounded to 4 decimals, longitude rounded to 4 decimals)`. Used for
deduping and React keys. Disambiguation dedupe uses `(name, region, countryCode)` (research R5).
Only current populated places are kept: GeoNames `feature_code` starting with `PPL`,
excluding `PPLX`, `PPLH`, `PPLQ`, and `PPLW` (research R2). ZIP lookups keep every `PPL*`
code, because the place owning a ZIP can be coded `PPLX` (e.g. 90210 → Beverly Hills).

---

## CurrentWeatherObservation

Current conditions at a Location (FR-003). Every measured value is **nullable**: a missing
upstream value is displayed as "—" with an accessible "Not available" label (clarification Q3).

| Field | Type | Unit | Display rule |
|---|---|---|---|
| `temperatureC` | number \| null | °C | 1 decimal, after converting to the active unit |
| `feelsLikeC` | number \| null | °C | 1 decimal, after converting to the active unit |
| `humidityPct` | number \| null | % | integer, 0–100 |
| `windSpeedKmh` | number \| null | km/h | 1 decimal, after converting (km/h or mph) |
| `windDirectionDeg` | number \| null | degrees 0–360 | integer + 16-point compass, e.g. `NNW 330°` |
| `weatherCode` | number \| null | WMO 4677 code | maps to `condition` |
| `isDay` | boolean \| null | | selects day/night icon variant |
| `condition` | Condition \| null | | derived from `weatherCode` |
| `observedAt` | string | ISO 8601 with offset | shown in the location's local time (FR-003) |
| `timeZone` | string | IANA | location's zone, from upstream `timezone` |

`observedAt` and `timeZone` are **required**. A response missing them is treated as
`WEATHER_UNAVAILABLE`, because without them the data's age cannot be shown (FR-014).

### Condition (derived, `src/shared/conditions.ts`)

| Field | Type | Notes |
|---|---|---|
| `category` | `"clear" \| "partly-cloudy" \| "cloudy" \| "fog" \| "drizzle" \| "rain" \| "snow" \| "thunderstorm"` | Drives icon and background treatment (FR-010) |
| `description` | string | English text, e.g. "Light drizzle" |

Mapping covers every WMO code Open-Meteo emits: 0, 1–3, 45/48, 51–57, 61–67, 71–77,
80–82, 85–86, 95–99. An unknown code gives `condition = null`, displayed as "—".

### Derived display helpers (pure functions, unit-tested)

- `toDisplayTemp(c, units)`: °C → °F when imperial; `toFixed(1)`.
- `toDisplayWind(kmh, units)`: km/h → mph (÷ 1.609344) when imperial; `toFixed(1)`.
- `toCompass16(deg)`: index = `round(deg / 22.5) mod 16` over
  `N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW`. 360° maps to N.
- `formatCoordLabel(lat, lon)`: `|lat|.toFixed(2)° N|S, |lon|.toFixed(2)° E|W`.

---

## SearchResult

Server response to a name or ZIP search (FR-004).

| Field | Type | Notes |
|---|---|---|
| `query` | string | Trimmed input echoed back |
| `queryType` | `"search"` \| `"zip"` | `"zip"` iff input matches `/^\d{5}$/` |
| `matches` | Location[] (0–5) | Sorted by `region`, then `country` (alphabetical, case-insensitive) |
| `totalMatches` | integer ≥ 0 | Count after the populated-place filter and dedupe |
| `refineSuggested` | boolean | `totalMatches > 5` |

Zero matches → HTTP 404 `LOCATION_NOT_FOUND`. One match → the client fetches weather
directly. 2–5 matches, or `refineSuggested`, → the client shows the choice list.

---

## UnitPreference (client only)

| Field | Type | Notes |
|---|---|---|
| `system` | `"metric"` \| `"imperial"` | |
| `explicit` | boolean | `false` while inferred from locale (FR-009); `true` once the user toggles |

Persisted in `localStorage["weather.units"]` **only when `explicit` is true**. Never sent
to the server.

---

## RequestLogEntry (server only, FR-015)

One JSON line per API request to `/api/search`, `/api/weather`, or `/api/position`.

| Field | Type | Notes |
|---|---|---|
| `ts` | string | ISO 8601 UTC, request start |
| `requestType` | `"search"` \| `"zip"` \| `"position"` \| `"weather"` | |
| `query` | string \| null | Submitted text for search/zip (≤100 chars after validation) |
| `latitude` | number \| null | **Exact as received**, no rounding (clarification Q1, session 2) |
| `longitude` | number \| null | Exact as received |
| `outcome` | `"success"` \| `"not_found"` \| `"invalid_input"` \| `"upstream_error"` \| `"upstream_timeout"` | |
| `upstream` | `{ provider: "open-meteo-geocoding" \| "open-meteo-forecast" \| "nominatim", status: number \| null, ms: number }[]` | One entry per upstream call; `status` is null on timeout or network failure |
| `durationMs` | integer | Total server handling time |

**Prohibited fields**: client IP, User-Agent, cookies, and any request header (no user
identity, FR-015).
**Retention**: daily file `requests-YYYY-MM-DD.jsonl`. The file for UTC day D is deleted once
`now ≥ D 00:00 UTC + 7 days − retention interval (1 h)`. Cleanup runs hourly, so no entry is
ever older than 7 days (FR-015).

---

## Client view state (UI state machine)

```text
            submit(valid)               1 match / weather ok
  ┌──────┐ ─────────────► ┌─────────┐ ───────────────────────► ┌───────────┐
  │ idle │                │ loading │                          │ showing   │
  └──────┘ ◄───────────── └─────────┘ ──► choosing (2–5) ──►   │ weather   │
     ▲      cancel/error       │  │         select ─► loading  └───────────┘
     │                         │  └──► error{code} ──retry/new search──► loading
     └──── new search from any state (submit disabled only while loading, FR-005)
```

- `loading`: spinner visible, submit and "Use my location" disabled, 10 s client abort.
- `error.code` ∈ `EMPTY_INPUT | INPUT_TOO_LONG | LOCATION_NOT_FOUND | WEATHER_UNAVAILABLE |
  OFFLINE | PERMISSION_DENIED | POSITION_UNAVAILABLE`, each with distinct friendly copy
  (FR-006). `EMPTY_INPUT` and `INPUT_TOO_LONG` are caught client-side before any request.
- `showing weather` persists unchanged until a new search: no timers, no auto-refresh (FR-014).
- Unit toggle is valid in every state and re-renders without a network request.

## Input validation rules

| Rule | Where | Result |
|---|---|---|
| Trimmed length 0 | client (+ server guard) | `EMPTY_INPUT` / 400 `INVALID_INPUT` |
| Trimmed length > 100 | client (+ server guard) | `INPUT_TOO_LONG` / 400 `INVALID_INPUT` |
| `/^\d{5}$/` | server | ZIP path, `countryCode=US` |
| Any other text (any Unicode script) | server | name path, Nominatim fallback on zero results |
| `lat`/`lon` out of range or non-numeric | server | 400 `INVALID_INPUT` |
