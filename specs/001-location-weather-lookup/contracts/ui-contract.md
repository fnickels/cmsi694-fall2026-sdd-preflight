# UI Contract: Location Weather Lookup

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

This contract lists the user-facing elements, accessible names, and messages that
component and end-to-end tests assert against. Test selectors use **accessible roles and
names** (Testing Library / Playwright `getByRole`), not CSS classes.

## Controls

| Element | Role / accessible name | Behavior | Req |
|---|---|---|---|
| Search input | `searchbox`, name "Location" | Placeholder "City, region, or US ZIP code"; max 100 chars | FR-001 |
| Submit | `button`, name "Search" | Disabled while loading | FR-005 |
| Use my location | `button`, name "Use my location" | Requests browser geolocation; disabled while loading | FR-007 |
| Unit toggle | `radiogroup`, name "Units"; radios "Metric (°C, km/h)" and "Imperial (°F, mph)" | Instant re-render; persists explicit choice | FR-008, FR-009 |
| Match list | `list`, name "Matching locations"; each item is a `button` named with the full display name | Up to 5, alphabetical by region then country | FR-004 |
| Refine hint | `status` text: "Showing 5 of {n} matches. Add a region or country to narrow your search." | Shown only when `refineSuggested` | FR-004 |
| Retry | `button`, name "Try again" | Only on `WEATHER_UNAVAILABLE` / `OFFLINE`; repeats the last request | Edge Cases |

The whole flow MUST be operable by keyboard (Tab/Shift+Tab/Enter/Space/arrow keys in the
radiogroup) with a visible focus indicator (FR-012).

## Weather summary card (`region`, name "Current weather for {displayName}")

| Item | Label | Format (examples) |
|---|---|---|
| Location heading | — | `Springfield, Illinois, US` or `36.58° N, 118.29° W` |
| Temperature | "Temperature" | `72.4 °F` / `22.4 °C` |
| Feels like | "Feels like" | `70.1 °F` |
| Condition | "Conditions" | icon (`img`, name = description) + "Partly cloudy" |
| Humidity | "Humidity" | `58%` |
| Wind | "Wind" | `12.3 mph NNW 330°` |
| Observed | "Observed" | `3:45 PM PST` (location's local time, `Intl.DateTimeFormat` with `timeZone`) |
| Attribution | — | "Weather data by Open-Meteo.com" and "© OpenStreetMap contributors" (always shown) |

**Missing value** (any item above except Location/Observed): visible text `—` with an
accessible name of "{Label}: Not available".

## Messages (`alert` role, distinct per code — FR-006, SC-005)

| Code | Copy |
|---|---|
| `EMPTY_INPUT` | "Please enter a city or US ZIP code." |
| `INPUT_TOO_LONG` | "That's a bit long — please use 100 characters or fewer." |
| `LOCATION_NOT_FOUND` | "We couldn't find that location. Try a city name, or add a region or country." |
| `WEATHER_UNAVAILABLE` | "Weather is currently unavailable. Please try again." + Try again |
| `OFFLINE` | "You appear to be offline. Check your connection and try again." + Try again |
| `PERMISSION_DENIED` | "Location access was denied. You can still search by name." |
| `POSITION_UNAVAILABLE` | "We couldn't determine your location. You can still search by name." |

Messages never include HTTP status codes, provider names, or stack traces. After any message,
the search input stays enabled and keeps its value. Recovery never needs a page reload.

## Loading

A `status` region announces "Loading weather…" with a visible spinner. Controls are
disabled until the request finishes, fails, or is aborted at 10 s.

## Visual design tokens (FR-010, FR-011, FR-012)

- Layout: single centered column, max width 720 px. Fact cards in a CSS Grid with
  `repeat(auto-fit, minmax(140px, 1fr))`. No horizontal scroll from 320 to 1920 px.
- Background gradient keyed to `condition.category` × `isDay`. All text/background pairs
  must meet a WCAG 2.1 AA contrast ratio of at least 4.5:1, or 3:1 for large text and
  icons. This is verified by axe in e2e tests.
- Respects `prefers-reduced-motion` (no animated transitions) and `prefers-color-scheme`.
