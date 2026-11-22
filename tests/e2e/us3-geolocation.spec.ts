import { expect, test } from '@playwright/test';

test.describe('User Story 3 – use my current location', () => {
  test.describe('permission granted in Los Angeles', () => {
    test.use({
      permissions: ['geolocation'],
      geolocation: { latitude: 34.0536923, longitude: -118.2427676 },
    });
    test('shows weather labeled with the nearest place', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Use my location' }).click();
      await expect(
        page.getByRole('region', { name: 'Current weather for Los Angeles, California, US' }),
      ).toBeVisible();
    });
  });

  test.describe('permission granted at sea', () => {
    test.use({ permissions: ['geolocation'], geolocation: { latitude: 0, longitude: -140 } });
    test('labels the card with coordinates', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Use my location' }).click();
      await expect(page.getByRole('heading', { name: '0.00° N, 140.00° W' })).toBeVisible();
    });
  });

  test.describe('permission denied', () => {
    test.use({ permissions: [], geolocation: { latitude: 0, longitude: 0 } });
    test('shows the denied message and name search still works', async ({ page, context }) => {
      await context.clearPermissions();
      await page.goto('/');
      await page.getByRole('button', { name: 'Use my location' }).click();
      await expect(page.getByRole('alert')).toContainText('Location access was denied.');
      await page.getByRole('searchbox', { name: 'Location' }).fill('Los Angeles, California');
      await page.getByRole('searchbox', { name: 'Location' }).press('Enter');
      await expect(page.getByRole('region', { name: /Los Angeles/ })).toBeVisible();
    });
  });
});
