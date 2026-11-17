import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/client/App';

const WEATHER = {
  temperatureC: 15,
  feelsLikeC: 14,
  humidityPct: 70,
  windSpeedKmh: 12,
  windDirectionDeg: 270,
  weatherCode: 3,
  isDay: true,
  condition: { category: 'cloudy', description: 'Overcast' },
  observedAt: '2026-11-17T08:00:00-10:00',
  timeZone: 'Pacific/Honolulu',
};
const LA = {
  name: 'Los Angeles',
  region: 'California',
  country: 'United States',
  countryCode: 'US',
  latitude: 34.0536923,
  longitude: -118.2427676,
  timeZone: null,
  displayName: 'Los Angeles, California, US',
  source: 'position',
  isCoordinateLabel: false,
};
const SEA = {
  name: '0.00° N, 140.00° W',
  region: null,
  country: null,
  countryCode: null,
  latitude: 0,
  longitude: -140,
  timeZone: null,
  displayName: '0.00° N, 140.00° W',
  source: 'position',
  isCoordinateLabel: true,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubAll(position: { latitude: number; longitude: number } | number) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) => {
        if (typeof position === 'number')
          fail({ code: position, message: 'x' } as GeolocationPositionError);
        else ok({ coords: position } as GeolocationPosition);
      },
    },
  });
  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input, 'http://localhost');
    if (url.pathname === '/api/position') {
      return Promise.resolve(json(url.searchParams.get('lat') === '0' ? SEA : LA));
    }
    if (url.pathname === '/api/search') {
      return Promise.resolve(
        json({
          query: 'x',
          queryType: 'search',
          matches: [{ ...LA, source: 'search' }],
          totalMatches: 1,
          refineSuggested: false,
        }),
      );
    }
    return Promise.resolve(json(WEATHER));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
});

describe('App – User Story 3', () => {
  it('shows weather for the current position labeled with the place name', async () => {
    const fetchMock = stubAll({ latitude: 34.0536923, longitude: -118.2427676 });
    render(<App />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use my location' }));
    expect(
      await screen.findByRole('region', {
        name: 'Current weather for Los Angeles, California, US',
      }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([u]) => u)).toEqual([
      '/api/position?lat=34.0536923&lon=-118.2427676',
      '/api/weather?lat=34.0536923&lon=-118.2427676',
    ]);
  });

  it('labels the card with coordinates when no place is found', async () => {
    stubAll({ latitude: 0, longitude: -140 });
    render(<App />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByRole('heading', { name: '0.00° N, 140.00° W' })).toBeInTheDocument();
  });

  it('explains a denied permission and still allows searching', async () => {
    stubAll(1);
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Location access was denied. You can still search by name.',
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Location' }),
      'Los Angeles, California{Enter}',
    );
    expect(await screen.findByRole('region', { name: /Los Angeles/ })).toBeInTheDocument();
  });

  it('explains an unavailable position', async () => {
    stubAll(2);
    render(<App />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't determine your location.",
    );
  });
});
