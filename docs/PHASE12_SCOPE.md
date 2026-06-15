# Phase 12 Scope

Phase 12 defines the first evidence handoff readiness review workflow around organization reporting.

## Entry commands

```bash
node scripts/dev/run-phase11-verify.mjs
node scripts/dev/run-phase12-checks.mjs
```

## Selected workflow

Evidence handoff readiness review.

## Allowed work

- Map evidence handoff review to readiness review needs.
- Identify read-only readiness review touchpoints in the dashboard experience.
- Add validation artifacts before additional runtime changes.
- Add tests or static checks for readiness review wiring.

## Not allowed

- Product template changes.
- Email template changes.
- Document template changes.
- UI template changes.
- Local environment files.
- Provider credentials, private keys, service credentials, or customer data.

## First milestone

Phase 12 initial scope is ready when kickoff, scope, and checks are wired through `node scripts/dev/run-phase12-checks.mjs`.
