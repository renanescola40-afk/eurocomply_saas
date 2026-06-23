# Billing Test Execution

This note documents a repository-side release-readiness fix for billing validation coverage.

## Problem

The billing validation evidence references co-located route and server specs under `src/**`, but the default Vitest configuration previously included only `tests/**/*.test.ts`.

That meant the standard `npm test` command could miss billing specs that are referenced by the evidence file.

## Change

`vitest.config.ts` now explicitly includes the billing checkout, billing portal, billing webhook, canonical webhook and billing server handler specs in the default Vitest run.

## Validation commands

```bash
npm test
npm run typecheck
npm run security:billing-webhook-body
```

## Scope

This is repository-side test execution coverage only. Environment-specific runtime evidence remains tracked separately in the release evidence register.
