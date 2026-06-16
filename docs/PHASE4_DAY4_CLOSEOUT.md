# Phase 4 Day 4 Closeout

Day 4 of Phase 4 covers final review, next implementation planning, and validation command readiness.

## Command

Run from the repository root:

```bash
npm run phase4:day4
```

## Required checks

Day 4 validates:

- Phase 4 final review exists
- Phase 4 next implementation plan exists
- Phase 4 validation commands exist
- Phase 4 planning checks are available through `phase4:check`
- Phase 4 final review is available through `phase4:review`
- data-flow records are accepted
- access-model records are accepted
- operational assumptions are accepted
- repository checks pass locally or in CI
- no secrets or customer data are added to repository files
- template changes remain out of scope unless later explicitly allowed

## Pass criteria

Day 4 is complete when:

- `check-phase4-final-review.mjs` exits with code 0
- `check-phase4-next-implementation-plan.mjs` exits with code 0
- `check-phase4-validation-commands.mjs` exits with code 0
- no final-review blocker remains
- no next-implementation-plan blocker remains
- no validation-command blocker remains
- no product, email, document, or UI template path is modified for Day 4 work
- no local environment file, provider credential, private key, service credential, or customer data is committed

## Scope boundary

Do not mark Phase 4 repository-side complete until Day 1 through Day 4 checks pass.
