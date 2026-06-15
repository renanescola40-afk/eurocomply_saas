# Phase 4 Scope

Phase 4 is the post-readiness implementation planning phase.

## Entry requirements

Run the Phase 3 repository gates first:

```bash
npm run phase3:strict
npm run phase3:closeout
```

Run the Phase 4 kickoff gate:

```bash
node scripts/dev/check-phase4-kickoff.mjs
```

## Allowed work

- Define Phase 4 implementation areas before changing runtime code.
- Add validation scripts for Phase 4 planning artifacts.
- Add documentation for data flow, permissions, and operational assumptions.
- Add non-secret examples or checklists when required.

## Not allowed yet

- Product UI changes.
- Email template changes.
- Document template changes.
- UI template changes.
- Committing local environment files.
- Committing provider credentials, private keys, service credentials, or customer data.

## Initial milestone

Phase 4 initial milestone is complete when scope, inventory, and validation commands exist.
