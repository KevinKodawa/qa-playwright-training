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
 
 ---

## Day 5 – API Testing (automationexercise.com)

Manual exploration in **Postman**, then automation with Playwright's `request` fixture (no browser needed).

### What was tested
- All 14 API checks from the course notes (happy paths, wrong methods, missing parameters, invalid user)
- Full CRUD lifecycle: create → read → update → delete → confirm gone
- Authentication: update with the wrong password is blocked
- Negative tests: duplicate email, invalid email format, missing vs empty field, wrong data type

### Key finding
This API returns **HTTP 200 for almost everything**, including errors and `201 Created`.
The real result is only in the JSON body's `responseCode`, so the tests always check **both**.

### Bugs found
1. HTTP status is 200 even when `responseCode` is 400/404/405/201
2. `createAccount` accepts an invalid email (e.g. `not-an-email`)
3. `createAccount` accepts an empty `name`
4. `createAccount` accepts letters in `birth_year` and stores them

### Run the API tests
```
npx playwright test tests/api.spec.ts --project=chromium
```
Result: **13 passed**. Two tests use `test.fail()` to document known bugs; they will turn red if the site fixes them.

Requires `AE_EMAIL` and `AE_PASSWORD` in `.env` (see `.env.example`).

## Day 6 – Performance Testing with JMeter

### Setup
- **Java 21** (Eclipse Temurin), installed with `winget install --id EclipseAdoptium.Temurin.21.JDK -e`. JMeter needs a 64-bit Java; the older Java 8 was left in place.
- **Apache JMeter 5.6.3** (unzipped; no installer). Started with `bin\jmeter.bat`.
- Test plan: `jmeter/products-load-test.jmx`

### What the test plan does
| Element | Setting |
|---|---|
| Thread Group "Products users" | 10 users, 3 loops each (ramp-up changed between runs) |
| HTTP Request "GET productsList" | `GET https://automationexercise.com/api/productsList` |
| Response Assertion | Body must contain `"responseCode": 200` (this API returns HTTP 200 even for errors, so the status alone proves nothing) |
| Listeners | View Results Tree, Summary Report, Aggregate Report |

The assertion was proved to work by temporarily expecting `404`: the result turned red with the custom failure message, while HTTP still said 200 OK.

### How to run (non-GUI, recommended for real runs)
```
<JMeter folder>\bin\jmeter.bat -n -t jmeter\products-load-test.jmx -l jmeter\run.jtl -e -o jmeter\report "-Jjmeter.reportgenerator.overall_granularity=1000"
```
`-n` no GUI · `-t` test plan · `-l` raw results · `-e -o` HTML dashboard · `-J` 1-second chart buckets (the default is 1 minute, too coarse for short tests). Results and reports are git-ignored.

### Results (30 requests per run, 2026-11-09)
| | Run 1: 10 users, 10 s ramp-up | Run 2: 10 users, 1 s ramp-up |
|---|---|---|
| Peak active (concurrent) users | ~2.5 | 10 |
| Median | 216 ms | 1042 ms |
| 90th / 95th percentile | 521 / 1472 ms | 2203 / 2410 ms |
| Min / Max | 166 / 1964 ms | 431 / 2463 ms |
| Throughput | 3.1 req/s | 6.9 req/s |
| Error % | 0% | 0% |
| APDEX (default 0.5 s / 1.5 s) | 0.933 | 0.367 |

**Finding:** the only change was how much the users overlapped. With ~10 concurrent users, the median was about 5× slower and APDEX dropped from "good" to "unacceptable", although every response was still correct. Observed in a single run on a shared public site with default thresholds, so it is a signal to repeat, not a proven capacity limit.

### Key learnings
- Smoke-test with 1 user first; one sample is an anecdote, not a measurement.
- The first request pays a connection cost (DNS + TCP + TLS); later requests reuse the connection.
- Median and percentiles beat the average, which outliers drag up; the 95th/99th percentile shows tail latency.
- "10 users" is not "10 concurrent users": ramp-up, loops and think time decide the overlap. Little's Law: concurrent users ≈ throughput × (response time + think time).
- Green only means HTTP 200; assert on the body.
- Always check chart axes and bucket size before trusting a chart.
- Load testing was kept tiny on purpose because this is a shared public site; stress testing (pushing past capacity) is only done on systems you own or have permission to test.