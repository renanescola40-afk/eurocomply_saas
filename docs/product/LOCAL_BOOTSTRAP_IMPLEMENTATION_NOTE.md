# Local bootstrap implementation note

This note records the follow-up after the route/action QA audit was merged.

## Problem observed

A fresh Codespaces workspace attempted to run E2E validation before dependencies were installed. The terminal reported:

```text
sh: 1: playwright: not found
```

Then `quality:routes:e2e` reached an interactive `npx` install prompt. Interactive prompts are unsafe for deterministic release validation because they can hang automation and confuse operators.

## Implementation

- Added `scripts/dev/bootstrap-local-validation.mjs` for fresh local/Codespaces environments.
- Hardened `scripts/quality/run-route-health-e2e.mjs` to use the local Playwright binary from `node_modules/.bin`.
- Added `docs/quality/LOCAL_VALIDATION_RUNBOOK.md` with the correct local sequence and target environment variables.

## Release posture

The canonical final command remains:

```bash
npm run release:production-final
```

The release runner already performs dependency installation and Playwright browser installation before E2E checks. The bootstrap script is for local developer/Codespaces ergonomics and does not replace the production release gate.
