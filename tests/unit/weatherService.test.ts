import { describe, expect, it, vi } from 'vitest';
import { createWeatherService } from '../../src/server/services/weatherService.js';
import type { Forecast } from '../../src/server/providers/openMeteoForecast.js';
import { AppError } from '../../src/server/errors.js';
import { fixture } from '../contract/helpers.js';

const call = { provider: 'open-meteo-forecast' as const, status: 200, ms: 9 };

function forecastReturning(file: string): Forecast {
  return { current: vi.fn(() => Promise.resolve({ body: fixture(file), call })) };
}

describe('weatherService', () => {
  it('normalizes a full response, keeping values unrounded', async () => {
    const forecast = forecastReturning('forecast-full.json');
    const { observation, calls } = await createWeatherService({ forecast }).current(
      34.05223,
      -118.24368,
    );
    expect(forecast.current).toHaveBeenCalledWith(34.05223, -118.24368, undefined);
    expect(observation).toEqual({
      temperatureC: 22.44,
      feelsLikeC: 21.17,
      humidityPct: 58.4,
      windSpeedKmh: 19.8,
      windDirectionDeg: 329.6,
      weatherCode: 2,
      isDay: true,
      condition: { category: 'partly-cloudy', description: 'Partly cloudy' },
      observedAt: '2026-11-17T15:45:00-08:00',
      timeZone: 'America/Los_Angeles',
    });
    expect(calls).toEqual([call]);
  });

  it('sets missing measurements to null', async () => {
    const { observation } = await createWeatherService({
      forecast: forecastReturning('forecast-partial.json'),
    }).current(1, 2);
    expect(observation.feelsLikeC).toBeNull();
    expect(observation.windDirectionDeg).toBeNull();
    expect(observation.temperatureC).toBe(22.44);
  });

  it('treats a missing observation time as WEATHER_UNAVAILABLE', async () => {
    const svc = createWeatherService({ forecast: forecastReturning('forecast-no-time.json') });
    await expect(svc.current(1, 2)).rejects.toMatchObject({ code: 'WEATHER_UNAVAILABLE' });
    await expect(svc.current(1, 2)).rejects.toBeInstanceOf(AppError);
  });

  it('formats positive and half-hour offsets', async () => {
    const body = fixture('forecast-full.json') as Record<string, unknown>;
    const forecast: Forecast = {
      current: () =>
        Promise.resolve({
          body: { ...body, utc_offset_seconds: 19800, timezone: 'Asia/Kolkata' },
          call,
        }),
    };
    const { observation } = await createWeatherService({ forecast }).current(1, 2);
    expect(observation.observedAt).toBe('2026-11-17T15:45:00+05:30');
  });
});
