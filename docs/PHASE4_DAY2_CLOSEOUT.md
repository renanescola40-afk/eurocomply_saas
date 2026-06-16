# Phase 4 Day 2 Closeout

Day 2 of Phase 4 covers data-flow readiness and access-model readiness.

## Command

Run from the repository root:

```bash
npm run phase4:day2
```

## Required checks

Day 2 validates:

- user identity and session data flow
- organization and membership data flow
- compliance project data flow
- generated document metadata flow
- billing and subscription state flow
- audit and operational event flow
- source-of-truth assumptions
- read and write paths
- cross-tenant boundaries
- user account access
- organization membership access
- compliance project access
- generated document access
- billing administration access
- audit log visibility

## Pass criteria

Day 2 is complete when:

- `check-phase4-data-flow.mjs` exits with code 0
- `check-phase4-access-model.mjs` exits with code 0
- no data-flow blocker remains
- no access-model blocker remains
- no product, email, document, or UI template path is modified for Day 2 work
- no local environment file, provider credential, private key, service credential, or customer data is committed

## Scope boundary

Do not move to Phase 4 Day 3 until data-flow and access-model assumptions are documented and checked.
