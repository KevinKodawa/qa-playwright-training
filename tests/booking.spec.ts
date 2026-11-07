import { test, expect } from '@playwright/test';

// ---------- Test data (mistake #4: no hardcoded values inside tests) ----------
const BASE_URL = 'https://automationintesting.online/';

const ROOMS = [
  { name: 'Single', price: 100 },
  { name: 'Double', price: 150 },
  { name: 'Suite',  price: 225 },
];

// Every test below checks the URL AND at least one visible element (mistake #5).
// toBeVisible() waits automatically for the page to finish loading (mistake #1).
// All locators are role- or text-based, never auto-generated IDs (mistake #2).

test.describe('Shady Meadows B&B – booking site', () => {

  test('homepage loads and shows the Welcome section', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(BASE_URL);
    await expect(page).toHaveTitle(/Restful-booker-platform demo/);
    await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  });

  test('Book Now button takes you to Our Rooms', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText('Single', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'Book Now', exact: true }).click();
    await expect(page).toHaveURL(/#booking/);
    await expect(page.getByRole('heading', { name: 'Our Rooms' })).toBeVisible();
  });

  test('Our Rooms lists every room with its price', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(BASE_URL);
    for (const room of ROOMS) {
        await expect(page.getByText(room.name, { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(`£${room.price}`)).toBeVisible();
    }
  });

  // ---------- Parked: site bug ----------
  // The reservation page never loads: GET /api/room/{id} returns 500 for every room,
  // and the page shows an endless spinner. Found 2026-11-05. Un-skip once the site is fixed.

  test.skip('reservation page shows image, calendar, features and price', async () => {});

  test.skip('total price = (nights × room price) + cleaning fee + service fee', async () => {});

  test.skip('Reserve Now with valid details shows booking confirmation', async () => {});

  // Negative tests (mistake #3), also blocked by the same bug:
  test.skip('Reserve Now with an empty form shows error messages', async () => {});

  test.skip('Reserve Now with an invalid email shows an error', async () => {});

});