# Phase 7 Scope

Phase 7 defines the first operational review workflow around the Phase 6 readiness reporting summary.

## Entry commands

```bash
npm run phase6:review
npm run phase6:verify
npm run phase7:check
```

## Selected workflow

Readiness review follow-up planning for organization dashboards.

## Allowed work

- Map the existing readiness summary to operational follow-up needs.
- Identify safe read-only review touchpoints in the dashboard experience.
- Add validation artifacts before additional runtime changes.
- Add tests or static checkers for review workflow wiring.

## Not allowed

- Product template changes.
- Email template changes.
- Document template changes.
- UI template changes.
- Local environment files.
- Provider credentials, private keys, service credentials, or customer data.

## First milestone

Phase 7 initial scope is ready when kickoff, scope, and checks are wired through `npm run phase7:check`.
