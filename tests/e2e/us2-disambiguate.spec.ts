import { expect, test } from '@playwright/test';

test.describe('User Story 2 – choose between ambiguous locations', () => {
  test('Springfield lists 5 places alphabetically and the chosen one is shown', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Location' }).fill('Springfield');
    await page.getByRole('searchbox', { name: 'Location' }).press('Enter');
    const list = page.getByRole('list', { name: 'Matching locations' });
    const options = list.getByRole('button');
    await expect(options).toHaveCount(5);
    await expect(options).toHaveText([
      'Springfield, Colorado, US',
      'Springfield, Georgia, US',
      'Springfield, Illinois, US',
      'Springfield, Massachusetts, US',
      'Springfield, Missouri, US',
    ]);
    await expect(page.getByRole('status')).toContainText(
      'Add a region or country to narrow your search.',
    );
    const third = (await options.nth(2).textContent()) ?? '';
    await options.nth(2).click();
    await expect(page.getByRole('region', { name: `Current weather for ${third}` })).toBeVisible();
    await expect(page.getByRole('heading', { name: third })).toBeVisible();
  });

  test('Springfield, Illinois resolves directly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Location' }).fill('Springfield, Illinois');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByRole('region', { name: 'Current weather for Springfield, Illinois, US' }),
    ).toBeVisible();
    await expect(page.getByRole('list', { name: 'Matching locations' })).toHaveCount(0);
  });
});
