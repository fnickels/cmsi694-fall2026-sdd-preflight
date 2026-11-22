# Location Weather Lookup

A modern, accessible web app that shows the **current weather** for a city, a 5-digit US ZIP
code, or your current location. Built spec-first with [Spec Kit](https://github.com/github/spec-kit);
the specification, plan, and task list live in
[`specs/001-location-weather-lookup/`](specs/001-location-weather-lookup/).

<!-- Screenshot placeholder: add docs/screenshot.png once the UI is final. -->

## Features

- Search by city (optionally "City, Region") or US ZIP code; ambiguous names show up to 5
  matches, sorted alphabetically by region then country.
- "Use my location" with friendly messages when permission is denied or unavailable.
- Temperature, feels-like, conditions with icon, humidity, wind speed and compass direction,
  and observation time in the location's local time.
- Metric/imperial toggle, defaulting from your browser locale and remembered on your device.
- Keyboard-only operation, WCAG 2.1 AA contrast, and layouts from 320 px to 1920 px wide.

## Prerequisites

- Node.js 24 LTS and npm 11+
- For end-to-end tests: `npx playwright install --with-deps chromium`

## Setup and run

```bash
npm ci
cp .env.example .env
npm run dev                  # http://localhost:5173 (Vite, proxies /api to the server on :3000)

npm run build && npm start   # production-like, http://localhost:3000
```

With Docker:

```bash
docker build -t weather-lookup .
docker run -p 3000:3000 -e NOMINATIM_USER_AGENT="weather-lookup (you@example.edu)" \
  -v weather-logs:/data/logs weather-lookup
```

## Tests and quality gates

| Command                                      | What it checks                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run lint`                             | ESLint + Prettier                                                               |
| `npm run typecheck`                        | TypeScript (client, server, and tests configs)                                  |
| `npm test`                                 | Unit, contract, and component tests with coverage thresholds                    |
| `npm run test:e2e`                         | Playwright: user stories, accessibility (axe), keyboard, responsive, edge cases |
| `PERF=1 npm run test:e2e -- performance`   | SC-002: 95th-percentile lookup time ≤ 3 s                                      |
| `npm run lint:docs` / `npm run lint:api` | Markdown and OpenAPI contract lint                                              |
| `npm run build && npm run check:bundle`    | Production build and 150 KB gzipped JS budget                                   |
| `LIVE=1 npm run test:live`                 | Optional SC-004 accuracy check against api.weather.gov (needs internet)         |

Manual validation scenarios are in
[quickstart.md](specs/001-location-weather-lookup/quickstart.md).

## Configuration

| Variable                      | Default                                            | Purpose                                                                               |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `PORT`                      | `3000`                                           | HTTP port                                                                             |
| `LOG_DIR`                   | `./logs`                                         | Request log directory (see below)                                                     |
| `NOMINATIM_USER_AGENT`      | development placeholder                            | Identifying User-Agent for Nominatim; **required** when `NODE_ENV=production` |
| `OPEN_METEO_GEOCODING_URL`  | `https://geocoding-api.open-meteo.com/v1/search` | Forward geocoding                                                                     |
| `OPEN_METEO_FORECAST_URL`   | `https://api.open-meteo.com/v1/forecast`         | Current weather                                                                       |
| `NOMINATIM_URL`             | `https://nominatim.openstreetmap.org`            | Reverse geocoding and non-Latin search fallback                                       |
| `NOMINATIM_MIN_INTERVAL_MS` | `1000`                                           | Minimum spacing between Nominatim calls (usage policy)                                |
| `STATIC_DIR`                | `dist/client`                                    | Built client served by the server when present                                        |

## Logs and privacy

Each API request writes one JSON line to `LOG_DIR/requests-YYYY-MM-DD.jsonl` for
troubleshooting (FR-015). Entries contain the searched text and, for "Use my location",
the **exact coordinates** reported by the browser, but never IP addresses, User-Agents,
cookies, or other request headers. Files are created with mode `0600` and deleted
automatically so no entry is kept longer than **7 days**. Restrict access to `LOG_DIR` to
people who operate the service, and do not back it up. See
[ADR 0004](docs/adr/0004-exact-coordinate-request-logging.md).

## Data sources and attribution

- Weather and geocoding: [Open-Meteo.com](https://open-meteo.com/), licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The free API is for
  **non-commercial use** only (under 10,000 calls per day); see the
  [Open-Meteo terms](https://open-meteo.com/en/terms).
- Reverse geocoding and non-Latin place search:
  [Nominatim](https://nominatim.org/), data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
  subject to the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Architecture

A single TypeScript package: `src/shared` (types and display rules), `src/server` (Fastify
backend-for-frontend: providers, services, routes, logging), and `src/client` (React UI).
Decisions are recorded in [`docs/adr/`](docs/adr/); the API contract is
[api.openapi.yaml](specs/001-location-weather-lookup/contracts/api.openapi.yaml).

## Contributing

This project follows its [constitution](.specify/memory/constitution.md):

- Write tests first and see them fail before implementing.
- Open a pull request using the template; every PR needs **at least one approving review**.
- Protect `main` with branch protection requiring that review and the **CI quality-gates
  check** (`.github/workflows/ci.yml`) to pass before merging.
