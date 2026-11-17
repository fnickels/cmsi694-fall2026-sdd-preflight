# Implementation Plan: Location Weather Lookup

**Branch**: `new-feature` (feature directory selected via `.specify/feature.json`; Spec Kit scripts report `001-location-weather-lookup`) | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-location-weather-lookup/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A responsive, accessible single-page web app where a user enters a city name (optionally
qualified with region or country) or a 5-digit US ZIP code, or uses their current
position. The app shows a modern card-based summary of current conditions: temperature,
feels like, condition with icon, humidity, wind speed, and 16-point compass + degrees
direction, with observation time in the location's local time.

Technical approach (see [research.md](./research.md)):

- A TypeScript **backend-for-frontend** on Fastify proxies **Open-Meteo** (geocoding and
  current weather; free, no API key) and **Nominatim** (reverse geocoding and a fallback
  for non-Latin place names).
- The backend normalizes upstream data into a stable contract and writes 7-day request
  logs (FR-015).
- A **React + Vite** client handles unit conversion, display rounding, disambiguation,
  and all UI states.

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`; pinned `~6.0.3` because typescript-eslint 8 supports `<6.1`) on Node.js 24 LTS (server, build, tests); evergreen browsers (client)

**Primary Dependencies**: Fastify 5, @fastify/static 10, pino 10, undici 8 (server; providers use undici's `fetch` so `MockAgent` intercepts reliably, since Node 24 bundles undici 7); React 19, Vite 8 (client)

**Storage**: No database. Request logs are JSON Lines files in `LOG_DIR` (7-day retention, mode 0600). Unit preference is in browser `localStorage`.

**Testing**: Vitest 5 (unit, contract via Fastify `inject`, component via Testing Library + jsdom); Playwright 1.65 + @axe-core/playwright (e2e, a11y, viewports)

**Target Platform**: Linux container running Node 24 with a persistent volume for logs; current desktop and mobile Chrome, Edge, Firefox, Safari

**Project Type**: Web application (SPA + backend-for-frontend in one package)

**Performance Goals**: p95 search-to-render ≤ 3 s on broadband (SC-002); first lookup completed in under 15 s (SC-001); client JS bundle ≤ 150 KB gzipped

**Constraints**:

- Hard 10 s client timeout; server timeouts are 4 s per upstream call and 8 s per request.
- No auto-refresh (FR-014) and no per-visitor rate limit (clarification).
- Nominatim calls go through a global ≤ 1 req/s queue.
- Open-Meteo free tier: < 600/min, 10,000/day, non-commercial, CC-BY attribution.
- WCAG 2.1 AA; usable from 320 to 1920 px.
- Logs contain no user identity.

**Scale/Scope**: Classroom/demo, < 100 concurrent users; 1 screen, 3 API endpoints, 4 user stories, 15 FRs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 ([.specify/memory/constitution.md](../../.specify/memory/constitution.md)).

| Principle / Gate | How this plan complies | Pre-research | Post-design |
|---|---|---|---|
| **I. Test-First (NON-NEGOTIABLE)** | `tasks.md` will order a failing test before each implementation task. Test layers: unit, contract (one per OpenAPI operation and error code), component, and e2e (one per acceptance scenario). Upstreams are mocked so tests are deterministic (research R8). | ✅ | ✅ |
| **II. Separation of Concerns** | `src/shared` (pure domain: types, conversions, formatting, conditions), `src/server/providers/*` (one adapter per upstream), `src/server/services` (orchestration: search, weather, position), `src/server/routes` (HTTP only), and `src/client` (UI; never sees provider details). Dependencies flow inward to `shared`. | ✅ | ✅ |
| **III. Documentation as First-Class** | Contracts in `contracts/`; ADRs in `docs/adr/` seeded from research R1–R12; README covers setup and quickstart. markdownlint and OpenAPI lint (Redocly) run in CI. | ✅ | ✅ |
| **IV. Incremental Delivery** | User stories are independently shippable in priority order: US1 (P1, MVP) → US2 (P2) → US3/US4 (P3). Each increment is a PR with passing gates. | ✅ | ✅ |
| **V. Code Review** | Branch protection on `main`: at least 1 approving review and required CI checks. PR template includes a constitution checklist. | ✅ | ✅ |
| **Quality: Static Analysis** | ESLint 9 (typescript-eslint, jsx-a11y, react-hooks) + Prettier 3 check in CI | ✅ | ✅ |
| **Quality: Automated Tests + coverage** | Vitest coverage (v8) with the first-merge baseline committed in `vitest.config.ts` thresholds; CI fails if coverage drops | ✅ | ✅ |
| **Quality: Type Safety** | `tsc --noEmit` with `strict`, `noUncheckedIndexedAccess`; shared types between client and server | ✅ | ✅ |
| **Quality: Documentation** | Public API (OpenAPI) + ADRs, linted in CI | ✅ | ✅ |

**Result**: All gates pass. No violations, so Complexity Tracking is empty.

Post-design note: the clarified choice to log **exact** coordinates (FR-015) is a
privacy-sensitive, user-approved decision, not a constitution violation. It is mitigated by
0600 file permissions, no identity fields, and 7-day deletion (research R9). It must be
recorded as an ADR.

## Project Structure

### Documentation (this feature)

```text
specs/001-location-weather-lookup/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── api.openapi.yaml #   BFF HTTP API (search, weather, position)
│   └── ui-contract.md   #   Accessible names, messages, display formats
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
package.json             # scripts: dev, build, start, lint, lint:docs, typecheck, test, test:e2e, test:live
tsconfig.json
vite.config.ts           # client build; dev proxy /api → :3000
vitest.config.ts         # projects: unit/contract (node), component (jsdom); coverage thresholds
playwright.config.ts     # chromium; viewports 320×640 and 1920×1080
.env.example             # PORT, LOG_DIR, NOMINATIM_USER_AGENT, OPEN_METEO_GEOCODING_URL, OPEN_METEO_FORECAST_URL, NOMINATIM_URL
Dockerfile
.github/workflows/ci.yml # lint → typecheck → test → e2e → docs lint

src/
├── shared/                  # pure, framework-free; imported by client and server
│   ├── types.ts             # Location, CurrentWeatherObservation, SearchResult, ErrorCode
│   ├── units.ts             # °C↔°F, km/h↔mph, display rounding
│   ├── compass.ts           # 16-point compass + degrees
│   ├── conditions.ts        # WMO code → { category, description }
│   ├── coordinates.ts       # "36.58° N, 118.29° W" formatting
│   └── input.ts             # trim/length validation, ZIP detection
├── server/
│   ├── index.ts             # bootstrap: config, logger, static assets, routes
│   ├── config.ts
│   ├── routes/              # HTTP only: schema validation and status mapping
│   │   ├── search.ts
│   │   ├── weather.ts
│   │   └── position.ts
│   ├── services/            # orchestration and business rules
│   │   ├── searchService.ts     # PPL filter, dedupe, alphabetical sort, top 5, Nominatim fallback
│   │   ├── weatherService.ts    # normalize forecast → observation (nullable fields)
│   │   └── positionService.ts   # reverse geocode → Location or coordinate label
│   ├── providers/           # one adapter per upstream; timeouts; no business logic
│   │   ├── openMeteoGeocoding.ts
│   │   ├── openMeteoForecast.ts
│   │   └── nominatim.ts         # User-Agent and global 1 req/s queue
│   └── logging/
│       ├── requestLog.ts        # RequestLogEntry writer (no identity fields)
│       └── retention.ts         # delete files older than 7 days
└── client/
    ├── index.html
    ├── main.tsx
    ├── App.tsx              # view-state machine (data-model.md)
    ├── api.ts               # typed fetch wrapper, 10 s abort, offline detection
    ├── hooks/               # useUnits (localStorage + locale default), useGeolocation
    ├── components/          # SearchForm, MatchList, WeatherCard, FactTile, UnitToggle, Message, Spinner, Attribution
    ├── icons/               # inline SVG per condition category (day/night)
    └── styles/              # tokens.css, layout.css, themes by condition

tests/
├── unit/                    # src/shared/* and service logic
├── contract/                # one file per OpenAPI operation; upstreams stubbed with MockAgent
├── component/               # React components and states (Testing Library)
├── e2e/                     # Playwright: us1-search, us2-disambiguate, us3-geolocation, us4-units, a11y, responsive
├── live/                    # opt-in SC-004 spot check (excluded from CI gate)
└── fixtures/                # recorded Open-Meteo / Nominatim payloads, incl. partial and error cases

docs/
└── adr/                     # 0001-open-meteo, 0002-bff-architecture, 0003-nominatim-fallback, 0004-exact-coordinate-logging, ...
```

**Structure Decision**: Single package (one `package.json`) containing `src/shared`,
`src/server`, and `src/client`, with tests in `tests/` grouped by layer. A separate
frontend/backend split was rejected for classroom scale (research R6). The `shared` layer
gives client and server one source of truth for contract types and display rules, and
keeps domain logic framework-free and unit-testable (Constitution II).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations, so this section is intentionally empty.
