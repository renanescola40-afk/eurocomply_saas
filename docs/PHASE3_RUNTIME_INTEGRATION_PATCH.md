# Phase 3 Runtime Integration Patch

This patch note records the remaining integration needed after adding the runtime and auth/session readiness guides.

## Reason

The runtime readiness guide and checker were added successfully, and the strict runner was updated to call the runtime checker.

A later tool write to update existing inventory/package files was blocked by platform safety checks, so this document records the exact remaining integration steps instead of touching templates or product files.

## Required integration

Update `package.json` scripts with:

```json
"phase3:runtime": "node scripts/dev/check-phase3-runtime-readiness.mjs"
```

Update `scripts/dev/check-phase3-script-files.mjs` required files with:

```text
docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md
docs/PHASE3_AUTH_SESSION_READINESS.md
scripts/dev/check-phase3-runtime-readiness.mjs
```

Update `scripts/dev/check-phase3-production-readiness.mjs` required docs with:

```text
docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md
docs/PHASE3_AUTH_SESSION_READINESS.md
```

Update `.gitignore` with:

```text
phase3-runtime-readiness-report.json
```

## Guardrails

These integration steps are authorized only in package/scripts/docs/gitignore files.

Do not modify product, email, document, or UI templates to complete this integration.

## Validation command

After integration, run:

```bash
npm run phase3:strict
```
