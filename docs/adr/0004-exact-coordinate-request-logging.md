# ADR 0004: Request logs record exact coordinates, deleted within 7 days

- **Status**: Accepted (product owner decision, spec Clarifications 2026-11-17)
- **Date**: 2026-11-17
- **Sources**: [spec FR-013, FR-015](../../specs/001-location-weather-lookup/spec.md),
  [research R9](../../specs/001-location-weather-lookup/research.md)

## Context

The product owner chose full request logs for troubleshooting, including searched text and
the exact coordinates the browser reports. Exact positions can identify where a person is,
such as their home.

## Decision

Write one JSON line per API request to `${LOG_DIR}/requests-YYYY-MM-DD.jsonl` with only:
`ts, requestType, query, latitude, longitude, outcome, upstream, durationMs`. Mitigations:

- No user identity: no IP, User-Agent, cookies, or headers. Fastify runs with
  `logger: false`, so it writes no request logs of its own. Entries are copied field by field
  from an allow-list and serialized with `JSON.stringify` to a pino file destination.
- Directory mode `0700`, file mode `0600`.
- Hourly cleanup deletes the file for UTC day D once `now ≥ D + 7 days − 1 hour`, so no
  entry is ever older than 7 days.
- Operators with access to `LOG_DIR` must be limited to people who troubleshoot the
  service.

## Alternatives considered

Rounding coordinates (~1 km) or logging only the resolved place name were recommended and
declined.

## Consequences

The logs are personal data for up to 7 days. Backups of `LOG_DIR` would extend retention
and must be avoided.
