import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoSeriousViolations(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    `axe violations in state "${state}"`,
  ).toEqual([]);
}

async function search(page: Page, text: string) {
  const box = page.getByRole('searchbox', { name: 'Location' });
  await box.fill(text);
  await box.press('Enter');
}

/** One representative WMO code per condition category. */
const CATEGORY_CODES: Record<string, number> = {
  clear: 0,
  'partly-cloudy': 2,
  cloudy: 3,
  fog: 45,
  drizzle: 51,
  rain: 61,
  snow: 71,
  thunderstorm: 95,
};

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility (${scheme} color scheme) – SC-006`, () => {
    test.use({ colorScheme: scheme });

    test('idle', async ({ page }) => {
      await page.goto('/');
      await expectNoSeriousViolations(page, 'idle');
    });

    test('loading', async ({ page }) => {
      await page.route('**/api/weather**', async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });
      await page.goto('/');
      await search(page, 'Los Angeles, California');
      await expect(page.getByRole('status')).toContainText('Loading weather…');
      await expectNoSeriousViolations(page, 'loading');
    });

    for (const [category, code] of Object.entries(CATEGORY_CODES)) {
      for (const time of ['day', 'night'] as const) {
        test(`showing ${category} (${time})`, async ({ page }) => {
          await page.goto('/');
          await search(page, `__wx_${code}_${time}__`);
          const card = page.getByRole('region', { name: /Current weather for/ });
          await expect(card).toBeVisible();
          await expect(card).toHaveAttribute('data-condition', category);
          await expect(card).toHaveAttribute('data-daynight', time);
          await expectNoSeriousViolations(page, `showing ${category} ${time}`);
        });
      }
    }

    test('choosing', async ({ page }) => {
      await page.goto('/');
      await search(page, 'Springfield');
      await expect(page.getByRole('list', { name: 'Matching locations' })).toBeVisible();
      await expectNoSeriousViolations(page, 'choosing');
    });

    test('error alerts', async ({ page, context }) => {
      await page.goto('/');
      const states: [string, () => Promise<void>][] = [
        ['EMPTY_INPUT', () => search(page, '   ')],
        ['LOCATION_NOT_FOUND', () => search(page, 'Xyzzyqwerty')],
        ['WEATHER_UNAVAILABLE', () => search(page, '__503__')],
        [
          'PERMISSION_DENIED',
          async () => {
            await context.clearPermissions();
            await page.getByRole('button', { name: 'Use my location' }).click();
          },
        ],
        [
          'OFFLINE',
          async () => {
            await context.setOffline(true);
            await search(page, 'Los Angeles, California');
          },
        ],
      ];
      for (const [code, trigger] of states) {
        await trigger();
        await expect(page.getByRole('alert')).toBeVisible();
        await expectNoSeriousViolations(page, code);
      }
      await context.setOffline(false);
    });
  });
}
