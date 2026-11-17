import { act, render, screen } from '@testing-library/react';
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
const CHI = {
  ...LA,
  name: 'Chicago',
  region: 'Illinois',
  latitude: 41.85,
  longitude: -87.65,
  timeZone: 'America/Chicago',
  displayName: 'Chicago, Illinois, US',
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

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type Handler = (url: URL) => Response | Promise<Response>;

function stubFetch(handler: Handler) {
  const mock = vi.fn((input: string) =>
    Promise.resolve(handler(new URL(input, 'http://localhost'))),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

function single(loc: typeof LA) {
  return {
    query: loc.name,
    queryType: 'search',
    matches: [loc],
    totalMatches: 1,
    refineSuggested: false,
  };
}

const defaultHandler: Handler = (url) => {
  if (url.pathname === '/api/search') {
    const q = url.searchParams.get('q');
    if (q === 'Los Angeles, California') return json(200, single(LA));
    if (q === 'Chicago, Illinois') return json(200, single(CHI));
    return json(404, { error: { code: 'LOCATION_NOT_FOUND' } });
  }
  if (url.pathname === '/api/weather') return json(200, WEATHER);
  return json(404, {});
};

async function search(text: string) {
  const user = userEvent.setup();
  const box = screen.getByRole('searchbox', { name: 'Location' });
  await user.clear(box);
  await user.type(box, text);
  await user.click(screen.getByRole('button', { name: 'Search' }));
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('App – User Story 1', () => {
  it('searches, shows loading, then the weather card', async () => {
    let release: () => void = () => undefined;
    stubFetch(async (url) => {
      if (url.pathname === '/api/weather') await new Promise<void>((r) => (release = r));
      return defaultHandler(url);
    });
    render(<App />);
    await search('Los Angeles, California');
    expect(await screen.findByRole('status')).toHaveTextContent('Loading weather…');
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    act(() => {
      release();
    });
    expect(
      await screen.findByRole('region', {
        name: 'Current weather for Los Angeles, California, US',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
  });

  it('blocks empty and too-long input without calling fetch', async () => {
    const fetchMock = stubFetch(defaultHandler);
    render(<App />);
    await search('   ');
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a city or US ZIP code.');
    const user = userEvent.setup();
    const box = screen.getByRole('searchbox', { name: 'Location' });
    // maxLength stops typing at 100, so paste-style set the value directly.
    await user.clear(box);
    box.removeAttribute('maxlength');
    await user.type(box, 'x'.repeat(101));
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('alert')).toHaveTextContent('100 characters or fewer');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows not-found and keeps the input usable', async () => {
    stubFetch(defaultHandler);
    render(<App />);
    await search('Xyzzyqwerty');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't find that location.");
    const box = screen.getByRole('searchbox', { name: 'Location' });
    expect(box).toBeEnabled();
    expect(box).toHaveValue('Xyzzyqwerty');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers Try again on WEATHER_UNAVAILABLE and repeats the request', async () => {
    let fail = true;
    const fetchMock = stubFetch((url) => {
      if (url.pathname === '/api/weather' && fail)
        return json(503, { error: { code: 'WEATHER_UNAVAILABLE' } });
      return defaultHandler(url);
    });
    render(<App />);
    const user = await search('Los Angeles, California');
    expect(await screen.findByRole('alert')).toHaveTextContent('Weather is currently unavailable.');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: /Los Angeles/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([u]) => u.startsWith('/api/search'))).toHaveLength(2);
  });

  it('replaces the card on a new search', async () => {
    stubFetch(defaultHandler);
    render(<App />);
    await search('Los Angeles, California');
    await screen.findByRole('region', { name: /Los Angeles/ });
    await search('Chicago, Illinois');
    expect(await screen.findByRole('region', { name: /Chicago/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Los Angeles/ })).not.toBeInTheDocument();
  });

  it('ignores a second submit while loading', async () => {
    let release: () => void = () => undefined;
    const fetchMock = stubFetch(async (url) => {
      if (url.pathname === '/api/search') await new Promise<void>((r) => (release = r));
      return defaultHandler(url);
    });
    render(<App />);
    const user = await search('Los Angeles, California');
    await user.keyboard('{Enter}');
    act(() => {
      release();
    });
    await screen.findByRole('region', { name: /Los Angeles/ });
    expect(fetchMock.mock.calls.filter(([u]) => u.startsWith('/api/search'))).toHaveLength(1);
  });

  it('lets the user choose when several places match', async () => {
    stubFetch((url) =>
      url.pathname === '/api/search'
        ? json(200, {
            query: 'Springfield',
            queryType: 'search',
            matches: [LA, CHI],
            totalMatches: 2,
            refineSuggested: false,
          })
        : defaultHandler(url),
    );
    render(<App />);
    await search('Springfield');
    expect(await screen.findByRole('list', { name: 'Matching locations' })).toBeInTheDocument();
  });

  it('never refreshes automatically (FR-014)', async () => {
    const fetchMock = stubFetch(defaultHandler);
    render(<App />);
    await search('Los Angeles, California');
    await screen.findByRole('region', { name: /Los Angeles/ });
    const before = fetchMock.mock.calls.length;
    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});
