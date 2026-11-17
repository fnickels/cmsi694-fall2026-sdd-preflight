import { expect, test } from '@playwright/test';

// Only runs with PERF=1 (see playwright.config.ts): fixture upstreams add 300 ms per call.
const RUNS = 40;

test('95% of lookups render within 3 seconds – SC-002', async ({ page }) => {
  await page.goto('/');
  const box = page.getByRole('searchbox', { name: 'Location' });
  const durations: number[] = [];

  for (let i = 0; i < RUNS; i++) {
    await box.fill(i % 2 === 0 ? 'Los Angeles, California' : 'Los Angeles, California ');
    const marker = `run-${i}`;
    await page.evaluate((m) => {
      performance.mark(m);
    }, marker);
    await box.press('Enter');
    await expect(page.getByRole('region', { name: /Los Angeles/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeEnabled();
    durations.push(
      await page.evaluate((m) => {
        const mark = performance.getEntriesByName(m)[0];
        return performance.now() - (mark?.startTime ?? 0);
      }, marker),
    );
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.ceil(0.5 * RUNS) - 1] ?? Infinity;
  const p95 = sorted[Math.ceil(0.95 * RUNS) - 1] ?? Infinity;
  console.log(`SC-002 lookup latency: p50=${p50.toFixed(0)} ms, p95=${p95.toFixed(0)} ms`);
  expect(p95).toBeLessThanOrEqual(3000);
});
