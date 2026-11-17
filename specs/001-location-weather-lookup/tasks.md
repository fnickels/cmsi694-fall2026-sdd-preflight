---

description: "Task list for Location Weather Lookup implementation"
---

# Tasks: Location Weather Lookup

**Input**: Design documents from `/specs/001-location-weather-lookup/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: INCLUDED. The project constitution makes Test-First Development
NON-NEGOTIABLE (Principle I). Within every phase, write the test tasks first, run them,
confirm they **FAIL**, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task names the exact file(s) to create or modify

## Path Conventions

Single package at repository root (see [plan.md › Project Structure](./plan.md#project-structure)):
`src/shared/`, `src/server/`, `src/client/`, `tests/{unit,contract,component,e2e,live,fixtures}/`, `docs/adr/`.

## Global conventions (apply to every task)

- TypeScript `strict` + `noUncheckedIndexedAccess`; ES modules (`"type": "module"`); no `any`.
- Relative imports in `src/shared/**` and `src/server/**` use explicit `.js` extensions
  (e.g. `import { isUsZip } from '../shared/input.js'`). This is required by `NodeNext` and
  also accepted by the client's `Bundler` resolution.
- Server providers MUST call `fetch` imported from the `undici` package (`import { fetch } from 'undici'`),
  never the global `fetch`, so `MockAgent` intercepts reliably (research R7).
- API values are **metric and unrounded**. Only the client converts and rounds (data-model.md).
- UI copy, roles, and accessible names come verbatim from [contracts/ui-contract.md](./contracts/ui-contract.md).
  Tests select elements with `getByRole`/`getByLabelText`, not CSS classes.
- Response shapes come verbatim from [contracts/api.openapi.yaml](./contracts/api.openapi.yaml).
- Never log client IP, User-Agent, cookies, or any request header (FR-015).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling for the constitution's quality gates

- [ ] T001 Create the directory skeleton from plan.md: `src/shared/`, `src/server/{routes,services,providers,logging}/`, `src/client/{hooks,components,icons,styles}/`, `tests/{unit,contract,component,e2e,live,fixtures}/`, `docs/adr/`, adding `.gitkeep` files to empty directories
- [ ] T002 Create `package.json` with `"name": "location-weather-lookup"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=24" }` and these scripts:
  - `dev`: `concurrently -k -n vite,api "vite" "tsx watch src/server/index.ts"`
  - `build`: `vite build && tsc -p tsconfig.server.json`
  - `start`: `node dist/server/index.js`
  - `lint`: `eslint . && prettier --check .`
  - `lint:docs`: `markdownlint-cli2 "specs/**/*.md" "docs/**/*.md" README.md`
  - `lint:api`: `redocly lint specs/001-location-weather-lookup/contracts/api.openapi.yaml`
  - `typecheck`: `tsc -p tsconfig.client.json --noEmit && tsc -p tsconfig.server.json --noEmit && tsc -p tsconfig.node.json --noEmit`
  - `test`: `vitest run --coverage`
  - `test:e2e`: `playwright test`
  - `test:live`: `vitest run --config vitest.live.config.ts`
  - `check:bundle`: `node scripts/check-bundle-size.mjs`

  Then install dependencies:
  - Runtime: `npm i fastify@^5.12 @fastify/static@^10.1 pino@^10.4 undici@^8.12 react@^19.3 react-dom@^19.3`
  - Dev: `npm i -D typescript@~6.0.3 tsx@^4.23 vite@^8.3 @vitejs/plugin-react@^6.3 vitest@^5.1 @vitest/coverage-v8@^5.1 jsdom@^31 @testing-library/react@^16.3 @testing-library/user-event@^14.6 @testing-library/jest-dom@^7 @playwright/test@^1.65 @axe-core/playwright@^4.14 eslint@^10.15 typescript-eslint@^8.73 eslint-plugin-react-hooks@^7.1 eslint-plugin-jsx-a11y@^6.10 prettier@^3.10 ajv@^8.20 ajv-formats@^3 yaml@^2.9 concurrently@^10 markdownlint-cli2@^0.24 @redocly/cli@^2.79 @types/node@^24 @types/react@^19 @types/react-dom@^19`
  - TypeScript stays pinned at `~6.0.3`, because typescript-eslint supports `<6.1`.
- [ ] T003 Create four TypeScript configs:
  - `tsconfig.base.json`: `target ES2023`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck`, `isolatedModules`, `verbatimModuleSyntax`
  - `tsconfig.client.json`: extends base; `module ESNext`, `moduleResolution Bundler`, `jsx react-jsx`, `lib ["ES2023","DOM","DOM.Iterable"]`, `types ["vite/client"]`, `noEmit`; includes `src/client/**`, `src/shared/**`, `tests/component/**`
  - `tsconfig.server.json`: extends base; `module NodeNext`, `moduleResolution NodeNext`, `lib ["ES2023"]`, `types ["node"]`, `rootDir src`, `outDir dist`; includes **only** `src/server/**` and `src/shared/**` (used by `build` to emit)
  - `tsconfig.node.json`: extends base; `module NodeNext`, `moduleResolution NodeNext`, `types ["node"]`, `noEmit`; includes `tests/unit/**`, `tests/contract/**`, `tests/e2e/**`, `tests/live/**`, `scripts/**`, `*.config.ts`
  - `tsconfig.json`: `{ "files": [], "references": [] }` listing the three configs, for editor discovery only
- [ ] T004 [P] Create `eslint.config.js` (flat config: `typescript-eslint` `strictTypeChecked`, `eslint-plugin-react-hooks` recommended, `eslint-plugin-jsx-a11y` recommended for `src/client/**`; ignore `dist`, `coverage`, `playwright-report`, `test-results`), `.prettierrc.json` (`{ "singleQuote": true, "printWidth": 100 }`), and `.prettierignore`
- [ ] T005 [P] Create `vite.config.ts`: `root: 'src/client'`, `@vitejs/plugin-react`, `build.outDir: '../../dist/client'`, `build.emptyOutDir: true`, `server.proxy: { '/api': 'http://localhost:3000' }`
- [ ] T006 [P] Create `vitest.config.ts` with two `projects`:
  - `node`: `tests/unit/**`, `tests/contract/**`, environment `node`
  - `component`: `tests/component/**`, environment `jsdom`, `setupFiles: ['tests/component/setup.ts']`

  Coverage: provider `v8`, `include: ['src/**']`, thresholds initially `{ lines: 80, branches: 75, functions: 80, statements: 80 }` (raised to the measured baseline in T102); exclude `tests/live/**`. Also create `vitest.live.config.ts` including only `tests/live/**`.
- [ ] T007 [P] Create `playwright.config.ts`:
  - `testDir: 'tests/e2e'`; projects `chromium-desktop` (1920×1080) and `chromium-mobile` (320×640)
  - `use.locale: 'en-US'`
  - `webServer` array:
    1. `tsx tests/e2e/fixture-upstreams.ts`, port 4010
    2. `npm run build && npm start`, port 3000, with env:
       - `NODE_ENV=production`
       - `OPEN_METEO_GEOCODING_URL=http://localhost:4010/geocoding`
       - `OPEN_METEO_FORECAST_URL=http://localhost:4010/forecast`
       - `NOMINATIM_URL=http://localhost:4010/nominatim`
       - `LOG_DIR=./test-results/logs`
       - `NOMINATIM_USER_AGENT=e2e`
       - `NOMINATIM_MIN_INTERVAL_MS=0`
- [ ] T008 [P] Create `.gitignore` (`node_modules`, `dist`, `coverage`, `logs`, `.env`, `test-results`, `playwright-report`) and `.env.example`:
  - `PORT=3000`
  - `LOG_DIR=./logs`
  - `NOMINATIM_USER_AGENT="cmsi694-weather (you@example.edu)"`
  - `OPEN_METEO_GEOCODING_URL=https://geocoding-api.open-meteo.com/v1/search`
  - `OPEN_METEO_FORECAST_URL=https://api.open-meteo.com/v1/forecast`
  - `NOMINATIM_URL=https://nominatim.openstreetmap.org`
  - `NOMINATIM_MIN_INTERVAL_MS=1000`
- [ ] T009 [P] Create `.markdownlint-cli2.jsonc` (disable MD013 line-length, allow inline HTML `<!-- -->`) and `redocly.yaml` (extends `recommended`; `rules: { info-license: off }`)
- [ ] T010 [P] Create `.github/workflows/ci.yml`:
  - Triggers: `pull_request` and `push` to `main`
  - Environment: Node 24, `npm ci`
  - Steps, in order: `npm run lint`, `npm run typecheck`, `npm run lint:docs`, `npm run lint:api`, `npm test`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `PERF=1 npm run test:e2e -- performance`, `npm run build`, `npm run check:bundle`
  - Upload `playwright-report` on failure
- [ ] T011 [P] Create `.github/pull_request_template.md` with a constitution checklist: tests written first and failing before implementation; separation of concerns respected; docs/ADRs updated; lint, typecheck, and tests pass; reviewer assigned

**Checkpoint**: `npm run lint`, `npm run typecheck`, and `npm test` run (no tests yet, so they pass trivially)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, validation, units, upstream HTTP, logging, the server shell, and the client shell, which every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Test fixtures and harness (needed by all foundational tests)

- [ ] T012 [P] Create upstream fixtures in `tests/fixtures/`:
  - `geocoding-la-ca.json`: Open-Meteo geocoding response for `Los Angeles, California`. Include 1 `PPLA2` entry (`name: "Los Angeles"`, `admin1: "California"`, `country: "United States"`, `country_code: "US"`, `latitude: 34.05223`, `longitude: -118.24368`, `timezone: "America/Los_Angeles"`), 2 `PPLX` entries, and 1 `PRK` and 1 `AIRP` entry.
  - `geocoding-zip-90210.json`: 1 `PPL` Beverly Hills, CA, US.
  - `geocoding-empty.json`: `{}` (no `results` key, which is how the real API answers zero matches).
  - `forecast-full.json`: Open-Meteo forecast with `timezone: "America/Los_Angeles"`, `timezone_abbreviation: "PST"`, `utc_offset_seconds: -28800`, `current: { time: "2026-11-17T15:45", interval: 900, temperature_2m: 22.44, apparent_temperature: 21.17, relative_humidity_2m: 58.4, weather_code: 2, wind_speed_10m: 19.8, wind_direction_10m: 329.6, is_day: 1 }`.
  - `forecast-partial.json`: same, but `apparent_temperature` and `wind_direction_10m` are absent.
  - `forecast-no-time.json`: `current.time` absent.
  - `nominatim-search-tokyo.json`: one settlement, `name: "Tokyo"`, `address: { country: "Japan", country_code: "jp" }`, `lat: "35.6812"`, `lon: "139.7671"`.
- [ ] T013 Create `tests/contract/helpers.ts`. It exports:
  - `createTestApp(overrides?)`: creates a temp `LOG_DIR` via `fs.mkdtemp`, an undici `MockAgent` with `disableNetConnect()`, and calls `buildApp()` from `src/server/app.ts` with config pointing at fake upstream origins.
  - `mockAgent`.
  - `readLogLines(logDir)`: parses JSONL into objects.
  - `validator(schemaName)`: loads `specs/001-location-weather-lookup/contracts/api.openapi.yaml` with `yaml`, sets `doc.$id = 'api.openapi.yaml'`, and registers the **whole document once** via `ajv.addSchema(doc)` on a single `new Ajv2020({ strict: false })` with `addFormats(ajv)`. `strict: false` is needed because OpenAPI keys such as `openapi` and `paths` are not JSON Schema. It returns `ajv.getSchema('api.openapi.yaml#/components/schemas/' + schemaName)`, throwing if that is undefined, so internal links like `'#/components/schemas/Condition'` resolve.
- [ ] T014 [P] Create `tests/component/setup.ts`: import `@testing-library/jest-dom/vitest`, call `cleanup()` after each test, and provide a `localStorage` reset and a `navigator.onLine` setter helper

### Foundational tests (write first; must FAIL)

- [ ] T015 [P] Write `tests/unit/input.test.ts` for `validateQuery(raw)` in `src/shared/input.ts`:
  - `"   "` → `{ ok: false, code: "EMPTY_INPUT" }`
  - 101 chars → `{ ok: false, code: "INPUT_TOO_LONG" }`
  - Exactly 100 chars → ok
  - Returns the trimmed value
  - `isUsZip("90210")` true, `isUsZip("9021")` false, `isUsZip("902101")` false, `isUsZip(" 90210 ")` true after trim, `isUsZip("SW1A 1AA")` false

  Rules, quoted from data-model.md: "Trimmed length 0 → `EMPTY_INPUT`", "Trimmed length > 100 → `INPUT_TOO_LONG`", "`/^\d{5}$/` → ZIP path".
- [ ] T016 [P] Write `tests/unit/units.test.ts` for `src/shared/units.ts`:
  - `formatTemp(22.44, 'metric')` → `"22.4 °C"`
  - `formatTemp(22.44, 'imperial')` → `"72.4 °F"` (°F = °C × 9/5 + 32 on the unrounded value)
  - `formatWind(19.8, 'metric')` → `"19.8 km/h"`
  - `formatWind(19.8, 'imperial')` → `"12.3 mph"` (÷ 1.609344)
  - `formatHumidity(58.4)` → `"58%"`
  - Every formatter returns `null` for `null` input
  - `formatTemp(-50, 'metric')` → `"-50.0 °C"`
  - `defaultUnitsForLocale('en-US')` → `'imperial'`, `('es-US')` → `'imperial'`, `('en-GB')` → `'metric'`, `('en')` → `'metric'`, `('fr-FR')` → `'metric'`

  Per research R11: "imperial if the region subtag of `navigator.language` is `US`, otherwise metric".
- [ ] T017 [P] Write `tests/unit/http.test.ts` for `fetchJson(url, { provider, timeoutMs = 4000, headers?, signal? })` in `src/server/providers/http.ts`, using undici `MockAgent`:
  - 200 JSON → `{ body, call: { provider, status: 200, ms } }`
  - HTTP 500 and HTTP 429 → throws `UpstreamError` with `kind: 'http'` and `call.status` set
  - A reply delayed past `timeoutMs` → `kind: 'timeout'`, `call.status: null`
  - Non-JSON body → `kind: 'malformed'`
  - Connection error → `kind: 'network'`, `call.status: null`
- [ ] T018 [P] Write `tests/unit/requestLog.test.ts` for `createRequestLog({ logDir })` in `src/server/logging/requestLog.ts`:
  - `write(entry)` appends one JSON line to `${logDir}/requests-YYYY-MM-DD.jsonl` (UTC date of `ts`)
  - The directory is created with mode `0700`, the file with mode `0600` (skip mode asserts on win32)
  - The written object has exactly the keys `ts, requestType, query, latitude, longitude, outcome, upstream, durationMs`, with no `ip`, `userAgent`, `headers`, `hostname`, or `pid`
  - Latitude/longitude are written exactly as given (e.g. `34.052235123` is unchanged)

  Constraints, quoted from data-model.md: "`requestType`: `"search"` \| `"zip"` \| `"position"` \| `"weather"`", "`outcome`: `"success"` \| `"not_found"` \| `"invalid_input"` \| `"upstream_error"` \| `"upstream_timeout"`", "`query`: Submitted text for search/zip (≤100 chars after validation)", "**Exact as received**, no rounding".
- [ ] T019 [P] Write `tests/unit/retention.test.ts` for `pruneLogs({ logDir, maxAgeMs = 7 * 86_400_000, intervalMs = 3_600_000, now })` in `src/server/logging/retention.ts`. Rule, quoted from data-model.md: "The file for UTC day D is deleted once `now ≥ D 00:00 UTC + 7 days − retention interval (1 h)`". Tests:
  - For `requests-2026-11-10.jsonl`, `now = 2026-11-16T22:59:59.999Z` → kept
  - `now = 2026-11-16T23:00:00.000Z` → deleted
  - Today's file is always kept
  - Non-matching filenames are untouched
  - Returns the deleted filenames
- [ ] T020 [P] Write `tests/unit/nominatim.test.ts` for `src/server/providers/nominatim.ts` (`createNominatim({ baseUrl, userAgent, minIntervalMs })` with `search(q)` and `reverse(lat, lon)`), using `MockAgent`:
  - Requests send a `User-Agent` header equal to `userAgent`
  - `search` sends `format=jsonv2&addressdetails=1&accept-language=en&featureType=settlement&limit=10`
  - `reverse` sends `format=jsonv2&zoom=10&accept-language=en`
  - With `minIntervalMs: 1000`, two back-to-back calls start ≥ 1000 ms apart (Vitest fake timers): a global queue, not per-visitor
  - Calls return `{ body, call }` like `fetchJson`
- [ ] T021 [P] Write `tests/contract/app.contract.test.ts` using `createTestApp()`:
  - `GET /api/unknown` → 404 JSON
  - Any thrown `AppError('WEATHER_UNAVAILABLE')` maps to HTTP 503 with body exactly `{ "error": { "code": "WEATHER_UNAVAILABLE" } }`, validated by `validator('Error')`
  - `AppError('INVALID_INPUT')` → 400
  - `AppError('LOCATION_NOT_FOUND')` → 404
  - An unexpected `Error` → 503 `WEATHER_UNAVAILABLE` with no stack or message in the body (FR-006)
- [ ] T022 [P] Write `tests/component/api.test.ts` for `src/client/api.ts` (`getJson<T>(path, { signal? })`):
  - Resolves parsed JSON on 200
  - Maps `{ error: { code: "LOCATION_NOT_FOUND" } }` to a thrown `ApiError('LOCATION_NOT_FOUND')`, and `WEATHER_UNAVAILABLE` likewise
  - Any other status or unknown code → `ApiError('WEATHER_UNAVAILABLE')`
  - With `navigator.onLine === false` → `ApiError('OFFLINE')` without calling fetch
  - A fetch `TypeError` → `ApiError('OFFLINE')`
  - Aborts after 10 000 ms (fake timers) → `ApiError('WEATHER_UNAVAILABLE')`

### Foundational implementation

- [ ] T023 Create `src/shared/types.ts` exactly per data-model.md:
  - `Location`: `name: string`; `region: string | null`; `country: string | null`; `countryCode: string | null` ("ISO 3166-1 alpha-2, uppercase"); `latitude: number` ("−90 … 90"); `longitude: number` ("−180 … 180"); `timeZone: string | null`; `displayName: string`; `source: 'search' | 'zip' | 'position'`; `isCoordinateLabel: boolean`
  - `CurrentWeatherObservation`: all measurements `number | null`; `isDay: boolean | null`; `condition: Condition | null`; `observedAt: string`; `timeZone: string`
  - `Condition`: `{ category: 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm'; description: string }`
  - `SearchResult`: `{ query; queryType: 'search' | 'zip'; matches: Location[]; totalMatches: number; refineSuggested: boolean }`
  - `ApiErrorCode = 'INVALID_INPUT' | 'LOCATION_NOT_FOUND' | 'WEATHER_UNAVAILABLE'`
  - `ClientErrorCode = 'EMPTY_INPUT' | 'INPUT_TOO_LONG' | 'LOCATION_NOT_FOUND' | 'WEATHER_UNAVAILABLE' | 'OFFLINE' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE'`
  - `UnitSystem = 'metric' | 'imperial'`
  - `RequestLogEntry`, `UpstreamCall = { provider: 'open-meteo-geocoding' | 'open-meteo-forecast' | 'nominatim'; status: number | null; ms: number }`
- [ ] T024 [P] Implement `src/shared/input.ts` (`validateQuery`, `isUsZip`, `MAX_QUERY_LENGTH = 100`) to pass T015
- [ ] T025 [P] Implement `src/shared/units.ts` (`formatTemp`, `formatWind`, `formatHumidity`, `defaultUnitsForLocale`, `cToF`, `kmhToMph`) to pass T016. Use `toFixed(1)` for temperature and wind and `Math.round` for humidity, applied only after conversion.
- [ ] T026 Implement `src/server/config.ts`: read and validate env vars (`PORT` default 3000, `LOG_DIR` default `./logs`, `NOMINATIM_USER_AGENT` required when `NODE_ENV=production`, `OPEN_METEO_GEOCODING_URL`, `OPEN_METEO_FORECAST_URL`, `NOMINATIM_URL` with defaults from `.env.example`, `NOMINATIM_MIN_INTERVAL_MS` default 1000, `STATIC_DIR` default `dist/client`). Export constants `UPSTREAM_TIMEOUT_MS = 4000` and `REQUEST_BUDGET_MS = 8000`. Export a typed `Config` object.
- [ ] T027 Implement `src/server/providers/http.ts` (`fetchJson`, `UpstreamError` with `kind` and `call`) to pass T017. Use `fetch` from `undici` with `AbortSignal.any([AbortSignal.timeout(timeoutMs), signal])`, and measure `ms` with `performance.now()`.
- [ ] T028 [P] Implement `src/server/logging/requestLog.ts` to pass T018. Use a dedicated `pino` instance with `base: null`, `timestamp: false`, and `messageKey` unused (write the entry object only), destination `pino.destination({ dest, mode: 0o600, mkdir: true })`. Rotate the destination when the UTC date changes, and `fs.mkdir(logDir, { recursive: true, mode: 0o700 })`.
- [ ] T029 [P] Implement `src/server/logging/retention.ts` to pass T019:
  - `pruneLogs`: deletes the file for day D when `now ≥ Date.UTC(D) + maxAgeMs − intervalMs`
  - `scheduleRetention({ logDir, intervalMs = 3_600_000 })`: runs once immediately and then every `intervalMs`, passing the same `intervalMs` to `pruneLogs`, with `unref()` on the timer
- [ ] T030 Implement `src/server/providers/nominatim.ts` to pass T020. A module-level promise-chain queue spaces call starts by ≥ `minIntervalMs`, and each call goes through `fetchJson` with `provider: 'nominatim'`.
- [ ] T031 Implement `src/server/errors.ts` (`AppError(code: ApiErrorCode)`, `httpStatusFor(code)`: `INVALID_INPUT` → 400, `LOCATION_NOT_FOUND` → 404, `WEATHER_UNAVAILABLE` → 503). Implement `src/server/app.ts` with `buildApp({ config, providers?, requestLog? })`:
  - Fastify with `logger: false` and `disableRequestLogging: true`
  - An error handler mapping `AppError` → envelope, Fastify validation errors → `INVALID_INPUT`, and anything else → `WEATHER_UNAVAILABLE`
  - JSON 404 for `/api/*`
  - When `config.staticDir` (default `dist/client`) contains `index.html`, register `@fastify/static` to serve it, with SPA fallback to `index.html` for non-`/api` GETs. This does not depend on `NODE_ENV`, so `npm start` works on every OS shell.

  Must pass T021.
- [ ] T032 Implement `src/server/index.ts`: load config, `buildApp`, `scheduleRetention`, and `listen({ host: '0.0.0.0', port })`. Log a single startup line to stdout with a separate pino logger that never receives request data.
- [ ] T033 [P] Create the client shell in `src/client/`:
  - `src/client/index.html`: `lang="en"`, viewport meta, `<main id="root">`, title "Weather Lookup"
  - `src/client/main.tsx`
  - `src/client/styles/tokens.css`: CSS custom properties for the type scale, spacing scale, radii, and shadows, plus light and dark palettes via `prefers-color-scheme`. Every text/background pair must be ≥ 4.5:1.
  - `src/client/styles/layout.css`: centered column `max-width: 720px`; fact grid `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`; no horizontal overflow at 320 px; `:focus-visible` outline; `prefers-reduced-motion` disables transitions
- [ ] T034 [P] Implement `src/client/api.ts` (`getJson`, `ApiError`) to pass T022. Use `AbortSignal.timeout(10_000)` combined with the caller's signal.
- [ ] T035 [P] Create `src/client/messages.ts` exporting the `ClientErrorCode → copy` map verbatim from ui-contract.md › Messages. Create `src/client/components/Message.tsx` (`role="alert"`; renders the copy; optional `onRetry` renders `<button>Try again</button>`), `src/client/components/Spinner.tsx` (`role="status"` with text "Loading weather…"), and `src/client/components/Attribution.tsx` (no props; always renders "Weather data by Open-Meteo.com" linking to https://open-meteo.com/ and "© OpenStreetMap contributors" linking to https://www.openstreetmap.org/copyright, because Nominatim data can appear via search fallback or position)
- [ ] T036 Create `tests/e2e/fixture-upstreams.ts`. It's a `node:http` server on port 4010 that routes `/geocoding?name=…`, `/forecast?…`, `/nominatim/search?q=…`, and `/nominatim/reverse?…` to fixture files by exact query value through a lookup table (unknown → `geocoding-empty.json` / Nominatim `[]`). It also supports magic queries: `name=__503__` → HTTP 503, `name=__429__` → HTTP 429, and `name=__slow__` → 12 s delay. The `FIXTURE_LATENCY_MS` env var (default `0`) adds that delay to every response, simulating real upstream latency.
- [ ] T037 [P] Write the ADRs for decisions already made, in `docs/adr/` (context, decision, alternatives, consequences), each linking back to research.md:
  - `0001-open-meteo-weather-and-geocoding.md` (R1, R2)
  - `0002-backend-for-frontend.md` (R6)
  - `0003-nominatim-fallback-and-reverse.md` (R3, R4)
  - `0004-exact-coordinate-request-logging.md` (FR-015 clarification; privacy mitigations: 0600, no identity, deletion before 7 days, restricted operator access)
  - `0006-typescript-6-pin.md` (R7)

  This keeps documentation current with the decisions (Constitution III).

**Checkpoint**: All Phase 2 tests pass; `npm run dev` serves an empty shell and `/api/unknown` returns JSON 404

---

## Phase 3: User Story 1 - Look Up Current Weather by Location Name (Priority: P1) 🎯 MVP

**Goal**: A user types a city (optionally region-qualified) or a US ZIP and sees a modern card with every FR-003 fact, plus loading, error, and not-found handling and request logging.

**Independent Test**: Open the app, enter "Los Angeles, California", submit, and confirm a summary for "Los Angeles, California, US" shows temperature, feels like, conditions + icon, humidity, wind (compass + degrees), and observed local time. Searching "Xyzzyqwerty" shows the not-found message.

### Tests for User Story 1 (write first; must FAIL) ⚠️

- [ ] T038 [P] [US1] Write `tests/unit/compass.test.ts` for `toCompass16(deg)` and `formatWindDirection(deg)` in `src/shared/compass.ts`:
  - 0 → `N`, 11.24 → `N`, 11.25 → `NNE`, 330 → `NNW`, 348.75 → `N`, 360 → `N`
  - `formatWindDirection(329.6)` → `"NNW 330°"`; `null` → `null`

  Rule, quoted from data-model.md: "index = `round(deg / 22.5) mod 16` over `N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW`. 360° maps to N."
- [ ] T039 [P] [US1] Write `tests/unit/conditions.test.ts` for `conditionFor(code)` in `src/shared/conditions.ts`. Test one representative code per group: 0 → clear "Clear sky"; 1 → partly-cloudy "Mainly clear"; 2 → partly-cloudy "Partly cloudy"; 3 → cloudy "Overcast"; 45/48 → fog; 51–57 → drizzle; 61–67 and 80–82 → rain; 71–77 and 85–86 → snow; 95–99 → thunderstorm. Unknown 42 → `null`; `null` → `null`.
- [ ] T040 [P] [US1] Write `tests/unit/searchService.test.ts` for `createSearchService({ geocoding, nominatim }).search(rawQuery)` in `src/server/services/searchService.ts`, with providers stubbed by fixtures:
  - `"90210"` calls geocoding with `countryCode=US` and returns `queryType: 'zip'`, `source: 'zip'`
  - `"Los Angeles, California"` with `geocoding-la-ca.json` → exactly 1 match after the filter
  - Filter, quoted from data-model.md: "`feature_code` starting with `PPL`, excluding `PPLX`, `PPLH`, `PPLQ`, and `PPLW`"
  - Dedupe by `(name, region, countryCode)`, keeping the first
  - `displayName` is "Los Angeles, California, US"; the region is skipped when null or equal to the name
  - `totalMatches` counts after filter and dedupe
  - `matches` is at most 5 (provider order in this story; sorting is added in US2)
  - `refineSuggested === totalMatches > 5`
  - Zero Open-Meteo results → calls `nominatim.search` and maps `nominatim-search-tokyo.json` to Location `{ name: "Tokyo", region: null, country: "Japan", countryCode: "JP", timeZone: null }`
  - Zero from both → `AppError('LOCATION_NOT_FOUND')`
  - Any `UpstreamError` → `AppError('WEATHER_UNAVAILABLE')`
  - The returned `calls: UpstreamCall[]` lists every upstream call made
- [ ] T041 [P] [US1] Write `tests/unit/weatherService.test.ts` for `createWeatherService({ forecast }).current(lat, lon)` in `src/server/services/weatherService.ts`:
  - `forecast-full.json` → `{ temperatureC: 22.44, feelsLikeC: 21.17, humidityPct: 58.4, windSpeedKmh: 19.8, windDirectionDeg: 329.6, weatherCode: 2, isDay: true, condition: { category: 'partly-cloudy', description: 'Partly cloudy' }, observedAt: '2026-11-17T15:45:00-08:00', timeZone: 'America/Los_Angeles' }`. Values stay unrounded; `observedAt` is built from `current.time` + `utc_offset_seconds`.
  - `forecast-partial.json` → `feelsLikeC: null`, `windDirectionDeg: null`, other fields present
  - `forecast-no-time.json` → `AppError('WEATHER_UNAVAILABLE')`. Quoted from data-model.md: "A response missing them is treated as `WEATHER_UNAVAILABLE`".
  - The forecast provider is called with `current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day&timezone=auto`
- [ ] T042 [P] [US1] Write `tests/contract/search.contract.test.ts` using `createTestApp()` + `MockAgent`:
  - `GET /api/search?q=Los%20Angeles%2C%20California` → 200, body valid per `validator('SearchResult')`, `matches.length === 1`
  - `q=90210` → 200 with `queryType: 'zip'`
  - `q=Xyzzyqwerty` (geocoding and Nominatim both empty) → 404 `LOCATION_NOT_FOUND`
  - `q=` → 400; `q` of 101 chars → 400
  - Geocoding HTTP 503 → 503 `WEATHER_UNAVAILABLE`; HTTP 429 → 503
  - After each request, exactly one log line exists with the matching `requestType` (`search` or `zip`), `query`, and `outcome`, and an `upstream[]` entry with `provider: 'open-meteo-geocoding'`
- [ ] T043 [P] [US1] Write `tests/contract/weather.contract.test.ts`:
  - `GET /api/weather?lat=34.05223&lon=-118.24368` → 200, valid per `validator('CurrentWeatherObservation')`
  - Partial fixture → 200 with `null`s and still valid
  - `lat=91` → 400; `lon=abc` → 400
  - Forecast timeout (MockAgent `.delay(5000)`) → 503 within 8 s, and the log `outcome: 'upstream_timeout'` has `upstream[0].status === null`
  - The log line has `requestType: 'weather'` and `latitude: 34.05223` exactly
- [ ] T044 [P] [US1] Write `tests/component/WeatherCard.test.tsx` for `<WeatherCard location observation units="metric" />`:
  - `region` named "Current weather for Los Angeles, California, US"
  - Shows "22.4 °C", "21.2 °C", "Partly cloudy" with an `img` named "Partly cloudy", "58%", "19.8 km/h NNW 330°"
  - "Observed" shows "3:45 PM PST" (formatted via `Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })`)
  - With `units="imperial"`: "72.4 °F", "12.3 mph NNW 330°"
  - A `null` feels-like renders "—" with an accessible name of "Feels like: Not available"
  - Extreme values (−50 °C, 150.0 km/h) render without throwing and keep the text
- [ ] T045 [P] [US1] Write `tests/component/App.us1.test.tsx` with `fetch` stubbed:
  - Submitting "Los Angeles, California" shows the spinner ("Loading weather…") and disables "Search", then renders the card from search → weather
  - Submitting "   " shows the `EMPTY_INPUT` alert and a 101-char input shows `INPUT_TOO_LONG`, both without calling fetch
  - 404 → `LOCATION_NOT_FOUND` copy, with the input still enabled and keeping its value
  - 503 → `WEATHER_UNAVAILABLE` copy with "Try again", which repeats the last request
  - A second search replaces the card
  - A double submit triggers only one search request
  - A response with >1 match shows the interim status "Multiple places match. Add a region or country to narrow your search." (replaced in US2)
  - FR-014: after rendering a card, advancing fake timers 15 minutes causes **zero** additional fetch calls
- [ ] T046 [P] [US1] Write `tests/e2e/us1-search.spec.ts` (Playwright, fixture upstreams):
  - "Los Angeles, California" → card heading "Los Angeles, California, US" with all 7 facts visible
  - "90210" → "Beverly Hills, California, US"
  - "Xyzzyqwerty" → not-found alert
  - Loading state visible: delay the browser's weather call with `page.route('**/api/weather**', async (route) => { await new Promise((r) => setTimeout(r, 1000)); await route.continue(); })`, then assert the "Loading weather…" status and disabled "Search" button before the card appears
  - A second search replaces the card

### Implementation for User Story 1

- [ ] T047 [P] [US1] Implement `src/shared/compass.ts` (`toCompass16`, `formatWindDirection`) to pass T038
- [ ] T048 [P] [US1] Implement `src/shared/conditions.ts` (`conditionFor`, covering WMO codes 0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99 with English descriptions) to pass T039
- [ ] T049 [P] [US1] Implement `src/server/providers/openMeteoGeocoding.ts` (`createGeocoding({ baseUrl }).search(name, { countryCode? })`). It calls `${baseUrl}?name=…&count=100&language=en&format=json[&countryCode=US]` through `fetchJson` with `provider: 'open-meteo-geocoding'` and returns `{ results: [] , call }` when the `results` key is absent.
- [ ] T050 [P] [US1] Implement `src/server/providers/openMeteoForecast.ts` (`createForecast({ baseUrl }).current(lat, lon)`). It calls `fetchJson` with the exact `current=` list from T041 and `timezone=auto`, using `provider: 'open-meteo-forecast'`.
- [ ] T051 [US1] Implement `src/server/services/searchService.ts` to pass T040. It validates with `validateQuery` (throwing `AppError('INVALID_INPUT')`) and uses `isUsZip` to pick the ZIP path. It applies the PPL filter, dedupe, `displayName` building, `slice(0, 5)`, and the Nominatim fallback (keeping only results whose `addresstype` is a settlement: `city`, `town`, `village`, `hamlet`, `municipality`, or `province`). It returns `{ result: SearchResult, calls }`.
- [ ] T052 [US1] Implement `src/server/services/weatherService.ts` to pass T041. Missing numeric fields become `null`; `is_day` 1/0 → `true`/`false`; `observedAt` is ISO 8601 with the offset from `utc_offset_seconds`; `condition` comes from `conditionFor`. Missing `current.time` or `timezone` → `AppError('WEATHER_UNAVAILABLE')`. Returns `{ observation, calls }`.
- [ ] T053 [US1] Implement `src/server/routes/search.ts`: `GET /api/search` with a Fastify querystring schema `q: { type: 'string', minLength: 1, maxLength: 100 }` and a response schema from the OpenAPI `SearchResult`. In `finally`, write one `RequestLogEntry` with `requestType` = `result.queryType`, or `isUsZip(q) ? 'zip' : 'search'` on failure. Map `outcome` from success/`AppError`/`UpstreamError.kind`, and record `upstream` = calls and `durationMs`. Enforce `REQUEST_BUDGET_MS` via an `AbortController` passed to providers.
- [ ] T054 [US1] Implement `src/server/routes/weather.ts`: `GET /api/weather` with querystring schema `lat: number −90…90`, `lon: number −180…180`. Log with `requestType: 'weather'` and exact `latitude`/`longitude`. Register both routes in `src/server/app.ts` and inject real providers by default. Must pass T042 and T043.
- [ ] T055 [P] [US1] Create `src/client/icons/ConditionIcon.tsx`: inline SVG per `Condition['category']` with day/night variants keyed by `isDay`; `role="img"` and an `aria-label` equal to `condition.description`; `null` condition renders "—"
- [ ] T056 [P] [US1] Create `src/client/components/FactTile.tsx`: props `label`, `value: string | null`. Renders the label and value; for `null`, renders `—` with `aria-label="{label}: Not available"`.
- [ ] T057 [US1] Create `src/client/components/WeatherCard.tsx` (`<section aria-label="Current weather for {displayName}">`, heading = `displayName`, tiles Temperature / Feels like / Conditions / Humidity / Wind / Observed and `formatTemp`/`formatWind`/`compass.ts`, plus `<Attribution />`) and `src/client/styles/themes.css` (background gradients keyed by `data-condition` × `data-daynight`, all ≥ 4.5:1 text contrast) to pass T044
- [ ] T058 [US1] Create `src/client/components/SearchForm.tsx`: `<form role="search">`, input `type="search"` with `aria-label="Location"`, placeholder "City, region, or US ZIP code", `maxLength={100}`, and a "Search" submit button disabled when `busy`. It calls `onSearch(trimmed)` only after `validateQuery` passes, and otherwise calls `onInvalid(code)`.
- [ ] T059 [US1] Implement `src/client/App.tsx`. The view-state machine from data-model.md has states `idle | loading | showing | error{code}`, plus the interim multi-match status. It handles:
  - search → if 1 match then `/api/weather` → `showing`
  - an in-flight guard against duplicate submits
  - retry of the last request on `WEATHER_UNAVAILABLE`/`OFFLINE`
  - units from `defaultUnitsForLocale(navigator.language)`
  - no timers or auto-refresh (FR-014)

  Must pass T045.
- [ ] T060 [US1] Add `Los Angeles, California`, `90210`, and `Xyzzyqwerty` routes to the lookup table in `tests/e2e/fixture-upstreams.ts` and make T046 pass (`npm run test:e2e -- us1`)

**Checkpoint**: User Story 1 is fully functional, and is the MVP. Run `npm test`, `npm run test:e2e -- us1`, and quickstart scenarios 1–5, 9, 10, 18.

---

## Phase 4: User Story 2 - Choose Between Ambiguous Locations (Priority: P2)

**Goal**: When a search matches several places, show up to 5 labeled options sorted alphabetically by region then country, with a refine prompt when more than 5 match, and fetch weather for the chosen one.

**Independent Test**: Search "Springfield". Confirm up to 5 labeled options appear sorted alphabetically by region then country, select one, and confirm that place's weather is displayed. Then search "Springfield, Illinois" and confirm it resolves directly.

### Tests for User Story 2 (write first; must FAIL) ⚠️

- [ ] T061 [P] [US2] Create `tests/fixtures/geocoding-springfield.json`: ≥ 12 `PPL*` Springfield entries across US states plus at least one each in AU, CA, and JM. Include 2 entries with an identical `(name, admin1, country_code)` to exercise dedupe, one with `admin1` absent, and 2 non-PPL entries. Also create `geocoding-springfield-il.json` with exactly 1 `PPLA` Springfield, Illinois, US.
- [ ] T062 [P] [US2] Write `tests/unit/searchService.sort.test.ts`. With the Springfield fixture, `matches` must be the first 5 after sorting by `region`, then `country`, using `Intl.Collator('en', { sensitivity: 'base' })`; a `null` region sorts after all non-null regions. Also assert `totalMatches` = the deduped count, `refineSuggested: true`, and that the output is deterministic regardless of provider order (shuffle the input). Quoted from FR-004: "sorted alphabetically by region and then by country … When more than 5 places match, System MUST show the first 5 in that order".
- [ ] T063 [P] [US2] Write `tests/contract/search.multi.contract.test.ts`: `GET /api/search?q=Springfield` → 200, valid per `validator('SearchResult')`, `matches.length === 5`, regions are non-decreasing under the same collator, `refineSuggested: true`. `q=Springfield%2C%20Illinois` → `matches.length === 1`.
- [ ] T064 [P] [US2] Write `tests/component/MatchList.test.tsx` for `<MatchList matches totalMatches refineSuggested onSelect />`:
  - `list` named "Matching locations" with one `button` per match, named with the full `displayName`
  - When `refineSuggested`, a `status` reading "Showing 5 of {n} matches. Add a region or country to narrow your search."
  - Enter/Space on a focused button calls `onSelect(location)`
- [ ] T065 [P] [US2] Write `tests/component/App.us2.test.tsx`:
  - A 5-match response renders `MatchList`, not the US1 interim status
  - Selecting an item shows loading, then the card for that exact location (the weather fetch uses its lat/lon)
  - A single match skips the list
  - A new search while the list is shown replaces it
- [ ] T066 [P] [US2] Write `tests/e2e/us2-disambiguate.spec.ts`:
  - "Springfield" → 5 options in alphabetical region order + the refine hint
  - Click the 3rd option → card heading equals that option's name
  - "Springfield, Illinois" → card directly

### Implementation for User Story 2

- [ ] T067 [US2] Update `src/server/services/searchService.ts`: after filter and dedupe, sort with a module-level `Intl.Collator('en', { sensitivity: 'base' })` by `region` (nulls last), then `country` (nulls last), then `slice(0, 5)`. Must pass T062 and T063.
- [ ] T068 [P] [US2] Create `src/client/components/MatchList.tsx` per ui-contract.md › Match list and Refine hint, to pass T064
- [ ] T069 [US2] Update `src/client/App.tsx`: add the `choosing` state (render `MatchList` for 2–5 matches or when `refineSuggested`); on select → `loading` → `/api/weather` → `showing`. Remove the US1 interim multi-match status. Must pass T065.
- [ ] T070 [US2] Add the `Springfield` and `Springfield, Illinois` routes to the lookup table in `tests/e2e/fixture-upstreams.ts` and make T066 pass
- [ ] T071 [P] [US2] Write `docs/adr/0005-alphabetical-disambiguation.md`: the FR-004 clarification, the verified "Los Angeles" → 100 matches consequence, the user's decision to keep the rule, and the region-qualified query path (research R5)

**Checkpoint**: User Stories 1 and 2 both work independently (`npm run test:e2e -- us1 us2`)

---

## Phase 5: User Story 3 - Use My Current Location (Priority: P3)

**Goal**: The "Use my location" control gets the browser position (with permission), labels it with the nearest place name (or coordinates if none), and shows current weather. Denied or unavailable positions show friendly messages.

**Independent Test**: Click "Use my location", grant permission, and confirm weather is shown with a place name. At sea (0, −140), the label is "0.00° N, 140.00° W". With permission denied, the denied message appears and name search still works.

### Tests for User Story 3 (write first; must FAIL) ⚠️

- [ ] T072 [P] [US3] Create fixtures `tests/fixtures/nominatim-reverse-la.json` (`name: "Los Angeles"`, `addresstype: "city"`, `address: { city: "Los Angeles", state: "California", country: "United States", country_code: "us" }`) and `tests/fixtures/nominatim-reverse-none.json` (`{ "error": "Unable to geocode" }`)
- [ ] T073 [P] [US3] Write `tests/unit/coordinates.test.ts` for `formatCoordLabel(lat, lon)` in `src/shared/coordinates.ts`:
  - `(36.5785, -118.2923)` → `"36.58° N, 118.29° W"`
  - `(0, -140)` → `"0.00° N, 140.00° W"`
  - `(-33.8688, 151.2093)` → `"33.87° S, 151.21° E"`

  Rule, quoted from data-model.md: "`|lat|.toFixed(2)° N|S, |lon|.toFixed(2)° E|W`".
- [ ] T074 [P] [US3] Write `tests/unit/positionService.test.ts` for `createPositionService({ nominatim }).describe(lat, lon)`:
  - The LA fixture → Location `{ name: "Los Angeles", region: "California", country: "United States", countryCode: "US", source: "position", isCoordinateLabel: false, timeZone: null }`
  - The none fixture → `{ name: "0.00° N, 140.00° W", displayName: "0.00° N, 140.00° W", region: null, country: null, countryCode: null, isCoordinateLabel: true, source: "position" }`
  - A Nominatim `UpstreamError` (timeout or 5xx) → the same coordinate-label Location, not an error (per the OpenAPI `/position` description)
  - Exact input lat/lon are preserved on the Location
- [ ] T075 [P] [US3] Write `tests/contract/position.contract.test.ts`:
  - `GET /api/position?lat=34.0536923&lon=-118.2427676` → 200, valid per `validator('Location')`
  - At-sea coordinates → 200 with `isCoordinateLabel: true`
  - `lat=-91` → 400
  - The log line has `requestType: 'position'`, `latitude: 34.0536923` and `longitude: -118.2427676` **exactly**, and `upstream[0].provider: 'nominatim'`
- [ ] T076 [P] [US3] Write `tests/component/LocationButton.test.tsx` and `tests/component/useGeolocation.test.tsx` with `navigator.geolocation` stubbed:
  - The button is named "Use my location" and is disabled while `busy`
  - On success, `onPosition({ latitude, longitude })` is called with the raw coords
  - `PERMISSION_DENIED` (code 1) → `onError('PERMISSION_DENIED')`
  - `POSITION_UNAVAILABLE` (2) and `TIMEOUT` (3) → `onError('POSITION_UNAVAILABLE')`
  - Missing `navigator.geolocation` → `POSITION_UNAVAILABLE`
- [ ] T077 [P] [US3] Write `tests/component/App.us3.test.tsx`:
  - Position success → `/api/position` then `/api/weather` → card labeled with the place name
  - A coordinate-label response → card heading "0.00° N, 140.00° W"
  - Permission denied → `PERMISSION_DENIED` alert, and the search input still works
- [ ] T078 [P] [US3] Write `tests/e2e/us3-geolocation.spec.ts`:
  - A context with `permissions: ['geolocation']` and `geolocation: { latitude: 34.0536923, longitude: -118.2427676 }` → card "Los Angeles, California, US"
  - Geolocation `{ latitude: 0, longitude: -140 }` → heading "0.00° N, 140.00° W"
  - A context without the permission → denied alert, then a name search succeeds

### Implementation for User Story 3

- [ ] T079 [P] [US3] Implement `src/shared/coordinates.ts` (`formatCoordLabel`) to pass T073
- [ ] T080 [US3] Implement `src/server/services/positionService.ts` to pass T074. It calls `nominatim.reverse`, maps `address.city ?? town ?? village ?? hamlet ?? municipality ?? name` to `name`, `address.state` to `region`, and `address.country_code.toUpperCase()` to `countryCode`. Any error, missing result, or an `addresstype` that is not a settlement or administrative area → coordinate label. Returns `{ location, calls }`.
- [ ] T081 [US3] Implement `src/server/routes/position.ts`: `GET /api/position` with the same lat/lon schema as `/api/weather`. Log with `requestType: 'position'` and exact `latitude`/`longitude`. Register it in `src/server/app.ts`. Must pass T075.
- [ ] T082 [P] [US3] Implement `src/client/hooks/useGeolocation.ts` (`getCurrentPosition` with `{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }`, mapping error codes per T076) and `src/client/components/LocationButton.tsx`
- [ ] T083 [US3] Update `src/client/App.tsx`: wire `LocationButton` (disabled while `loading`) to position → `/api/position` → `/api/weather` → `showing`. Use the returned Location's `timeZone ?? observation.timeZone` for display. Must pass T077.
- [ ] T084 [US3] Add the reverse routes for (34.0536923, −118.2427676) → LA and (0, −140) → none to `tests/e2e/fixture-upstreams.ts`, and make T078 pass

**Checkpoint**: User Stories 1–3 work independently

---

## Phase 6: User Story 4 - Switch Measurement Units (Priority: P3)

**Goal**: Toggle metric/imperial with instant re-rendering and no network request. The explicit choice persists per device; the default comes from the browser locale.

**Independent Test**: With a summary displayed, toggle units and confirm every temperature and wind value changes unit; reload and confirm the choice persists.

### Tests for User Story 4 (write first; must FAIL) ⚠️

- [ ] T085 [P] [US4] Write `tests/component/useUnits.test.tsx` for `useUnits()` in `src/client/hooks/useUnits.ts`:
  - With no stored value and `navigator.language = 'en-US'` → `{ system: 'imperial', explicit: false }` and nothing written to storage
  - `'en-GB'` → metric
  - `setSystem('metric')` → `{ system: 'metric', explicit: true }` and `localStorage['weather.units'] === 'metric'`
  - A stored `'metric'` overrides an en-US locale
  - An invalid stored value is ignored

  Quoted from data-model.md: "Persisted in `localStorage["weather.units"]` **only when `explicit` is true**. Never sent to the server."
- [ ] T086 [P] [US4] Write `tests/component/UnitToggle.test.tsx`: a `radiogroup` named "Units" with radios "Metric (°C, km/h)" and "Imperial (°F, mph)"; the checked radio reflects the prop; arrow keys move the selection and call `onChange`
- [ ] T087 [P] [US4] Write `tests/component/App.us4.test.tsx`: with a card shown in imperial ("72.4 °F", "12.3 mph NNW 330°"), choose Metric → "22.4 °C", "19.8 km/h NNW 330°", and the fetch call count is unchanged. The toggle works in the `idle` state too.
- [ ] T088 [P] [US4] Write `tests/e2e/us4-units.spec.ts`:
  - en-US context → imperial default
  - Switch to Metric → card values in °C and km/h
  - `page.reload()` → Metric still selected
  - A new context with `locale: 'en-GB'` → metric default (FR-009)

### Implementation for User Story 4

- [ ] T089 [P] [US4] Implement `src/client/hooks/useUnits.ts` to pass T085 (guard `localStorage` access with try/catch for privacy modes)
- [ ] T090 [P] [US4] Implement `src/client/components/UnitToggle.tsx` to pass T086: `<div role="radiogroup" aria-labelledby="units-label">` containing a visible `<span id="units-label">Units</span>` and two native `<input type="radio" name="units">`, each with a `<label>` "Metric (°C, km/h)" / "Imperial (°F, mph)", styled as a segmented control. Do not use `<fieldset>`, whose implicit role is `group`, not `radiogroup`. Native same-name radios provide arrow-key behavior.
- [ ] T091 [US4] Update `src/client/App.tsx` to use `useUnits()` instead of the fixed locale default, render `UnitToggle` in the header, and pass `units` to `WeatherCard`. Must pass T087 and T088.

**Checkpoint**: All user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsiveness, edge cases, documentation, packaging, and final validation across all stories

- [ ] T092 [P] Write `tests/e2e/a11y.spec.ts`: run `@axe-core/playwright` (`withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`) on idle, loading, showing (each of the 8 condition categories × day/night via fixture weather codes), choosing, and every error alert. Assert zero violations with impact `critical` or `serious` (SC-006, FR-012).
- [ ] T093 [P] Write `tests/e2e/responsive.spec.ts`: at 320×640 and 1920×1080, with a card shown and with the match list shown, assert `document.documentElement.scrollWidth <= window.innerWidth` and that every fact tile is visible (FR-011)
- [ ] T094 [P] Write `tests/e2e/keyboard.spec.ts`: using only `keyboard.press`, Tab to the input, type and Enter, Tab to a match and press Enter, Tab to the Units radiogroup and use arrow keys, and Tab to "Use my location". Assert a visible focus indicator (`:focus-visible` outline width > 0) at each step (FR-012).
- [ ] T095 [P] Write `tests/e2e/edge-cases.spec.ts`:
  - `context.setOffline(true)` → `OFFLINE` alert; back online + "Try again" → card
  - `__503__` and `__429__` → `WEATHER_UNAVAILABLE` + "Try again"
  - `__slow__` → alert appears within 10.5 s and no stale card is shown
  - `東京` → "Tokyo, JP"; `São Paulo` → Brazil
  - `SW1A 1AA` → not-found alert
  - 101 chars and whitespace-only → client-side alerts with no `/api` request (assert via `page.on('request')`)
  - An extreme-values fixture (−50 °C, 150 km/h) renders without overflow at 320 px

  Add the needed fixtures and lookup entries to `tests/e2e/fixture-upstreams.ts`.
- [ ] T096 [P] Write `tests/live/sc004.live.test.ts` (opt-in via `npm run test:live`; skipped unless `LIVE=1`) for SC-004 against the US National Weather Service:
  - Use ≥ 20 US cities given as `"City, State"` (e.g. `Los Angeles, California`; `Chicago, Illinois`; `Denver, Colorado`; `Miami, Florida`; `Seattle, Washington`; …).
  - For each city, resolve it via `createSearchService` and get `temperatureC` via `createWeatherService` (real Open-Meteo).
  - Get the reference from `GET https://api.weather.gov/points/{lat},{lon}` (4-decimal coords) → `properties.observationStations` → stations in order → `GET /stations/{id}/observations/latest`. Take the first station whose `properties.temperature.value` is non-null and whose `properties.timestamp` is ≤ 90 minutes old. Send `User-Agent: ${NOMINATIM_USER_AGENT}` and space NWS requests ≥ 250 ms apart.
  - Skip cities with no qualifying station, but require ≥ 20 compared samples.
  - Assert at least 95% of samples have `|app − reference| ≤ 2 °C`, and print a per-city table.

  Quoted from spec SC-004: "within 2 °C (≈4 °F) … in at least 95% of spot checks".
- [ ] T097 [P] Write `tests/e2e/performance.spec.ts` for SC-002 ("95% of lookups … within 3 seconds"):
  - Run in the `chromium-desktop` project only, with the fixture server started with `FIXTURE_LATENCY_MS=300` (a dedicated `webServer` entry on port 4011, selected via a `PERF=1` env switch in `playwright.config.ts`)
  - Perform 40 sequential lookups of "Los Angeles, California", measuring `performance.now()` from the Enter keypress to the card `region` becoming visible
  - Assert the 95th percentile (sorted index `Math.ceil(0.95 * 40) - 1`) is ≤ 3000 ms, and log the p50 and p95
- [ ] T098 [P] Create `Dockerfile`:
  - Build stage: `node:24-slim`, `npm ci`, `npm run build`
  - Runtime stage: `node:24-slim`, `npm ci --omit=dev`, copy `dist`, `ENV NODE_ENV=production LOG_DIR=/data/logs`, `VOLUME /data/logs`, non-root `USER node`, `EXPOSE 3000`, `CMD ["node","dist/server/index.js"]`

  Also create `.dockerignore`.
- [ ] T099 [P] Review `docs/adr/0001`–`0006` against the final implementation, and add new ADRs in `docs/adr/` for any decision made during implementation that is not yet recorded (Constitution III)
- [ ] T100 [P] Update `README.md`:
  - Project purpose and a screenshot placeholder
  - Prerequisites, setup, and run/test commands, linking to `specs/001-location-weather-lookup/quickstart.md`
  - Environment variables table from `.env.example`
  - Data attribution (Open-Meteo CC-BY 4.0; © OpenStreetMap contributors) and Open-Meteo non-commercial terms
  - A "Logs & privacy" section (exact coordinates, 7-day retention, restricted access)
  - A Contributing section requiring branch protection on `main` with 1 approving review and the required CI checks (Constitution V)
- [ ] T101 [P] Create `scripts/check-bundle-size.mjs`: gzip every `dist/client/assets/*.js` with `node:zlib` and fail (exit 1) if the total exceeds 150 KB (plan.md Performance Goals)
- [ ] T102 Run `npm test` and raise the `vitest.config.ts` coverage thresholds to the measured baseline (rounded down to the nearest whole percent), so CI fails if coverage drops (constitution Quality Standards)
- [ ] T103 Run the full gate locally using the `package.json` scripts: `npm run lint && npm run typecheck && npm run lint:docs && npm run lint:api && npm test && npm run test:e2e && npm run build && npm run check:bundle`. Fix any failures in the files they report.
- [ ] T104 Execute every scenario in `specs/001-location-weather-lookup/quickstart.md` (manual table rows 1–20 and the logging verification) against `npm run dev` with live upstreams, and record the pass/fail results in the PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately. T002 → T003; T004–T011 [P] after T002.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
  - T012–T014 (fixtures and harness) → T015–T022 (tests) → T023 → T024–T036; T037 (ADRs) can run at any point in Phase 2
  - Order within implementation: T023 → {T024, T025} ; T026 → T027 → T030 ; T027 → T031 → T032 ; {T028, T029} → T032
- **User Stories (Phases 3–6)**: All depend on Foundational.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

```text
Setup ─► Foundational ─┬─► US1 (P1, MVP) ─┬─► US2 (P2)
                       │                  ├─► US3 (P3)
                       │                  └─► US4 (P3)
                       └─────────────────────────────► Polish (after chosen stories)
```

- **US1 (P1)**: Only Foundational. Provides `WeatherCard`, `SearchForm`, `App.tsx`, the search/weather routes, `compass.ts`, and `conditions.ts`.
- **US2 (P2)**: Needs US1's search route, `App.tsx`, and `WeatherCard`. Modifies `searchService.ts` (sorting) and `App.tsx`.
- **US3 (P3)**: Needs US1's `/api/weather` route, `WeatherCard`, and `App.tsx`. Independent of US2.
- **US4 (P3)**: Needs US1's `WeatherCard` and `App.tsx`. Independent of US2 and US3.
- US2, US3, and US4 touch `src/client/App.tsx` in separate, additive tasks (T069, T083, T091), so if they run in parallel, merge those three tasks one after another.

### Within Each User Story

- Tests are written first and must FAIL (Constitution I)
- Shared pure modules → providers → services → routes → client components → `App.tsx` wiring → e2e fixtures
- Finish a story (checkpoint green) before starting the next priority when working solo

---

## Parallel Opportunities

- **Setup**: T004–T011 (8 tasks) in parallel after T002/T003
- **Foundational**: T012 and T014 in parallel; tests T015–T022 (8 tasks) in parallel; implementations T024/T025, T028/T029, and T033/T034/T035 in parallel; T037 (ADRs) in parallel with everything
- **US1**: tests T038–T046 (9) in parallel; then T047/T048/T049/T050 and T055/T056 in parallel
- **US2**: T061–T066 in parallel; T068 is parallel with T067; T071 (ADR 0005) any time
- **US3**: T072–T078 in parallel; T079 and T082 in parallel
- **US4**: T085–T088 in parallel; T089 and T090 in parallel
- **Polish**: T092–T101 (10 tasks) in parallel
- **Across stories**: after US1, US2, US3, and US4 can proceed in parallel, with `App.tsx` merges done one at a time

### Parallel Example: User Story 1

```bash
# Launch all US1 tests together (they must fail initially):
Task: "T038 tests/unit/compass.test.ts"
Task: "T039 tests/unit/conditions.test.ts"
Task: "T040 tests/unit/searchService.test.ts"
Task: "T041 tests/unit/weatherService.test.ts"
Task: "T042 tests/contract/search.contract.test.ts"
Task: "T043 tests/contract/weather.contract.test.ts"
Task: "T044 tests/component/WeatherCard.test.tsx"
Task: "T045 tests/component/App.us1.test.tsx"
Task: "T046 tests/e2e/us1-search.spec.ts"

# Then the independent US1 modules together:
Task: "T047 src/shared/compass.ts"
Task: "T048 src/shared/conditions.ts"
Task: "T049 src/server/providers/openMeteoGeocoding.ts"
Task: "T050 src/server/providers/openMeteoForecast.ts"
Task: "T055 src/client/icons/ConditionIcon.tsx"
Task: "T056 src/client/components/FactTile.tsx"
```

### Parallel Example: User Story 3

```bash
Task: "T073 tests/unit/coordinates.test.ts"
Task: "T074 tests/unit/positionService.test.ts"
Task: "T075 tests/contract/position.contract.test.ts"
Task: "T076 tests/component/LocationButton.test.tsx + useGeolocation.test.tsx"
Task: "T078 tests/e2e/us3-geolocation.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T011)
2. Phase 2: Foundational (T012–T037). This is critical and blocks all stories.
3. Phase 3: User Story 1 (T038–T060)
4. **STOP and VALIDATE**: `npm test`, `npm run test:e2e -- us1`, and quickstart rows 1–5, 9, 10, 18
5. Open a PR (Constitution IV/V), get a review, merge, and demo

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate → PR (**MVP**)
3. US2 → validate → PR (disambiguation)
4. US3 → validate → PR (geolocation)
5. US4 → validate → PR (units)
6. Polish → full gate (T103) + quickstart (T104) → release

### Parallel Team Strategy

1. The team completes Setup + Foundational together
2. One developer finishes US1 (MVP)
3. Then Developer A takes US2, Developer B US3, and Developer C US4, merging `App.tsx` changes one at a time
4. The team splits the Polish tasks (all [P])

---

## Notes

- [P] tasks touch different files and have no dependency on incomplete tasks
- The [Story] label maps each task to its user story for traceability
- Verify each test fails before implementing (Constitution I). Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently
- Avoid vague tasks, same-file conflicts, and cross-story dependencies that break independence
