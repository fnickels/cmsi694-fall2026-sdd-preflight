# ADR 0005: Alphabetical disambiguation of ambiguous place names

- **Status**: Accepted (product owner decision, spec Clarifications 2026-11-17)
- **Date**: 2026-11-17
- **Sources**: [spec FR-004](../../specs/001-location-weather-lookup/spec.md),
  [research R5](../../specs/001-location-weather-lookup/research.md)

## Context

FR-004 requires at most 5 matches for an ambiguous search. The product owner chose to sort
matches alphabetically by region, then country, and to show the first 5. Population ranking
was recommended and declined.

## Decision

After filtering to current populated places and removing duplicates by
`(name, region, countryCode)`, sort all candidates (up to 100 from Open-Meteo) with
`Intl.Collator('en', { sensitivity: 'base' })` by region, then country, with missing values
last. Return the first 5 and `refineSuggested: true` when more than 5 remain. The UI then
shows "Showing 5 of N matches. Add a region or country to narrow your search."

## Consequences

- Well-known places can be missing from the first 5. Verified 2026-11-17: an unqualified
  "Los Angeles" returns 100 populated places, and California is not among the first 5 by
  region.
- The supported path is a region-qualified search such as "Los Angeles, California" or
  "Springfield, Illinois", which resolves to a single place. User Story 1's acceptance test
  uses that form.
- Results are deterministic regardless of the provider's ordering.
