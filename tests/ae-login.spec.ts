import { test, expect } from '@playwright/test';

// ---------- Test data (mistake #4: no hardcoded values) ----------
const BASE_URL = 'https://automationexercise.com/';

// Reads a value from .env, or stops with a clear message if it's missing
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from .env`);
  return value;
}

const USER = {
  name: requireEnv('AE_NAME'),
  email: requireEnv('AE_EMAIL'),
  password: requireEnv('AE_PASSWORD'),
};

const WRONG_USER = {
  email: 'nobody.here@example.com',
  password: 'WrongPass123',
};

// ---------- Runs before EVERY test in this file ----------
test.beforeEach(async ({ page }) => {
  // Block the site's ads so they can't pop up and cover buttons
  await page.route(/googlesyndication|doubleclick|adservice/, route => route.abort());

  // Shared steps: home page → Signup / Login page
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Automation Exercise/);
  await page.getByRole('link', { name: /Signup \/ Login/ }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
});

test.describe('Automation Exercise – Login', () => {

  test('TC2: login with correct email and password', async ({ page }) => {
    await page.locator('[data-qa="login-email"]').fill(USER.email);
    await page.locator('[data-qa="login-password"]').fill(USER.password);
    await page.locator('[data-qa="login-button"]').click();

    await expect(page).toHaveURL(BASE_URL);
    await expect(page.getByText(`Logged in as ${USER.name}`)).toBeVisible();
    await expect(page.getByRole('link', { name: /Logout/ })).toBeVisible();
  });

  test('TC3: login with incorrect email and password shows an error', async ({ page }) => {
    await page.locator('[data-qa="login-email"]').fill(WRONG_USER.email);
    await page.locator('[data-qa="login-password"]').fill(WRONG_USER.password);
    await page.locator('[data-qa="login-button"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Your email or password is incorrect!')).toBeVisible();
  });

  test('login with an empty form does not log in', async ({ page }) => {
    await page.locator('[data-qa="login-button"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Logged in as')).not.toBeVisible();
  });

});