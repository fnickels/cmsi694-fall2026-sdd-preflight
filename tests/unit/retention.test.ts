import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pruneLogs } from '../../src/server/logging/retention.js';

async function dirWith(files: string[]): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'ret-'));
  for (const f of files) await writeFile(path.join(dir, f), '{}\n');
  return dir;
}

describe('pruneLogs', () => {
  const old = 'requests-2026-11-10.jsonl';

  it('keeps day D one millisecond before D + 7 days − 1 hour', async () => {
    const logDir = await dirWith([old]);
    const deleted = await pruneLogs({ logDir, now: new Date('2026-11-16T22:59:59.999Z') });
    expect(deleted).toEqual([]);
    expect(await readdir(logDir)).toEqual([old]);
  });

  it('deletes day D at exactly D + 7 days − 1 hour', async () => {
    const logDir = await dirWith([old]);
    const deleted = await pruneLogs({ logDir, now: new Date('2026-11-16T23:00:00.000Z') });
    expect(deleted).toEqual([old]);
    expect(await readdir(logDir)).toEqual([]);
  });

  it("always keeps today's file and ignores other filenames", async () => {
    const logDir = await dirWith(['requests-2026-11-17.jsonl', 'notes.txt', 'requests-bad.jsonl']);
    const deleted = await pruneLogs({ logDir, now: new Date('2026-11-17T23:59:00.000Z') });
    expect(deleted).toEqual([]);
    expect((await readdir(logDir)).sort()).toEqual(
      ['notes.txt', 'requests-2026-11-17.jsonl', 'requests-bad.jsonl'].sort(),
    );
  });

  it('respects custom maxAgeMs and intervalMs', async () => {
    const logDir = await dirWith(['requests-2026-11-16.jsonl']);
    const deleted = await pruneLogs({
      logDir,
      now: new Date('2026-11-17T00:00:00.000Z'),
      maxAgeMs: 86_400_000,
      intervalMs: 0,
    });
    expect(deleted).toEqual(['requests-2026-11-16.jsonl']);
  });

  it('returns [] when the directory does not exist', async () => {
    await expect(
      pruneLogs({ logDir: path.join(tmpdir(), 'does-not-exist-xyz'), now: new Date() }),
    ).resolves.toEqual([]);
  });
});
