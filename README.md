# QA Playwright Training: Days 3 and 4

End-to-end UI test suites built with [Playwright](https://playwright.dev/) and TypeScript as part of a QA training programme. This repo documents every step I took, the problems I hit, and how I fixed them, so the same process can be reused on any similar web project.

**Final result:** 54 test runs across Chromium, Firefox and WebKit: **36 passed, 18 skipped, 0 failed.**

| Day | Topic | Sites tested |
|---|---|---|
| 3 | Playwright fundamentals: setup, locators, assertions | Community Dreams Foundation portal |
| 4 | Playwright advanced: folder structure, common mistakes, debugging, reports | automationintesting.online, automationexercise.com |

---

## Project structure

```
tests/
  cdf.spec.ts           Day 3: CDF portal (title, invalid login, valid login parked)
  booking.spec.ts       Day 4, Assignment 1: Shady Meadows B&B booking site
  ae-login.spec.ts      Day 4, Assignment 2: login tests (TC2, TC3, empty form)
  ae-register.spec.ts   Day 4, Assignment 2: register tests (TC1, TC5, empty form)
  ae-order.spec.ts      Day 4, Assignment 2: place order (TC16)
playwright.config.ts    3 browser projects; loads .env via dotenv
.env.example            Template for the test-account values (copy to .env)
```

## Setup

1. Install [Node.js](https://nodejs.org/) (I used v26.13.0 with npm 11.20.0).
2. Clone the repo and install dependencies:
   ```
   npm install
   npx playwright install
   ```
3. Copy `.env.example` to `.env` and fill in **dedicated, fake test accounts**. Never use personal credentials.
   - For automationexercise.com, create a throwaway account by hand on the site first (made-up name, email and address).

## Running the tests

```
npx playwright test                                   # everything, all 3 browsers
npx playwright test booking --project=chromium        # one file, one browser
npx playwright test booking -g "Book Now"             # one test by name
npx playwright test booking --debug -g "Book Now"     # step through in the Playwright Inspector
npx playwright test booking --project=webkit --repeat-each=3   # check for flaky tests
npx playwright show-report                            # open the last HTML report (Ctrl+C to stop)
```

---

## Day 3: Playwright fundamentals

- Set up a TypeScript Playwright project and used **Codegen** to find real locators.
- Practised three locator types (role, label and CSS) and URL/visibility assertions.
- **Results:** homepage title test and invalid-login test pass. The valid-login test is parked with `test.skip` until a dedicated test account exists; I chose not to use personal login details.
- **Lessons:** the site said "Sign in", not "Volunteer Login" as the notes did, so always verify against the real app. Credentials live in `.env`, never in code.

## Day 4: Playwright advanced

### Assignment 1: automationintesting.online

While exploring with Codegen, I found that **every room reservation page shows an endless spinner**. In the browser console, `GET /api/room/{id}` returns **HTTP 500** and the page then throws `SyntaxError: JSON.parse`, with no error shown to the user. It affects all three rooms in both Chromium and Firefox, while the homepage and room list still work.

So I automated what works and parked the rest:

- ✅ Homepage loads and shows the Welcome section
- ✅ Book Now takes you to Our Rooms
- ✅ Our Rooms lists every room with its price (data-driven loop)
- ⏸️ 5 parked tests (reservation details, price formula, Reserve Now, empty form, invalid email), each skipped with a comment naming the bug

### Assignment 2: automationexercise.com

| Site test case | Type | Result |
|---|---|---|
| TC1: Register user (then delete the account) | Required | ✅ |
| TC2: Login with correct details | Required | ✅ |
| TC3: Login with incorrect details | Negative | ✅ |
| TC5: Register with an existing email | Negative | ✅ |
| TC16: Place order, login before checkout | Required | ✅ |
| Empty login form / empty signup form | Negative | ✅ |

**Techniques:** `test.beforeEach` for shared steps, `data-qa` test attributes where two forms share a label, unique emails via `Date.now()` with clean-up, ad blocking with `page.route(...)`, a fake card (`4111…`), and secrets read from `.env` with a `requireEnv()` helper.

### The five common beginner mistakes, and how this code avoids them

1. **No waits before assertions:** auto-waiting `toBeVisible()`, with a longer timeout for known-slow elements
2. **Auto-generated IDs:** role and text locators first, then `data-qa` attributes, never generated IDs or `.nth()`
3. **No negative tests:** incorrect login, existing email, empty forms
4. **Hardcoded values:** `BASE_URL` constants and test-data objects
5. **No URL or element checks:** every test asserts a URL and a visible element or message

### Failure log: why it failed, how it was fixed

| # | Symptom | Why | Fix |
|---|---|---|---|
| 1 | Strict mode violation, 4 elements | Without `exact: true`, "Book Now" also matched each room's "Book now". It had passed only because the rooms hadn't loaded yet (a flaky test). | `exact: true`, plus wait for the room cards before clicking |
| 2 | Same error in all browsers | The fixed line was added next to the old one instead of replacing it. The report's red `>` pointed at the leftover line. | Replaced the whole test block |
| 3 | WebKit-only timeout (5 s) | The room list loads slowly from the site's API, and WebKit is the slowest browser | `toBeVisible({ timeout: 15000 })`, verified with `--repeat-each=3` |

## Key lessons

- **A passing test is not proof.** One test passed by luck until the timing changed.
- **Investigate before automating.** The browser console turned "my test is stuck" into a precise, reportable defect.
- **Read the error first.** Playwright's report shows every element matched and the exact failing line.
- **Security is part of QA.** Fake accounts and cards only; `.env`, `test-results/` and `playwright-report/` are never committed.

## Next steps

- Re-check automationintesting.online and un-skip the booking tests once the room API is fixed
- Move shared helpers (`requireEnv`, ad blocking, login) into a `utils/` folder
- Day 5: API testing
