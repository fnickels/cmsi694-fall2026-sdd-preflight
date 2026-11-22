import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/client/App';

const WEATHER = {
  temperatureC: 10,
  feelsLikeC: 9,
  humidityPct: 50,
  windSpeedKmh: 5,
  windDirectionDeg: 90,
  weatherCode: 0,
  isDay: true,
  condition: { category: 'clear', description: 'Clear sky' },
  observedAt: '2026-11-17T09:00:00-06:00',
  timeZone: 'America/Chicago',
};
const loc = (region: string, lat: number) => ({
  name: 'Springfield',
  region,
  country: 'United States',
  countryCode: 'US',
  latitude: lat,
  longitude: -lat,
  timeZone: 'America/Chicago',
  displayName: `Springfield, ${region}, US`,
  source: 'search',
  isCoordinateLabel: false,
});
const FIVE = ['Colorado', 'Georgia', 'Illinois', 'Massachusetts', 'Missouri'].map((r, i) =>
  loc(r, 30 + i),
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stub() {
  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input, 'http://localhost');
    if (url.pathname === '/api/search') {
      const q = url.searchParams.get('q');
      if (q === 'Springfield')
        return Promise.resolve(
          json({
            query: q,
            queryType: 'search',
            matches: FIVE,
            totalMatches: 14,
            refineSuggested: true,
          }),
        );
      if (q === 'Springfield, Illinois')
        return Promise.resolve(
          json({
            query: q,
            queryType: 'search',
            matches: [FIVE[2]],
            totalMatches: 1,
            refineSuggested: false,
          }),
        );
      return Promise.resolve(json({ error: { code: 'LOCATION_NOT_FOUND' } }, 404));
    }
    return Promise.resolve(json(WEATHER));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function search(text: string) {
  const user = userEvent.setup();
  const box = screen.getByRole('searchbox', { name: 'Location' });
  await user.clear(box);
  await user.type(box, `${text}{Enter}`);
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App – User Story 2', () => {
  it('shows the match list instead of the interim message', async () => {
    stub();
    render(<App />);
    await search('Springfield');
    const list = await screen.findByRole('list', { name: 'Matching locations' });
    expect(within(list).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 5 of 14 matches.');
    expect(screen.queryByText(/Multiple places match/)).not.toBeInTheDocument();
  });

  it('fetches weather for exactly the selected place', async () => {
    const fetchMock = stub();
    render(<App />);
    const user = await search('Springfield');
    await user.click(await screen.findByRole('button', { name: 'Springfield, Massachusetts, US' }));
    expect(
      await screen.findByRole('region', {
        name: 'Current weather for Springfield, Massachusetts, US',
      }),
    ).toBeInTheDocument();
    const weatherCall = fetchMock.mock.calls
      .map(([u]) => u)
      .find((u) => u.startsWith('/api/weather'));
    expect(weatherCall).toBe('/api/weather?lat=33&lon=-33');
    expect(screen.queryByRole('list', { name: 'Matching locations' })).not.toBeInTheDocument();
  });

  it('skips the list for a single match', async () => {
    stub();
    render(<App />);
    await search('Springfield, Illinois');
    expect(
      await screen.findByRole('region', { name: /Springfield, Illinois, US/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Matching locations' })).not.toBeInTheDocument();
  });

  it('replaces the list with a new search', async () => {
    stub();
    render(<App />);
    await search('Springfield');
    await screen.findByRole('list', { name: 'Matching locations' });
    await search('Nowhere');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't find that location.");
    expect(screen.queryByRole('list', { name: 'Matching locations' })).not.toBeInTheDocument();
  });
});
