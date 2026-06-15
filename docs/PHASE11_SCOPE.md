# Phase 11 Scope

Phase 11 defines the first evidence handoff review workflow around organization readiness reporting.

## Entry commands

```bash
npm run phase10:verify
node scripts/dev/run-phase11-checks.mjs
```

## Selected workflow

Evidence handoff review.

## Allowed work

- Map audit package review to evidence handoff review needs.
- Identify read-only handoff review touchpoints in the dashboard experience.
- Add validation artifacts before additional runtime changes.
- Add tests or static checks for handoff review wiring.

## Not allowed

- Product template changes.
- Email template changes.
- Document template changes.
- UI template changes.
- Local environment files.
- Provider credentials, private keys, service credentials, or customer data.

## First milestone

Phase 11 initial scope is ready when kickoff, scope, and checks are wired through `node scripts/dev/run-phase11-checks.mjs`.
