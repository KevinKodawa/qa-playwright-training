import { test, expect } from '@playwright/test';

// Day 5 – API tests for https://automationexercise.com/api_list
// KEY LESSON: this API returns HTTP 200 for almost everything.
// The REAL result is in the JSON body's "responseCode", so we check both.

const API = 'https://automationexercise.com/api';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

// Unique email for every run, so we never collide with other people's data
function uniqueEmail(): string {
  return `kevin.api.${Date.now()}.${Math.floor(Math.random() * 1000)}@example.com`;
}

// Test data object: the 17 fields createAccount needs
function newAccount(email: string) {
  return {
    name: 'Temp Tester', email, password: 'TempPass123', title: 'Mr',
    birth_date: '15', birth_month: 'June', birth_year: '1995',
    firstname: 'Temp', lastname: 'Tester', company: 'QA Training',
    address1: '123 Test Street', address2: 'Suite 1', country: 'United States',
    zipcode: '73301', state: 'Texas', city: 'Austin', mobile_number: '5125550100',
  };
}

test.describe('Products and brands', () => {
  test('GET productsList returns products with the expected fields', async ({ request }) => {
    const response = await request.get(`${API}/productsList`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(body.products.length).toBeGreaterThan(0);
    for (const product of body.products) {
      expect(typeof product.id).toBe('number');
      expect(typeof product.name).toBe('string');
      expect(product.price).toMatch(/^Rs\. \d+$/);
      expect(typeof product.brand).toBe('string');
      expect(typeof product.category.category).toBe('string');
      expect(typeof product.category.usertype.usertype).toBe('string');
    }
  });

  test('POST productsList is rejected (405 hidden behind HTTP 200)', async ({ request }) => {
    const response = await request.post(`${API}/productsList`);
    expect(response.status()).toBe(200); // BUG: should be 405
    const body = await response.json();
    expect(body.responseCode).toBe(405);
    expect(body.message).toBe('This request method is not supported.');
  });

  test('GET brandsList returns brands', async ({ request }) => {
    const body = await (await request.get(`${API}/brandsList`)).json();
    expect(body.responseCode).toBe(200);
    expect(body.brands.length).toBeGreaterThan(0);
    for (const brand of body.brands) {
      expect(typeof brand.id).toBe('number');
      expect(typeof brand.brand).toBe('string');
    }
  });

  test('PUT brandsList is rejected with 405', async ({ request }) => {
    const body = await (await request.put(`${API}/brandsList`)).json();
    expect(body.responseCode).toBe(405);
  });
});

test.describe('Search', () => {
  test('searching "top" returns only matching products', async ({ request }) => {
    const response = await request.post(`${API}/searchProduct`, {
      multipart: { search_product: 'top' },
    });
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(body.products.length).toBeGreaterThan(0);
    for (const product of body.products) {
      // Search matches the name OR the category (e.g. "Tops & Shirts")
      const text = `${product.name} ${product.category.category}`.toLowerCase();
      expect(text).toContain('top');
    }
  });

  test('search without the search_product field gives 400', async ({ request }) => {
    const body = await (await request.post(`${API}/searchProduct`)).json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe('Bad request, search_product parameter is missing in POST request.');
  });
});

test.describe('verifyLogin', () => {
  test('valid user exists', async ({ request }) => {
    const body = await (await request.post(`${API}/verifyLogin`, {
      multipart: { email: requireEnv('AE_EMAIL'), password: requireEnv('AE_PASSWORD') },
    })).json();
    expect(body.responseCode).toBe(200);
    expect(body.message).toBe('User exists!');
  });

  test('missing email gives 400', async ({ request }) => {
    const body = await (await request.post(`${API}/verifyLogin`, {
      multipart: { password: 'anything' },
    })).json();
    expect(body.responseCode).toBe(400);
  });

  test('DELETE method gives 405', async ({ request }) => {
    const body = await (await request.delete(`${API}/verifyLogin`)).json();
    expect(body.responseCode).toBe(405);
  });

  test('unknown email and wrong password give the SAME 404 (no user enumeration)', async ({ request }) => {
    const unknown = await (await request.post(`${API}/verifyLogin`, {
      multipart: { email: uniqueEmail(), password: 'anything' },
    })).json();
    const wrongPassword = await (await request.post(`${API}/verifyLogin`, {
      multipart: { email: requireEnv('AE_EMAIL'), password: 'WrongPass999' },
    })).json();
    expect(unknown.responseCode).toBe(404);
    expect(wrongPassword).toEqual(unknown); // identical replies
  });
});

test('account lifecycle: create → read → update → delete', async ({ request }) => {
  const email = uniqueEmail();
  const account = newAccount(email);

  try {
    await test.step('create account', async () => {
      const body = await (await request.post(`${API}/createAccount`, { multipart: account })).json();
      expect(body.responseCode).toBe(201);
      expect(body.message).toBe('User created!');
    });

    let userId = 0;
    await test.step('read back: stored data matches what we sent', async () => {
      const body = await (await request.get(`${API}/getUserDetailByEmail`, { params: { email } })).json();
      expect(body.responseCode).toBe(200);
      expect(body.user).toMatchObject({
        name: account.name, email,
        birth_day: account.birth_date,   // note: the field is renamed by the API
        first_name: account.firstname,   // renamed
        last_name: account.lastname,     // renamed
        company: account.company, city: account.city, zipcode: account.zipcode,
      });
      expect(body.user).not.toHaveProperty('password');
      userId = body.user.id;
    });

    await test.step('same email again is rejected', async () => {
      const body = await (await request.post(`${API}/createAccount`, { multipart: account })).json();
      expect(body.responseCode).toBe(400);
      expect(body.message).toBe('Email already exists!');
    });

    await test.step('update with WRONG password is blocked', async () => {
      const body = await (await request.put(`${API}/updateAccount`, {
        multipart: { ...account, password: 'WrongPass999', city: 'Houston' },
      })).json();
      expect(body.responseCode).toBe(404); // should really be 401
    });

    await test.step('update with correct password', async () => {
      const body = await (await request.put(`${API}/updateAccount`, {
        multipart: { ...account, company: 'QA Training UPDATED', city: 'Dallas' },
      })).json();
      expect(body.responseCode).toBe(200);
      expect(body.message).toBe('User updated!');
    });

    await test.step('read back: only the updated fields changed', async () => {
      const body = await (await request.get(`${API}/getUserDetailByEmail`, { params: { email } })).json();
      expect(body.user.id).toBe(userId);
      expect(body.user.company).toBe('QA Training UPDATED');
      expect(body.user.city).toBe('Dallas'); // NOT Houston
      expect(body.user.name).toBe(account.name);
    });

    await test.step('delete account', async () => {
      const body = await (await request.delete(`${API}/deleteAccount`, {
        multipart: { email, password: account.password },
      })).json();
      expect(body.responseCode).toBe(200);
      expect(body.message).toBe('Account deleted!');
    });

    await test.step('deleted account is gone', async () => {
      const body = await (await request.get(`${API}/getUserDetailByEmail`, { params: { email } })).json();
      expect(body.responseCode).toBe(404);
    });
  } finally {
    // Safety net: if any step failed, still remove the test account
    await request.delete(`${API}/deleteAccount`, { multipart: { email, password: account.password } });
  }
});

// test.fail() = "this test is EXPECTED to fail because of a known bug".
// It counts as passing while the bug exists. If the bug is ever fixed,
// Playwright reports it, telling us to update the test.
test.describe('Known bugs', () => {
  test('BUG: HTTP status should match responseCode', async ({ request }) => {
    test.fail(true, 'Server returns HTTP 200 even when responseCode is 405');
    const response = await request.post(`${API}/productsList`);
    const body = await response.json();
    expect(response.status()).toBe(body.responseCode);
  });

  test('BUG: createAccount should reject an invalid email', async ({ request }) => {
    test.fail(true, 'Server accepts any text as an email');
    const badEmail = `not-an-email-kevin-${Date.now()}`;
    try {
      const body = await (await request.post(`${API}/createAccount`, {
        multipart: newAccount(badEmail),
      })).json();
      expect(body.responseCode).toBe(400);
    } finally {
      await request.delete(`${API}/deleteAccount`, {
        multipart: { email: badEmail, password: 'TempPass123' },
      });
    }
  });
});