# Phase 12 Review Gate

Phase 12 uses a manual final gate because the verify runner could not be added safely.

## Required commands

```bash
node scripts/dev/run-phase12-checks.mjs
node scripts/dev/run-phase12-review.mjs
npm run lint
npm run typecheck
npm run build
```

## Acceptance criteria

- Phase 12 kickoff, scope, inventory, and validation plan exist.
- Phase 12 focused readiness review test is present.
- Evidence handoff readiness review remains read-only.
- Reports remains the safe readiness review entrypoint.
- No product, email, document, or UI template changes are required.

## Evidence to capture

Save command output for check, review, lint, typecheck, and build before marking Phase 12 verified.
