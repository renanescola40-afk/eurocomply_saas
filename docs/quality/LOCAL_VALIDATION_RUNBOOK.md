# Local validation runbook

Date: 2026-07-04
Scope: Codespaces/local validation before public production release.

## Why this exists

A fresh Codespaces workspace does not have `node_modules` installed. Running `npm run test:e2e` before `npm ci` causes the shell error:

```text
sh: 1: playwright: not found
```

That is an environment bootstrap problem, not proof that the merged QA route/action audit is broken.

## First command in a fresh Codespaces

Run the bootstrap before any local E2E or route-health command:

```bash
npm run bootstrap:local
```

The bootstrap performs:

1. `npm ci`
2. `npx playwright install --with-deps chromium`

It writes local evidence to:

- `release-validation/local-bootstrap/summary.json`
- `release-validation/local-bootstrap/bootstrap.log`

Do not commit those generated local validation files unless a release manager explicitly asks for local evidence.

## Validation sequence after bootstrap

```bash
npm run test:e2e
npm run quality:routes:e2e
npm run quality:routes
npm run release:production-final
```

## Production final command

`npm run release:production-final` is the canonical full gate. It already runs dependency installation and Playwright browser installation before E2E checks, then continues through lint, typecheck, tests, build, security, smoke, rollback, and release evidence gates.

Use it for the final No-Go/Go decision. Do not call the release passed if any critical command or runtime evidence fails.

## Route-health behavior

`npm run quality:routes:e2e` now uses the local Playwright binary from `node_modules/.bin` instead of allowing `npx` to prompt interactively. If dependencies are missing, it exits with a clear bootstrap instruction instead of hanging at:

```text
Ok to proceed? (y)
```

## Environment targets

Local route health runs against the Playwright local webServer by default.

Preview and production targets are optional and are picked up when one of these variables is configured:

- Preview: `E2E_PREVIEW_URL`, `PREVIEW_DEPLOYMENT_URL`, `VERCEL_BRANCH_URL`, `VERCEL_URL`
- Production: `E2E_PRODUCTION_URL`, `PRODUCTION_DEPLOYMENT_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`
- Multiple explicit URLs: `E2E_BASE_URLS`, comma separated

## Secret safety

Do not paste tokens, cookies, Authorization headers, Supabase service-role keys, Stripe keys, Clerk keys, or production `.env` values into terminal screenshots, issues, PRs, or committed evidence.
