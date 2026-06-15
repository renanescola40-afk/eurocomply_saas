# Phase 6 Scope

Phase 6 defines the next repository-side increment after the Phase 5 workflow readiness implementation.

## Entry commands

```bash
npm run phase3:strict
npm run phase3:closeout
npm run phase4:check
npm run phase4:review
npm run phase5:review
npm run phase6:check
```

## Selected area

Read-only organization workflow readiness reporting.

## Allowed work

- Map the existing organization dashboard readiness signal to reporting needs.
- Identify read-only routes or components that can display readiness status.
- Add validation artifacts for readiness reporting.
- Add tests or static checkers before runtime changes.

## Not allowed

- Product template changes.
- Email template changes.
- Document template changes.
- UI template changes.
- Local environment files.
- Provider credentials, private keys, service credentials, or customer data.

## First milestone

Phase 6 initial scope is ready when kickoff, scope, and checks are wired through `npm run phase6:check`.
