# Phase 3 Day 2 Closeout

Day 2 of Phase 3 covers runtime security, observability, auth, and session readiness.

## Command

Run from the repository root:

```bash
npm run phase3:day2
```

## Required checks

Day 2 validates:

- runtime security headers
- production CSP posture
- Sentry runtime wiring
- operational diagnostics
- safe error handling posture
- auth/session dependencies
- protected route posture
- tenant isolation posture
- privileged method controls

## Required generated files

- `phase3-runtime-readiness-report.json`
- `phase3-auth-session-readiness-report.json`

## Pass criteria

Day 2 is complete when:

- `check-phase3-runtime-readiness.mjs` exits with code 0.
- `check-phase3-auth-session-readiness.mjs` exits with code 0.
- both readiness reports are generated.
- no auth/session or runtime blocker remains.
- no template paths are modified as part of Day 2 readiness work.

## Scope boundary

Do not move to Phase 3 Day 3 until Day 2 checks pass and the generated reports are reviewed.
