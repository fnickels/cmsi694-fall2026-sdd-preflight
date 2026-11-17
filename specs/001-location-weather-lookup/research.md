# Phase 0 Research: Location Weather Lookup

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-17

Every decision below resolves a Technical Context unknown or a spec requirement that
constrains the design. API behaviors marked "verified" were exercised live on 2026-11-17.

---

## R1. Weather data source

- **Decision**: Open-Meteo Forecast API (`api.open-meteo.com/v1/forecast`) using the
  `current=` parameter with `temperature_2m, apparent_temperature, relative_humidity_2m,
  weather_code, wind_speed_10m, wind_direction_10m, is_day` and `timezone=auto`. Request
  metric units (°C, km/h); the client converts.
- **Rationale**: Free with no API key (no secret to manage), provides every FR-003 field,
  returns the location's IANA time zone and observation time (FR-003 local time), and
  `current` values are 15-minute model data. Free tier: <10,000 calls/day, <5,000/hour,
  <600/min, non-commercial, CC-BY 4.0 attribution required — ample for <100 concurrent
  users (spec Assumptions).
- **Alternatives considered**:
  - OpenWeatherMap: needs an API key and has a lower free-tier quota; adds secret management.
  - US National Weather Service (api.weather.gov): free, but US-only; spec requires worldwide
    place names.
  - WeatherAPI.com: needs a key; free-tier terms change frequently.
- **Risks / notes**:
  - Open-Meteo rate limits are per source IP; shared-IP PaaS hosts (Vercel/Netlify/Render)
    may be throttled earlier (per Open-Meteo terms). Throttling surfaces as the standard
    "weather currently unavailable" message (spec Edge Cases; no per-visitor limit by
    clarification).
  - The forecast endpoint was unreachable from the planning workstation during research
    (transport timeout) while the geocoding endpoint worked, which is an early example of
    the outage path the 10-second timeout and FR-006 error message must cover. Field names
    are taken from the official docs (open-meteo.com/en/docs, "Current Weather").
  - CC-BY 4.0 requires a visible "Weather data by Open-Meteo.com" attribution in the UI.

## R2. Forward geocoding (place name and US ZIP → Location)

- **Decision**: Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`,
  `count=100`, `language=en`) as the primary resolver.
  - **5-digit numeric input** (`/^\d{5}$/`) → treated as a US ZIP (spec Edge Cases): call with
    `countryCode=US`. **Verified**: `10001` → New York, NY only; without `countryCode`
    the same query also returns matches in Spain and France.
  - **Other input** → call without `countryCode`. **Verified**: `Springfield, Illinois`
    resolves (comma-qualified queries are supported); `São Paulo` resolves; `Xyzzyqwerty`
    returns zero results.
  - Keep only current populated places: `feature_code` starts with `PPL` **and** is not
    `PPLX` (section of a populated place), `PPLH` (historical), `PPLQ` (abandoned), or `PPLW`
    (destroyed). This drops parks, airports, mountains, and neighborhoods. **Verified**:
    `Springfield, Illinois` otherwise also returns "Springfield Park" and an airport; `Paris`
    returns `MT` (mountain) entries; `Los Angeles, California` returns `PPLX` entries ("Los
    Angeles Downtown", "Los Angeles City Center"), and with them excluded resolves to exactly
    one match.
- **Rationale**: Same provider as weather (one dependency, no key), returns `admin1`
  (region), `country`, `country_code`, coordinates, and `timezone`, which is everything the
  Location entity needs.
- **Alternatives considered**: Zippopotam.us for ZIPs (verified working, e.g.
  `90210` → Beverly Hills, CA) was rejected as an extra dependency once `countryCode=US`
  proved sufficient; it remains a documented fallback if ZIP coverage gaps appear.

## R3. Non-Latin-script place names (e.g., "東京")

- **Decision**: When Open-Meteo returns zero populated-place results, fall back to
  Nominatim search (`nominatim.openstreetmap.org/search`, `format=jsonv2`,
  `addressdetails=1`, `accept-language=en`, `featureType=settlement`, `limit=10`).
- **Rationale**: **Verified** Open-Meteo returns 0 results for `東京` (with `language=en`, `ja`,
  or none), while Nominatim returns Tokyo, Japan and resolves `Москва` → Moscow. Spec Edge
  Cases require non-English names to resolve.
- **Constraints**: Nominatim usage policy requires an identifying `User-Agent`, at most
  1 request/second application-wide, and attribution ("© OpenStreetMap contributors").
  The server applies a global (not per-visitor) 1 req/s queue to Nominatim calls. This
  is upstream etiquette, not the per-visitor limit the clarification ruled out.
- **Alternatives considered**: Calling Nominatim for every query was rejected because the
  1 req/s limit would bottleneck all searches. Client-side transliteration was rejected
  as unreliable.

## R4. Reverse geocoding ("Use my location")

- **Decision**: Nominatim reverse (`/reverse`, `format=jsonv2`, `zoom=10`,
  `accept-language=en`) through the same 1 req/s queue. If there is no result or no
  settlement-level address, the label falls back to coordinates formatted to two decimals
  with hemisphere letters, e.g. `36.58° N, 118.29° W` (FR-007).
- **Rationale**: **Verified** `34.05,-118.24` → "Los Angeles, … California, United States"
  with structured `address.city/state/country`. Open-Meteo has no reverse geocoding.
- **Alternatives considered**: BigDataCloud client-side reverse geocoding was rejected:
  it sends coordinates from the browser to a third party outside FR-015 logging, and its
  terms restrict server-side use.

## R5. Disambiguation ordering (FR-004)

- **Decision**: After the `PPL*` filter, dedupe by (name, admin1, country_code)
  (keep the first entry), sort by `admin1` then `country` using
  `Intl.Collator('en', { sensitivity: 'base' })`, and return the first 5 plus
  `totalMatches`. If `totalMatches > 5`, set `refineSuggested: true`. If exactly one match
  remains, the client fetches weather directly (User Story 2, scenario 3).
- **Rationale**: Implements the clarified alphabetical rule deterministically and in a
  testable way. `count=100` (the API maximum) ensures alphabetical selection happens
  across all candidates instead of only the provider's top results. **Verified**:
  `Springfield` and `Paris` each return 100 results.
- **Note**: Alphabetical-first-5 omits well-known places. **Verified**: unqualified `Los
  Angeles` returns 100 populated places, and California is not among the first 5 by region.
  The user confirmed keeping this rule (spec Clarifications). The refine prompt plus
  comma-qualified search (R2) is the intended path, e.g. `Los Angeles, California`.

## R6. Application architecture

- **Decision**: A single TypeScript project with a thin **Node.js backend-for-frontend
  (BFF)** that proxies, normalizes, and logs upstream calls, plus a **browser SPA**
  served by the same process.
- **Rationale**:
  - FR-015 requires server-side request logs, so a pure static site cannot satisfy it.
  - Nominatim requires a stable identifying User-Agent and a global rate queue, which
    only a server can enforce.
  - The server normalizes three upstreams into one stable contract
    ([contracts/api.openapi.yaml](./contracts/api.openapi.yaml)) and keeps raw upstream
    errors out of the UI (FR-006).
  - Constitution II (separation of concerns): the UI never knows which provider is used.
- **Alternatives considered**:
  - Static SPA calling the APIs directly: fails FR-015 and the Nominatim policy.
  - Separate frontend/backend repositories or workspaces: unnecessary overhead at
    classroom scale. One `package.json` with `src/client`, `src/server`, and `src/shared`
    keeps contracts type-shared.

## R7. Language, runtime, and frameworks

| Concern | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| Runtime | Node.js 24 LTS | Active LTS in Nov 2026; installed locally (v24.18.0); built-in `fetch` and `AbortSignal.timeout` | Node 22 (maintenance-only), Deno/Bun (less course familiarity) |
| Language | TypeScript 6.0.x (`~6.0.3`), `strict: true` | Constitution "Type Safety" gate; shared types across client and server. TypeScript 7.0 is `latest` on npm, but typescript-eslint 8.73 declares a peer range of `typescript >=4.8.4 <6.1.0`, so 7.x would break the Static Analysis gate | TypeScript 7.x (lint incompatibility), JavaScript + JSDoc (weaker gate) |
| Server | Fastify 5 + `@fastify/static` | JSON-schema request/response validation that doubles as contract tests; built-in pino logging; `inject()` for tests without sockets | Express (no built-in schema validation), Hono (fine, but smaller ecosystem for static and logging) |
| UI | React 19 + Vite 8 | Component model fits card layout, well-supported testing (Testing Library), fast dev server with API proxy | Vanilla TS (more hand-written state wiring), Svelte/Vue (less course familiarity) |
| Styling | Hand-written CSS with custom properties (design tokens) + CSS Grid; no UI kit | Full control of the "modern" look (FR-010), small bundle, easy WCAG contrast tuning | Tailwind (extra build tooling), MUI (heavy, generic look) |
| Icons | Inline SVG set mapped from WMO weather codes, day/night variants via `is_day` | No third-party icon CDN (privacy), accessible `<title>` labels | Icon webfonts (poor accessibility) |

Package versions verified on npm on 2026-11-17: typescript 6.0.3 (pinned; 7.0.2 is latest), fastify 5.12,
@fastify/static 10.1, undici 8.12, react 19.3, vite 8.3, @vitejs/plugin-react 6.3, vitest 5.1,
@playwright/test 1.65, @axe-core/playwright 4.14, pino 10.4, eslint 10.15, typescript-eslint 8.73,
prettier 3.10.

Providers call `fetch` imported from the `undici` package, not the global `fetch`. Node 24
bundles undici 7.28, and a `MockAgent` from npm undici 8 does not reliably intercept the
global `fetch`.

## R8. Testing strategy (Constitution I: test-first, non-negotiable)

- **Decision**:
  - **Unit (Vitest)**: pure shared logic (unit conversion, 16-point compass + degrees,
    rounding rules, WMO code → condition, ZIP detection, input validation, match sorting,
    coordinate label formatting, locale → default units).
  - **Contract (Vitest + Fastify `inject`)**: every endpoint in
    `contracts/api.openapi.yaml`, with upstreams stubbed via undici `MockAgent`.
    Covers success, not-found, invalid input, upstream 5xx/429, timeout, and partial
    data responses.
  - **Component (Vitest + Testing Library + jsdom)**: UI states (loading, error messages,
    disambiguation list, "—" placeholders, unit toggle persistence).
  - **End-to-end (Playwright)**: the four user stories against the real built server. The
    server's upstream base URLs (`OPEN_METEO_GEOCODING_URL`, `OPEN_METEO_FORECAST_URL`,
    `NOMINATIM_URL`) point at a local fixture HTTP server (`tests/e2e/fixture-upstreams.ts`)
    started by Playwright `webServer`. Browser-side `page.route` cannot intercept
    server-to-upstream calls; it is used only to simulate offline/failed `/api` calls or to
    delay `/api` responses (e.g., to observe the loading state). The fixture server's
    `FIXTURE_LATENCY_MS` setting adds realistic upstream latency for the SC-002 timing test.
    Geolocation granted/denied via browser context permissions; viewports 320 px and 1920 px;
    `@axe-core/playwright` with zero critical/serious violations (SC-006).
  - **Live accuracy check (opt-in, not in the CI gate)**: SC-004 compares the app's
    temperature with the nearest US National Weather Service observation. **Verified**:
    `api.weather.gov/points/{lat},{lon}` → `observationStations` →
    `/stations/{id}/observations/latest` returns `temperature.value` in °C (e.g., KHHR
    16 °C). It is free and keyless but requires a `User-Agent`. Some stations return `null`
    or stale readings, so the test takes the first station with a non-null temperature
    observed within 90 minutes, samples ≥ 20 US cities, and passes when ≥ 95% of them are
    within 2 °C.
- **Rationale**: Deterministic tests never depend on third-party uptime (see R1 outage
  observation). The test pyramid maps 1:1 to spec acceptance scenarios.

## R9. Request logging and retention (FR-013, FR-015)

- **Decision**: A dedicated pino logger writes JSON Lines to
  `${LOG_DIR}/requests-YYYY-MM-DD.jsonl` (UTC date), one entry per lookup request. A
  retention job deletes files older than 7 days on startup and hourly. Directory mode
  `0700`, file mode `0600`.
- **Fields**: exactly the RequestLogEntry attributes in
  [data-model.md](./data-model.md). Fastify's default request logging is **disabled** for
  `/api/*`, because it would record client IP and User-Agent (user identity, prohibited
  by FR-015).
- **Rationale**: File-based logs need no database; daily files make 7-day deletion a
  simple file-age check. Exact coordinates are logged per clarification, so restrictive
  permissions are the minimum protection.
- **Alternatives considered**: SQLite (extra dependency for append-only data), a hosted
  log service (sends location data to another third party).

## R10. Timeouts, errors, and offline (FR-005, FR-006, Edge Cases)

- **Decision**:
  - Server: per-upstream timeout of 4 s (`AbortSignal.timeout`), with a total budget per
    API request of 8 s.
  - Client: hard abort at 10 s (spec maximum). The submit control is disabled while a
    request is in flight.
  - Error codes: `INVALID_INPUT`, `LOCATION_NOT_FOUND`, `WEATHER_UNAVAILABLE`, mapped from
    upstream 5xx, 429, timeouts, and malformed data. The client adds `OFFLINE`
    (`navigator.onLine === false` or fetch `TypeError`) and `PERMISSION_DENIED` /
    `POSITION_UNAVAILABLE` (Geolocation API).
- **Rationale**: Keeps the total under the 10 s edge-case bound and gives every FR-006
  message a distinct code.

## R11. Units and locale defaults (FR-008, FR-009)

- **Decision**: The server always returns metric, unrounded. The client converts:
  °F = °C × 9/5 + 32, mph = km/h ÷ 1.609344, then rounds for display (one decimal for
  temperature and wind; integers for humidity and degrees). The preference is stored in
  `localStorage` (key `weather.units`). Default: imperial if the region subtag of
  `navigator.language` is `US`, otherwise metric.
- **Rationale**: Instant toggling without refetching (US4 scenario 1). Converting from
  unrounded values satisfies the FR-003 clarification.

## R12. Hosting and delivery

- **Decision**: Production is a single Node process (`node dist/server/index.js`)
  serving the API and built static assets, packaged with a Dockerfile, on any
  container host with a **persistent volume for `LOG_DIR`**. Development uses Vite's dev
  server proxying `/api` to Fastify.
- **CI**: A GitHub Actions workflow runs lint (ESLint + Prettier check), typecheck
  (`tsc --noEmit`), unit/contract/component tests with a coverage baseline, Playwright e2e
  with axe, and markdownlint on `specs/` and `docs/` (Constitution Quality Standards and
  "documentation verified in CI").
- **Rationale**: Meets the constitution's quality gates with one deployable unit (Constitution
  IV, incremental delivery).
