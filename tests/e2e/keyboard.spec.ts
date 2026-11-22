import { expect, test, type Locator, type Page } from '@playwright/test';

/** Outline of the focused element, or of the visible label span for (visually hidden) radios. */
async function focusOutlineWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return 0;
    const target = el.matches('input[type="radio"]') ? el.nextElementSibling : el;
    if (!target) return 0;
    const style = getComputedStyle(target);
    return style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth);
  });
}

async function tabTo(page: Page, target: Locator, maxTabs = 20) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) {
      expect(await focusOutlineWidth(page)).toBeGreaterThan(0);
      return;
    }
  }
  throw new Error('target never received focus via Tab');
}

test('the whole flow works with the keyboard alone – FR-012', async ({ page }) => {
  await page.goto('/');

  const box = page.getByRole('searchbox', { name: 'Location' });
  await tabTo(page, box);
  await page.keyboard.type('Springfield');
  await page.keyboard.press('Enter');

  const firstMatch = page
    .getByRole('list', { name: 'Matching locations' })
    .getByRole('button')
    .first();
  await expect(firstMatch).toBeVisible();
  await tabTo(page, firstMatch);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: /Current weather for Springfield/ })).toBeVisible();

  // The chosen match button is gone, so focus restarts at the top of the page. In a native
  // radio group only the checked radio (imperial for en-US) is tabbable; arrow keys switch it.
  const imperial = page.getByRole('radio', { name: 'Imperial (°F, mph)' });
  await tabTo(page, imperial);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'Metric (°C, km/h)' })).toBeChecked();
  await expect(page.getByRole('region', { name: /Current weather for Springfield/ })).toContainText(
    '°C',
  );

  await tabTo(page, page.getByRole('button', { name: 'Use my location' }));
});
