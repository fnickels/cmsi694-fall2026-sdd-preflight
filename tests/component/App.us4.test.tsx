import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/client/App';

const LA = {
  name: 'Los Angeles',
  region: 'California',
  country: 'United States',
  countryCode: 'US',
  latitude: 34.05223,
  longitude: -118.24368,
  timeZone: 'America/Los_Angeles',
  displayName: 'Los Angeles, California, US',
  source: 'search',
  isCoordinateLabel: false,
};
const WEATHER = {
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
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App – User Story 4', () => {
  it('switches units instantly without another request', async () => {
    const fetchMock = vi.fn((input: string) =>
      Promise.resolve(
        input.startsWith('/api/search')
          ? json({
              query: 'x',
              queryType: 'search',
              matches: [LA],
              totalMatches: 1,
              refineSuggested: false,
            })
          : json(WEATHER),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    const user = userEvent.setup();
    await user.type(
      screen.getByRole('searchbox', { name: 'Location' }),
      'Los Angeles, California{Enter}',
    );
    const card = await screen.findByRole('region', { name: /Los Angeles/ });
    expect(card).toHaveTextContent('72.4 °F');
    expect(card).toHaveTextContent('12.3 mph NNW 330°');
    const calls = fetchMock.mock.calls.length;

    await user.click(screen.getByRole('radio', { name: 'Metric (°C, km/h)' }));
    expect(card).toHaveTextContent('22.4 °C');
    expect(card).toHaveTextContent('19.8 km/h NNW 330°');
    expect(card).not.toHaveTextContent('°F');
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it('allows toggling before any search', async () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<App />);
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Metric (°C, km/h)' }));
    expect(screen.getByRole('radio', { name: 'Metric (°C, km/h)' })).toBeChecked();
    expect(localStorage.getItem('weather.units')).toBe('metric');
  });
});
