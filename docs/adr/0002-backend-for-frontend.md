# ADR 0002: Backend-for-frontend in a single TypeScript package

- **Status**: Accepted
- **Date**: 2026-11-17
- **Sources**: [research R6, R12](../../specs/001-location-weather-lookup/research.md)

## Context

FR-015 requires server-side request logs. Nominatim requires an identifying User-Agent and
an application-wide 1 request/second limit. The UI must not show raw upstream errors
(FR-006).

## Decision

A Fastify server proxies and normalizes all upstream calls behind three endpoints
(`/api/search`, `/api/weather`, `/api/position`; see
[api.openapi.yaml](../../specs/001-location-weather-lookup/contracts/api.openapi.yaml)) and
serves the built React client. The code lives in one package: `src/shared`, `src/server`,
`src/client`.

## Alternatives considered

- Static SPA calling the providers directly: cannot log server-side or enforce the
  Nominatim policy.
- Separate frontend and backend packages: unnecessary overhead at this scale.

## Consequences

- One deployable process (Docker image with a log volume).
- Client and server share types and display rules from `src/shared`.
