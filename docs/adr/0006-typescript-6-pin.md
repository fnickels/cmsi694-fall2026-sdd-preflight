# ADR 0006: Pin TypeScript 6.0 and ESLint 9

- **Status**: Accepted
- **Date**: 2026-11-17
- **Sources**: [research R7](../../specs/001-location-weather-lookup/research.md)

## Context

TypeScript 7.0 and ESLint 10.15 are the latest releases. The constitution requires both
static analysis and type checking to pass on every commit.

## Decision

Pin `typescript@~6.0.3` and `eslint@^9.39`.

- typescript-eslint 8.73 declares a peer range of `typescript >=4.8.4 <6.1.0`.
- eslint-plugin-jsx-a11y 6.10 declares a peer range of `eslint ^3 … ^9`; ESLint 10 fails
  `npm install`.

## Consequences

Revisit when typescript-eslint supports TypeScript 7 and jsx-a11y supports ESLint 10.
