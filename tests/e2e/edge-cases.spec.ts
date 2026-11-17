import { expect, test, type Page } from '@playwright/test';

async function search(page: Page, text: string) {
  const box = page.getByRole('searchbox', { name: 'Location' });
  await box.fill(text);
  await box.press('Enter');
}

test.describe('edge cases', () => {
  test('offline shows a connection message and recovers with Try again', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await context.setOffline(true);
    await search(page, 'Los Angeles, California');
    await expect(page.getByRole('alert')).toContainText('You appear to be offline.');
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('region', { name: /Los Angeles/ })).toBeVisible();
  });

  for (const magic of ['__503__', '__429__']) {
    test(`upstream ${magic} shows weather-unavailable with Try again`, async ({ page }) => {
      await page.goto('/');
      await search(page, magic);
      await expect(page.getByRole('alert')).toContainText('Weather is currently unavailable.');
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    });
  }

  test('a slow upstream fails within 10.5 s and shows no stale card', async ({ page }) => {
    await page.goto('/');
    await search(page, 'Los Angeles, California');
    await expect(page.getByRole('region', { name: /Los Angeles/ })).toBeVisible();
    const started = Date.now();
    await search(page, '__slow__');
    await expect(page.getByRole('alert')).toContainText('Weather is currently unavailable.', {
      timeout: 10_500,
    });
    expect(Date.now() - started).toBeLessThan(10_500);
    await expect(page.getByRole('region', { name: /Current weather for/ })).toHaveCount(0);
  });

  test('non-Latin and accented names resolve', async ({ page }) => {
    await page.goto('/');
    await search(page, '東京');
    await expect(page.getByRole('region', { name: 'Current weather for Tokyo, JP' })).toBeVisible();
    await search(page, 'São Paulo');
    await expect(
      page.getByRole('region', { name: 'Current weather for São Paulo, BR' }),
    ).toBeVisible();
  });

  test('a non-US postal code is not found', async ({ page }) => {
    await page.goto('/');
    await search(page, 'SW1A 1AA');
    await expect(page.getByRole('alert')).toContainText("We couldn't find that location.");
  });

  test('empty and too-long input are rejected without any request', async ({ page }) => {
    const apiRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/')) apiRequests.push(r.url());
    });
    await page.goto('/');
    await search(page, '   ');
    await expect(page.getByRole('alert')).toContainText('Please enter a city or US ZIP code.');
    const box = page.getByRole('searchbox', { name: 'Location' });
    await box.evaluate((el) => {
      el.removeAttribute('maxlength');
    });
    await search(page, 'x'.repeat(101));
    await expect(page.getByRole('alert')).toContainText('100 characters or fewer');
    expect(apiRequests).toEqual([]);
  });

  test('extreme values render without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await page.getByRole('radio', { name: 'Metric (°C, km/h)' }).check();
    await search(page, '__extreme__');
    const card = page.getByRole('region', { name: /Prudhoe Bay/ });
    await expect(card).toContainText('-50.0 °C');
    await expect(card).toContainText('150.0 km/h');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
