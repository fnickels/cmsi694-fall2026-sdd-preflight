import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRequestLog } from '../../src/server/logging/requestLog.js';
import type { RequestLogEntry } from '../../src/shared/types.js';

const entry: RequestLogEntry = {
  ts: '2026-11-17T10:00:00.000Z',
  requestType: 'position',
  query: null,
  latitude: 34.052235123,
  longitude: -118.243683456,
  outcome: 'success',
  upstream: [{ provider: 'nominatim', status: 200, ms: 12 }],
  durationMs: 15,
};

describe('createRequestLog', () => {
  it('appends exactly the allowed fields as one JSON line per entry', async () => {
    const base = await mkdtemp(path.join(tmpdir(), 'rl-'));
    const logDir = path.join(base, 'logs');
    const log = createRequestLog({ logDir });
    await log.write(entry);
    await log.write({
      ...entry,
      requestType: 'search',
      query: 'Paris',
      latitude: null,
      longitude: null,
    });
    await log.close();

    const file = path.join(logDir, 'requests-2026-11-17.jsonl');
    const lines = (await readFile(file, 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(Object.keys(first).sort()).toEqual(
      [
        'durationMs',
        'latitude',
        'longitude',
        'outcome',
        'query',
        'requestType',
        'ts',
        'upstream',
      ].sort(),
    );
    for (const forbidden of ['ip', 'userAgent', 'headers', 'hostname', 'pid']) {
      expect(first).not.toHaveProperty(forbidden);
    }
    expect(first['latitude']).toBe(34.052235123);
    expect(first['longitude']).toBe(-118.243683456);

    if (process.platform !== 'win32') {
      expect((await stat(logDir)).mode & 0o777).toBe(0o700);
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }
  });

  it('writes to a file named by the UTC date of ts', async () => {
    const logDir = await mkdtemp(path.join(tmpdir(), 'rl-'));
    const log = createRequestLog({ logDir });
    await log.write({ ...entry, ts: '2026-11-17T23:59:59.000Z' });
    await log.write({ ...entry, ts: '2026-11-18T00:00:01.000Z' });
    await log.close();
    expect((await readdir(logDir)).sort()).toEqual([
      'requests-2026-11-17.jsonl',
      'requests-2026-11-18.jsonl',
    ]);
  });
});
