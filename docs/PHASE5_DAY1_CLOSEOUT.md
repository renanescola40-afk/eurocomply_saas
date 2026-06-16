# Phase 5 Day 1 Closeout

Day 1 of Phase 5 covers functional kickoff, implementation scope, repository inventory, and discovery notes for organization-scoped compliance project workflows.

## Command

Run from the repository root:

```bash
npm run phase5:day1
```

## Required checks

Day 1 validates:

- Phase 3 strict and closeout commands are referenced
- Phase 4 planning checks and review commands are referenced
- Phase 5 kickoff exists
- Phase 5 scope exists
- Phase 5 inventory exists
- Phase 5 discovery notes exist
- organization-scoped compliance project workflows are the functional focus
- route and module names are not assumed before discovery
- tenant boundaries are identified before runtime changes
- audit events are identified before workflow changes
- validation expectations are identified before implementation
- product, email, document, and UI template changes remain out of scope
- secrets, provider credentials, private keys, service credentials, and customer data remain out of repository files

## Pass criteria

Day 1 is complete when:

- `check-phase5-kickoff.mjs` exits with code 0
- `check-phase5-scope.mjs` exits with code 0
- `check-phase5-inventory.mjs` exits with code 0
- `check-phase5-discovery-notes.mjs` exits with code 0
- no discovery blocker remains
- no scope blocker remains
- no template path is modified for Day 1 work
- no local environment file, provider credential, private key, service credential, or customer data is committed

## Scope boundary

Do not move to Phase 5 Day 2 until kickoff, scope, inventory, and discovery notes are checked and reviewed.
