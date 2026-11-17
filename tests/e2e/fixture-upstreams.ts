/**
 * Local stand-in for Open-Meteo and Nominatim used by Playwright (research R8).
 * The app server's upstream base URLs point here, so e2e tests never touch the internet.
 */
import { createServer, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env['FIXTURE_PORT'] ?? 4010);
const latencyMs = Number(process.env['FIXTURE_LATENCY_MS'] ?? 0);

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(here, '../fixtures', name), 'utf8')) as unknown;
}

/** Geocoding `name` (exact, as sent) → fixture file. */
export const GEOCODING: Record<string, string> = {
  'Los Angeles, California': 'geocoding-la-ca.json',
  '90210': 'geocoding-zip-90210.json',
  Springfield: 'geocoding-springfield.json',
  'Springfield, Illinois': 'geocoding-springfield-il.json',
  'São Paulo': 'geocoding-sao-paulo.json',
  __extreme__: 'geocoding-extreme.json',
};

/** Nominatim search `q` → fixture file. */
export const NOMINATIM_SEARCH: Record<string, string> = {
  東京: 'nominatim-search-tokyo.json',
};

/** Nominatim reverse `lat,lon` → fixture file; unknown positions get "Unable to geocode". */
export const NOMINATIM_REVERSE: Record<string, string> = {
  '34.0536923,-118.2427676': 'nominatim-reverse-la.json',
  '0,-140': 'nominatim-reverse-none.json',
};

/** Forecast `latitude,longitude` → fixture file; anything else gets forecast-full.json. */
export const FORECAST: Record<string, string> = {
  '20,20': 'forecast-extreme.json',
};

/**
 * Generated weather scenarios: searching `__wx_<WMO code>_<day|night>__` resolves to a place at
 * latitude 10 (day) or -10 (night) and longitude = the code, and the forecast for that point
 * reports that code. Used to render every condition theme (a11y tests).
 */
const WX_NAME = /^__wx_(\d{1,2})_(day|night)__$/;

function wxGeocoding(code: number, isDay: boolean) {
  return {
    results: [
      {
        id: 900_000 + code,
        name: `Weather ${code} ${isDay ? 'day' : 'night'}`,
        latitude: isDay ? 10 : -10,
        longitude: code,
        feature_code: 'PPL',
        country_code: 'US',
        country: 'United States',
        admin1: 'Test Region',
        timezone: 'America/Los_Angeles',
      },
    ],
  };
}

function wxForecast(lat: number, lon: number): unknown {
  const base = fixture('forecast-full.json') as { current: Record<string, unknown> };
  return { ...base, current: { ...base.current, weather_code: lon, is_day: lat > 0 ? 1 : 0 } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const q = url.searchParams;
    if (latencyMs > 0) await sleep(latencyMs);

    const magic = q.get('name') ?? q.get('q');
    if (magic === '__503__') {
      send(res, 503, { error: true });
      return;
    }
    if (magic === '__429__') {
      send(res, 429, { error: true, reason: 'rate limited' });
      return;
    }
    if (magic === '__slow__') await sleep(12_000);

    if (url.pathname === '/geocoding') {
      const name = q.get('name') ?? '';
      const wx = WX_NAME.exec(name);
      if (wx) {
        send(res, 200, wxGeocoding(Number(wx[1]), wx[2] === 'day'));
        return;
      }
      const file = GEOCODING[name] ?? 'geocoding-empty.json';
      send(res, 200, fixture(file));
      return;
    }
    if (url.pathname === '/forecast') {
      const lat = Number(q.get('latitude'));
      const lon = Number(q.get('longitude'));
      const key = `${q.get('latitude') ?? ''},${q.get('longitude') ?? ''}`;
      if (Math.abs(lat) === 10 && !FORECAST[key]) {
        send(res, 200, wxForecast(lat, lon));
        return;
      }
      send(res, 200, fixture(FORECAST[key] ?? 'forecast-full.json'));
      return;
    }
    if (url.pathname === '/nominatim/search') {
      const file = NOMINATIM_SEARCH[q.get('q') ?? ''];
      send(res, 200, file ? fixture(file) : []);
      return;
    }
    if (url.pathname === '/nominatim/reverse') {
      const file = NOMINATIM_REVERSE[`${q.get('lat') ?? ''},${q.get('lon') ?? ''}`];
      send(res, 200, file ? fixture(file) : { error: 'Unable to geocode' });
      return;
    }
    send(res, 404, { error: 'unknown fixture route' });
  })();
});

server.listen(port, () => {
  console.log(`fixture upstreams on :${port} (latency ${latencyMs} ms)`);
});
