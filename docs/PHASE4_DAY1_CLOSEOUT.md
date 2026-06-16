# Phase 4 Day 1 Closeout

Day 1 of Phase 4 covers kickoff, implementation scope, and inventory readiness.

## Command

Run from the repository root:

```bash
npm run phase4:day1
```

## Required checks

Day 1 validates:

- Phase 3 strict and closeout commands are referenced
- Phase 4 scope is defined before runtime code changes
- implementation areas are named before changes begin
- forbidden template and credential changes are excluded
- planning inventory exists
- Phase 4 validation commands exist

## Pass criteria

Day 1 is complete when:

- `check-phase4-kickoff.mjs` exits with code 0
- `check-phase4-scope.mjs` exits with code 0
- `check-phase4-inventory.mjs` exits with code 0
- no product, email, document, or UI template path is modified for Day 1 work
- no local environment file, provider credential, private key, service credential, or customer data is committed

## Scope boundary

Do not move to Phase 4 Day 2 until kickoff, scope, and inventory checks pass.
