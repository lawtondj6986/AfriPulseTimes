# Tests

## Unit tests (`npm test`)

Fast, dependency-free tests using Node's built-in runner (`node --test`). These
run in CI on every push/PR (see `.github/workflows/ci.yml`).

- **`market-data.test.mjs`** — live-FX parsing, day-over-day change, formatting,
  and the endpoint's success + fail-safe behavior.
- **`contact.test.mjs`** — investor-enquiry email: Resend payload, HTML-escaping
  of untrusted fields, error handling.
- **`subscribe.test.mjs`** — Buttondown newsletter registration (created /
  duplicate / error).
- **`pull-wire.test.mjs`** — RSS headline → vertical classification.
- **`spa.test.mjs`** — the single-file SPA's inline JS parses, and every
  `t('…')` translation key exists in EN, FR, and AR.

```bash
npm test
```

## End-to-end browser audit (optional, manual)

`browser/audit.mjs` drives every route in a headless browser against mocked
backends, checking each renders without runtime errors, plus i18n, the live-FX
ticker, admin views, mobile layout, and accessibility basics. It's **not** part
of `npm test`/CI because it needs a browser binary.

```bash
npm install --no-save playwright-core
CHROMIUM_PATH=/path/to/chromium node tests/browser/audit.mjs
```
