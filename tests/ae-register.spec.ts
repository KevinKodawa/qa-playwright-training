import { test, expect } from '@playwright/test';

// ---------- Test data (mistake #4: no hardcoded values) ----------
const BASE_URL = 'https://automationexercise.com/';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from .env`);
  return value;
}

// The permanent test account from .env (already exists on the site)
const EXISTING_USER = {
  name: requireEnv('AE_NAME'),
  email: requireEnv('AE_EMAIL'),
};

// A brand-new fake user for each run. Date.now() makes the email unique every time.
const NEW_USER = {
  name: 'QA Newbie',
  email: `qa.kk.${Date.now()}@example.com`,
  password: 'Test@12345',
  firstName: 'QA',
  lastName: 'Newbie',
  address: '1 Test Street',
  country: 'United States',
  state: 'Texas',
  city: 'Austin',
  zipcode: '78701',
  mobile: '5550002222',
};

// ---------- Runs before EVERY test in this file ----------
test.beforeEach(async ({ page }) => {
  await page.route(/googlesyndication|doubleclick|adservice/, route => route.abort());
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Automation Exercise/);
  await page.getByRole('link', { name: /Signup \/ Login/ }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'New User Signup!' })).toBeVisible();
});

test.describe('Automation Exercise – Register', () => {

  test('TC1: register a new user, then delete the account', async ({ page }) => {
    // Step 1: name + email
    await page.locator('[data-qa="signup-name"]').fill(NEW_USER.name);
    await page.locator('[data-qa="signup-email"]').fill(NEW_USER.email);
    await page.locator('[data-qa="signup-button"]').click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByText('Enter Account Information')).toBeVisible();

    // Step 2: account details form
    await page.getByLabel('Mr.', { exact: true }).check();
    await page.locator('[data-qa="password"]').fill(NEW_USER.password);
    await page.locator('[data-qa="first_name"]').fill(NEW_USER.firstName);
    await page.locator('[data-qa="last_name"]').fill(NEW_USER.lastName);
    await page.locator('[data-qa="address"]').fill(NEW_USER.address);
    await page.locator('[data-qa="country"]').selectOption(NEW_USER.country);
    await page.locator('[data-qa="state"]').fill(NEW_USER.state);
    await page.locator('[data-qa="city"]').fill(NEW_USER.city);
    await page.locator('[data-qa="zipcode"]').fill(NEW_USER.zipcode);
    await page.locator('[data-qa="mobile_number"]').fill(NEW_USER.mobile);
    await page.locator('[data-qa="create-account"]').click();

    // Step 3: account created → logged in
    await expect(page).toHaveURL(/\/account_created/);
    await expect(page.locator('[data-qa="account-created"]')).toHaveText(/Account Created!/i);
    await page.locator('[data-qa="continue-button"]').click();
    await expect(page.getByText(`Logged in as ${NEW_USER.name}`)).toBeVisible();

    // Step 4: clean up – delete the throwaway account
    await page.getByRole('link', { name: /Delete Account/ }).click();
    await expect(page).toHaveURL(/\/delete_account/);
    await expect(page.locator('[data-qa="account-deleted"]')).toHaveText(/Account Deleted!/i);
  });

  test('TC5: register with an existing email shows an error', async ({ page }) => {
    await page.locator('[data-qa="signup-name"]').fill(EXISTING_USER.name);
    await page.locator('[data-qa="signup-email"]').fill(EXISTING_USER.email);
    await page.locator('[data-qa="signup-button"]').click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByText('Email Address already exist!')).toBeVisible();
  });

  test('signup with an empty form does not continue', async ({ page }) => {
    await page.locator('[data-qa="signup-button"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Enter Account Information')).not.toBeVisible();
  });

});