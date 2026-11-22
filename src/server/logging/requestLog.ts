import { mkdirSync } from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import type { RequestLogEntry } from '../../shared/types.js';

export interface RequestLog {
  write(entry: RequestLogEntry): Promise<void>;
  close(): Promise<void>;
}

type Destination = ReturnType<typeof pino.destination>;

/** Only these keys are ever written (FR-015: no user identity). */
function sanitize(e: RequestLogEntry): RequestLogEntry {
  return {
    ts: e.ts,
    requestType: e.requestType,
    query: e.query,
    latitude: e.latitude,
    longitude: e.longitude,
    outcome: e.outcome,
    upstream: e.upstream.map((u) => ({ provider: u.provider, status: u.status, ms: u.ms })),
    durationMs: e.durationMs,
  };
}

export function createRequestLog({ logDir }: { logDir: string }): RequestLog {
  let currentDay: string | null = null;
  let dest: Destination | null = null;

  // pino.destination gives us mode-0600 file creation; entries are serialized directly
  // because pino's own formatter cannot omit its level/time keys without producing invalid JSON.
  function destinationFor(day: string): Destination {
    if (day !== currentDay || !dest) {
      dest?.flushSync();
      dest?.end();
      mkdirSync(logDir, { recursive: true, mode: 0o700 });
      dest = pino.destination({
        dest: path.join(logDir, `requests-${day}.jsonl`),
        mode: 0o600,
        sync: true,
      });
      currentDay = day;
    }
    return dest;
  }

  return {
    write(entry) {
      destinationFor(entry.ts.slice(0, 10)).write(`${JSON.stringify(sanitize(entry))}\n`);
      return Promise.resolve();
    },
    close() {
      if (dest) {
        dest.flushSync();
        dest.end();
      }
      dest = null;
      currentDay = null;
      return Promise.resolve();
    },
  };
}
