# ADR 0001: Open-Meteo for weather and forward geocoding

- **Status**: Accepted
- **Date**: 2026-11-17
- **Sources**: [research R1, R2](../../specs/001-location-weather-lookup/research.md)

## Context

The app needs current conditions (temperature, feels-like, humidity, wind speed and
direction, condition code, observation time in local time) and forward geocoding for place
names and US ZIP codes (FR-001–FR-003). Expected traffic is classroom scale (< 100
concurrent users).

## Decision

Use the Open-Meteo Forecast API (`current=` variables, `timezone=auto`) and the Open-Meteo
Geocoding API (`count=100`, `language=en`; `countryCode=US` for 5-digit ZIP input). Keep
only current populated places (`PPL*`, excluding `PPLX`, `PPLH`, `PPLQ`, `PPLW`).

## Alternatives considered

- OpenWeatherMap and WeatherAPI.com: need API keys (secret management) and have smaller or
  shifting free tiers.
- US National Weather Service: free, but US-only.

## Consequences

- No API key to manage. The free tier is non-commercial, capped at < 600 calls/min and
  10,000/day, and rate-limited per source IP.
- CC-BY 4.0 requires the visible attribution "Weather data by Open-Meteo.com".
- Open-Meteo does not resolve non-Latin scripts (e.g. "東京"); see ADR 0003.
