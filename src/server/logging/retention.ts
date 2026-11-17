import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const DAY_MS = 86_400_000;
const FILE_RE = /^requests-(\d{4})-(\d{2})-(\d{2})\.jsonl$/;

export interface PruneOptions {
  logDir: string;
  now?: Date;
  maxAgeMs?: number;
  intervalMs?: number;
}

/**
 * Deletes the file for UTC day D once now ≥ D 00:00 UTC + maxAge − interval, so that with
 * cleanup every `intervalMs` no entry outlives `maxAgeMs` (FR-015).
 */
export async function pruneLogs({
  logDir,
  now = new Date(),
  maxAgeMs = 7 * DAY_MS,
  intervalMs = 3_600_000,
}: PruneOptions): Promise<string[]> {
  let files: string[];
  try {
    files = await readdir(logDir);
  } catch {
    return [];
  }
  const deleted: string[] = [];
  for (const f of files.sort()) {
    const m = FILE_RE.exec(f);
    if (!m) continue;
    const dayStart = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (now.getTime() >= dayStart + maxAgeMs - intervalMs) {
      await unlink(path.join(logDir, f));
      deleted.push(f);
    }
  }
  return deleted;
}

export function scheduleRetention({
  logDir,
  intervalMs = 3_600_000,
}: {
  logDir: string;
  intervalMs?: number;
}): () => void {
  const run = () => {
    void pruneLogs({ logDir, intervalMs }).catch(() => undefined);
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}
