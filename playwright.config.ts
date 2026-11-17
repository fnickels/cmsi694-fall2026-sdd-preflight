import { defineConfig } from '@playwright/test';

const perf = process.env['PERF'] === '1';
const fixturePort = perf ? 4011 : 4010;
const appPort = perf ? 3001 : 3000;

export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: perf ? [] : ['**/performance.spec.ts'],
  timeout: perf ? 300_000 : 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${appPort}`,
    locale: 'en-US',
  },
  projects: perf
    ? [
        {
          name: 'chromium-desktop',
          use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } },
        },
      ]
    : [
        {
          name: 'chromium-desktop',
          use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } },
        },
        {
          name: 'chromium-mobile',
          use: { browserName: 'chromium', viewport: { width: 320, height: 640 } },
        },
      ],
  webServer: [
    {
      command: 'npx tsx tests/e2e/fixture-upstreams.ts',
      port: fixturePort,
      reuseExistingServer: false,
      env: {
        FIXTURE_PORT: String(fixturePort),
        FIXTURE_LATENCY_MS: perf ? '300' : '0',
      },
    },
    {
      command: 'npm run build && npm start',
      port: appPort,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'production',
        PORT: String(appPort),
        OPEN_METEO_GEOCODING_URL: `http://localhost:${fixturePort}/geocoding`,
        OPEN_METEO_FORECAST_URL: `http://localhost:${fixturePort}/forecast`,
        NOMINATIM_URL: `http://localhost:${fixturePort}/nominatim`,
        LOG_DIR: './test-results/logs',
        NOMINATIM_USER_AGENT: 'e2e',
        NOMINATIM_MIN_INTERVAL_MS: '0',
      },
    },
  ],
});
