# Quickstart & Validation Guide: Location Weather Lookup

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) |
**Contracts**: [api.openapi.yaml](./contracts/api.openapi.yaml), [ui-contract.md](./contracts/ui-contract.md)

This guide proves the feature works end to end. Command names are the `package.json`
scripts defined in [plan.md](./plan.md#project-structure). Implementation details belong
in `tasks.md`.

## Prerequisites

- Node.js 24 LTS (`node --version` → `v24.x`) and npm 11+
- Playwright browsers: `npx playwright install --with-deps chromium`
- Outbound HTTPS to `geocoding-api.open-meteo.com`, `api.open-meteo.com`, and
  `nominatim.openstreetmap.org` (only for `dev`, `start`, and `test:live`; all automated tests
  mock upstreams)

## Setup

```bash
npm ci
cp .env.example .env      # LOG_DIR=./logs, PORT=3000, NOMINATIM_USER_AGENT="cmsi694-weather (contact email)"
```

## Automated validation (all must pass, matching the constitution's quality gates)

| Command | Proves |
|---|---|
| `npm run lint` | ESLint + Prettier check (Static Analysis gate) |
| `npm run typecheck` | `tsc --noEmit`, strict (Type Safety gate) |
| `npm test` | Vitest unit + contract + component suites with coverage ≥ baseline |
| `npm run test:e2e` | Playwright user stories 1–4, viewports 320/1920, axe audit (SC-006) |
| `npm run lint:docs` | markdownlint on `specs/` and `docs/` (Documentation gate) |

Expected: zero lint errors, zero type errors, all tests green, no axe violations of
`critical` or `serious` severity.

## Run locally

```bash
npm run dev        # Vite on http://localhost:5173, proxies /api → Fastify on :3000
# or production-like:
npm run build && npm start   # http://localhost:3000
```

## Manual end-to-end scenarios

Run these against `npm run dev` with live upstreams. Each row maps to a spec acceptance scenario.

| # | Action | Expected outcome | Spec |
|---|---|---|---|
| 1 | Enter `Los Angeles, California`, press Enter | Spinner, then a card titled "Los Angeles, California, US" with temperature, feels like, conditions + icon, humidity, wind (e.g., `8.1 mph WSW 250°`), and observed time in Pacific time | US1-1, FR-003 |
| 2 | Search `Springfield, Illinois` while #1 is shown | Card replaced by Springfield. (`Chicago, Illinois` instead lists Chicago, Chicago Ridge, Chicago Heights because Open-Meteo matches name prefixes.) | US1-2 |
| 3 | Double-click Search quickly | Only one request (check the DevTools Network tab); button disabled while loading | US1-3, FR-005 |
| 4 | Search `Xyzzyqwerty` | "We couldn't find that location…" alert; input still focused and editable | US1-4 |
| 5 | Leave a card open for 15+ minutes | Nothing changes (no network requests) | US1-5, FR-014 |
| 6 | Search `Springfield` | List of 5, alphabetical by region; refine hint "Showing 5 of N…" | US2-1, US2-4 |
| 7 | Pick any item from #6 | Weather for that exact place | US2-2 |
| 8 | Search `Springfield, Illinois` | Weather shown directly (single match) | US2-3 |
| 9 | Search `90210` | "Beverly Hills, California, US" | FR-001 |
| 10 | Search `SW1A 1AA` | Not-found alert suggesting a city name | Edge Cases |
| 11 | Search `東京` and `São Paulo` | `東京` shows "Tokyo, JP". `São Paulo` lists 5 Brazilian matches alphabetically by state (the city in São Paulo state is not among the first 5; see ADR 0005) | Edge Cases |
| 12 | "Use my location", allow | Weather labeled with nearest place | US3-1 |
| 13 | DevTools › Sensors › custom location `0, -140` (Pacific Ocean), "Use my location" | Weather labeled `0.00° N, 140.00° W` | US3-2 |
| 14 | "Use my location", block | "Location access was denied…" alert; search still works | US3-3 |
| 15 | Toggle Metric ↔ Imperial | All temps/wind convert instantly, no network request; reload keeps the choice | US4-1, US4-2 |
| 16 | Clear site data, set browser language `en-GB`, reload | Metric by default | FR-009 |
| 17 | DevTools › Network › Offline, search | "You appear to be offline…" + Try again | Edge Cases |
| 18 | Enter 101 characters / only spaces | Length / empty-input alerts, no request sent | Edge Cases |
| 19 | Keyboard only: Tab through, search, choose a match, toggle units | Everything reachable with visible focus | FR-012 |
| 20 | Responsive mode at 320 px | No horizontal scroll; cards stack | FR-011 |

## Logging verification (FR-015)

```bash
tail -n 3 logs/requests-$(date -u +%F).jsonl
```

Expected: one JSON object per API call with the fields in
[data-model.md › RequestLogEntry](./data-model.md#requestlogentry-server-only-fr-015), exact
coordinates for scenario 12, and **no IP or User-Agent fields**. File mode is `-rw-------`.
Retention: `npm run test -- logging-retention` verifies that files older than 7 days are deleted.

## Optional live accuracy check (SC-004)

```bash
LIVE=1 npm run test:live   # hits real Open-Meteo and api.weather.gov; ≥ 20 US cities; passes if ≥ 95% are within 2 °C
```

Not part of the CI gate. Upstream outages make this test fail by design (see research R1).
