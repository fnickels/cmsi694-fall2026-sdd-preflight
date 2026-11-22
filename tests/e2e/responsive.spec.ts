import { expect, test, type Page } from '@playwright/test';

// Runs in both Playwright projects: chromium-desktop (1920×1080) and chromium-mobile (320×640).

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function search(page: Page, text: string) {
  const box = page.getByRole('searchbox', { name: 'Location' });
  await box.fill(text);
  await box.press('Enter');
}

test.describe('responsive layout – FR-011', () => {
  test('weather card fits without horizontal scroll and shows every fact', async ({ page }) => {
    await page.goto('/');
    await search(page, 'Los Angeles, California');
    const card = page.getByRole('region', { name: /Los Angeles/ });
    await expect(card).toBeVisible();
    for (const label of [
      'Temperature',
      'Feels like',
      'Conditions',
      'Humidity',
      'Wind',
      'Observed',
    ]) {
      const tile = card.locator('.fact', { hasText: label });
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toBeVisible();
    }
    await expectNoHorizontalScroll(page);
  });

  test('match list fits without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await search(page, 'Springfield');
    await expect(page.getByRole('list', { name: 'Matching locations' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
