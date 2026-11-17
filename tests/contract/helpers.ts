import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { parse } from 'yaml';
import { buildApp } from '../../src/server/app.js';
import { loadConfig, type Config } from '../../src/server/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

export const GEO_ORIGIN = 'http://geo.test';
export const FORECAST_ORIGIN = 'http://forecast.test';
export const NOMINATIM_ORIGIN = 'http://nominatim.test';

export function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(root, 'tests/fixtures', name), 'utf8')) as unknown;
}

let previousDispatcher: Dispatcher | undefined;

export function installMockAgent(): MockAgent {
  previousDispatcher ??= getGlobalDispatcher();
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);
  return agent;
}

export async function restoreDispatcher(agent: MockAgent): Promise<void> {
  await agent.close();
  if (previousDispatcher) setGlobalDispatcher(previousDispatcher);
}

export async function testConfig(overrides: Partial<Config> = {}): Promise<Config> {
  const logDir = await mkdtemp(path.join(tmpdir(), 'weather-logs-'));
  return {
    ...loadConfig({
      LOG_DIR: logDir,
      OPEN_METEO_GEOCODING_URL: `${GEO_ORIGIN}/v1/search`,
      OPEN_METEO_FORECAST_URL: `${FORECAST_ORIGIN}/v1/forecast`,
      NOMINATIM_URL: NOMINATIM_ORIGIN,
      NOMINATIM_USER_AGENT: 'contract-tests',
      NOMINATIM_MIN_INTERVAL_MS: '0',
      STATIC_DIR: path.join(logDir, 'no-static'),
    }),
    ...overrides,
  };
}

export async function createTestApp(overrides: Partial<Config> = {}) {
  const mockAgent = installMockAgent();
  const config = await testConfig(overrides);
  const app = await buildApp({ config });
  return { app, config, mockAgent, logDir: config.logDir };
}

export async function readLogLines(logDir: string): Promise<Record<string, unknown>[]> {
  const files = (await readdir(logDir)).filter((f) => f.endsWith('.jsonl')).sort();
  const lines: Record<string, unknown>[] = [];
  for (const f of files) {
    const text = await readFile(path.join(logDir, f), 'utf8');
    for (const line of text.split('\n')) {
      if (line.trim()) lines.push(JSON.parse(line) as Record<string, unknown>);
    }
  }
  return lines;
}

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;
let ajv: Ajv2020 | undefined;

export function validator(schemaName: string): ValidateFunction {
  if (!ajv) {
    const doc = parse(
      readFileSync(
        path.join(root, 'specs/001-location-weather-lookup/contracts/api.openapi.yaml'),
        'utf8',
      ),
    ) as Record<string, unknown>;
    doc['$id'] = 'api.openapi.yaml';
    ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    ajv.addSchema(doc);
  }
  const fn = ajv.getSchema(`api.openapi.yaml#/components/schemas/${schemaName}`);
  if (!fn) throw new Error(`Unknown schema ${schemaName}`);
  return fn;
}
