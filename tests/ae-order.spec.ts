import { test, expect } from '@playwright/test';

// ---------- Test data (mistake #4: no hardcoded values) ----------
const BASE_URL = 'https://automationexercise.com/';

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

const PRODUCT = { id: 1, name: 'Blue Top' };

// FAKE card details – practice site only. Never use a real card in tests.
const FAKE_CARD = {
  name: 'QA Tester',
  number: '4111111111111111',
  cvc: '123',
  month: '12',
  year: '2030',
};

test.beforeEach(async ({ page }) => {
  await page.route(/googlesyndication|doubleclick|adservice/, route => route.abort());
});

test.describe('Automation Exercise – Place Order', () => {

  test('TC16: place an order after logging in', async ({ page }) => {
    // Step 1: log in
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Automation Exercise/);
    await page.getByRole('link', { name: /Signup \/ Login/ }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.locator('[data-qa="login-email"]').fill(USER.email);
    await page.locator('[data-qa="login-password"]').fill(USER.password);
    await page.locator('[data-qa="login-button"]').click();
    await expect(page.getByText(`Logged in as ${USER.name}`)).toBeVisible();

    // Step 2: open the product and add it to the cart
    await page.goto(`${BASE_URL}product_details/${PRODUCT.id}`);
    await expect(page).toHaveURL(/\/product_details\/1/);
    await expect(page.getByRole('heading', { name: PRODUCT.name })).toBeVisible();
    await page.getByRole('button', { name: /Add to cart/ }).click();
    await page.getByRole('link', { name: 'View Cart' }).click();

    // Step 3: cart page
    await expect(page).toHaveURL(/\/view_cart/);
    await expect(page.getByRole('link', { name: PRODUCT.name })).toBeVisible();
    await page.getByText('Proceed To Checkout').click();

    // Step 4: checkout page
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText('Address Details')).toBeVisible();
    await expect(page.getByText('Review Your Order')).toBeVisible();
    await page.locator('textarea[name="message"]').fill('Automated test order – please ignore');
    await page.getByRole('link', { name: 'Place Order' }).click();

    // Step 5: payment with fake card
    await expect(page).toHaveURL(/\/payment/);
    await page.locator('[data-qa="name-on-card"]').fill(FAKE_CARD.name);
    await page.locator('[data-qa="card-number"]').fill(FAKE_CARD.number);
    await page.locator('[data-qa="cvc"]').fill(FAKE_CARD.cvc);
    await page.locator('[data-qa="expiry-month"]').fill(FAKE_CARD.month);
    await page.locator('[data-qa="expiry-year"]').fill(FAKE_CARD.year);
    await page.locator('[data-qa="pay-button"]').click();

    // Step 6: order confirmed
    await expect(page).toHaveURL(/\/payment_done/);
    await expect(page.locator('[data-qa="order-placed"]')).toHaveText(/Order Placed!/i);
    await expect(page.getByText('Congratulations! Your order has been confirmed!')).toBeVisible();
  });

});