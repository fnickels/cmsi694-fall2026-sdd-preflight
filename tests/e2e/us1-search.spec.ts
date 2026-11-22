import { expect, test } from '@playwright/test';

test.describe('User Story 1 – look up current weather by name', () => {
  test('Los Angeles, California shows a card with all facts', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Location' }).fill('Los Angeles, California');
    await page.getByRole('searchbox', { name: 'Location' }).press('Enter');
    const card = page.getByRole('region', {
      name: 'Current weather for Los Angeles, California, US',
    });
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Los Angeles, California, US' })).toBeVisible();
    for (const label of [
      'Temperature',
      'Feels like',
      'Conditions',
      'Humidity',
      'Wind',
      'Observed',
    ]) {
      await expect(card.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(card).toContainText('NNW 330°');
    await expect(card).toContainText('3:45 PM PST');
    await expect(card.getByRole('img', { name: 'Partly cloudy' })).toBeVisible();
  });

  test('90210 resolves to Beverly Hills', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Location' }).fill('90210');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByRole('region', { name: 'Current weather for Beverly Hills, California, US' }),
    ).toBeVisible();
  });

  test('unknown place shows the not-found message', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Location' }).fill('Xyzzyqwerty');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('alert')).toContainText("We couldn't find that location.");
  });

  test('loading state is visible while weather loads', async ({ page }) => {
    await page.route('**/api/weather**', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.continue();
    });
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Location' }).fill('Los Angeles, California');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('status')).toContainText('Loading weather…');
    await expect(page.getByRole('button', { name: 'Search' })).toBeDisabled();
    await expect(page.getByRole('region', { name: /Los Angeles/ })).toBeVisible();
  });

  test('a second search replaces the card', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('searchbox', { name: 'Location' });
    await box.fill('Los Angeles, California');
    await box.press('Enter');
    await expect(page.getByRole('region', { name: /Los Angeles/ })).toBeVisible();
    await box.fill('90210');
    await box.press('Enter');
    await expect(page.getByRole('region', { name: /Beverly Hills/ })).toBeVisible();
    await expect(page.getByRole('region', { name: /Los Angeles/ })).toHaveCount(0);
  });
});
