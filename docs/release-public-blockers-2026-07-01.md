# Public Production Remaining Blockers — 2026-07-01

Current completion estimate: **90% done / 10% remaining**.

## Done

- `npm run release:production-final` exists.
- The production-final runner contains the required release sequence.
- The CI public launch contract was merged and then fixed by PR #777.
- Vercel is green on the latest checked merge commit.

## Remaining before 100%

### 1. Runtime proof is still missing

The project must still run:

```bash
npm run release:production-final
```

The run must produce real, target-specific evidence with `status: Complete` and `outcome: passed`:

- `docs/security/evidence/runtime/deployment-smoke-validation.json`
- `docs/security/evidence/runtime/rollback-dry-run-validation.json`
- `docs/security/evidence/runtime/production-final-validation.json`

Until those files are generated for the promoted commit and runtime target, the launch decision remains **No-Go**.

### 2. Branch protection evidence is stale

`docs/security/evidence/runtime/branch-protection-required-checks.json` is still marked as an exception and its exception window has expired. This is a release-governance blocker for a 100% claim.

Closure evidence required:

- Branch protection/ruleset configured for `main`.
- Required checks aligned with the documented release policy.
- Evidence refreshed and no longer stale.

### 3. Public readiness vs enterprise readiness must stay separate

Public Production Go must not claim enterprise procurement readiness.

External security review or pentest evidence should remain mandatory for enterprise readiness. For public production, the release owner must explicitly decide one of these two paths:

1. Keep Public Production **No-Go** until external review/pentest evidence is complete.
2. Keep external review/pentest mandatory only for enterprise readiness and keep the public production gate focused on build, tests, security CI, runtime smoke, rollback, readiness, no-store, headers and service checks.

## Current decision

**No-Go** until runtime evidence passes for the promoted commit.
