import { expect, test } from '@playwright/test';

async function searchLA(page: import('@playwright/test').Page) {
  await page.getByRole('searchbox', { name: 'Location' }).fill('Los Angeles, California');
  await page.getByRole('searchbox', { name: 'Location' }).press('Enter');
  return page.getByRole('region', { name: /Los Angeles/ });
}

test.describe('User Story 4 – switch measurement units', () => {
  test('en-US defaults to imperial; metric choice converts and persists', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('radio', { name: 'Imperial (°F, mph)' })).toBeChecked();
    const card = await searchLA(page);
    await expect(card).toContainText('72.4 °F');

    await page.getByRole('radio', { name: 'Metric (°C, km/h)' }).check();
    await expect(card).toContainText('22.4 °C');
    await expect(card).toContainText('19.8 km/h NNW 330°');

    await page.reload();
    await expect(page.getByRole('radio', { name: 'Metric (°C, km/h)' })).toBeChecked();
  });

  test.describe('British English locale', () => {
    test.use({ locale: 'en-GB' });
    test('defaults to metric (FR-009)', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('radio', { name: 'Metric (°C, km/h)' })).toBeChecked();
    });
  });
});
