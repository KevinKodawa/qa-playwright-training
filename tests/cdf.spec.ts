import { test, expect } from '@playwright/test';

test('verify CDF Portal homepage title', async ({ page }) => {
  await page.goto('https://cdreamstream.org/');
  await expect(page).toHaveTitle(/Community Dreams Foundation/);
});

test('login fails with invalid credentials', async ({ page }) => {
  await page.goto('https://cdreamstream.org/');

  // Locator type 1: role-based
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();

  // Locator type 2: label-based
  await page.getByLabel('Email').fill('fake@example.com');

  // Locator type 3: CSS selector
  await page.locator('input[type="password"]').fill('WrongPassword123');

  await page.getByRole('button', { name: 'Sign in' }).click();

  // Assertion: we should still be on the sign-in page
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test.skip('volunteer can log in with valid credentials', async ({ page }) => {
  await page.goto('https://cdreamstream.org/');

  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email').fill(process.env.CDF_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.CDF_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Assertion 1: URL changed to the volunteer dashboard
  await expect(page).toHaveURL(/volunteer#overview/);

  // Assertion 2: the Sign in button is gone
  await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeVisible();
});