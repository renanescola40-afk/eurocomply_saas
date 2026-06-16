# Phase 5 Day 3 Closeout

Day 3 of Phase 5 covers dashboard invariants and focused tests for organization-scoped compliance project workflows.

## Command

Run from the repository root:

```bash
npm run phase5:day3
```

## Required checks

Day 3 validates:

- dashboard invariant checker exists
- focused dashboard invariant test exists
- root routing redirects to the localized entry point
- localized home handles authenticated users and enterprise home fallback
- organization dashboard redirects anonymous users to login
- organization dashboard redirects users without an organization to onboarding
- organization dashboard uses organization-scoped data loading
- dashboard overview receives workflow readiness data
- next-best-actions consume workflow readiness signals
- organization dashboard queries filter tasks, risks, vendors, and documents by organization id
- current organization resolution uses organization membership
- no template path is modified for Day 3 work

## Pass criteria

Day 3 is complete when:

- `check-phase5-dashboard-invariants.mjs` exits with code 0
- `check-phase5-focused-test.mjs` exits with code 0
- the focused test names each protected routing and query invariant
- organization scoping is covered by both checker and test
- no product, email, document, or UI template path is modified for Day 3 work

## Scope boundary

Do not move to Phase 5 Day 4 until dashboard invariants and focused tests pass locally or in CI.
