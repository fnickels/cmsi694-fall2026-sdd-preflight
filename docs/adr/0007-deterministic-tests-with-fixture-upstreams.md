# ADR 0007: Deterministic tests against local fake upstreams

- **Status**: Accepted
- **Date**: 2026-11-17
- **Sources**: [research R8](../../specs/001-location-weather-lookup/research.md),
  [tasks Phase 2](../../specs/001-location-weather-lookup/tasks.md)

## Context

The app depends on three third-party services. During planning, Open-Meteo's forecast
endpoint was unreachable from the development machine while its geocoding endpoint worked.
Tests that call real services would fail for reasons unrelated to the code. The constitution
requires every commit to pass the automated test suite.

## Decision

- Unit and contract tests stub upstream HTTP with an undici `MockAgent`. Providers import
  `fetch` from the `undici` package (not Node's bundled copy) so the mock intercepts it.
- End-to-end tests start the real built server with its upstream base URLs pointed at
  `tests/e2e/fixture-upstreams.ts`, a local HTTP server that replays recorded payloads and
  simulates failures (`__503__`, `__429__`, `__slow__`), latency (`FIXTURE_LATENCY_MS`), and
  every weather condition (`__wx_<code>_<day|night>__`).
- Browser-side interception (`page.route`) is used only to delay or break the browser's own
  `/api` calls.
- Accuracy against the real world (SC-004) is an opt-in live test, outside the CI gate.

## Consequences

- CI never depends on third-party uptime or rate limits.
- Fixture payloads must be refreshed if the providers change their response formats; the
  opt-in live test is the early warning.
