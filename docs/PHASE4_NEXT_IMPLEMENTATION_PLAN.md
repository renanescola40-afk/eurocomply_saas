# Phase 4 Next Implementation Plan

This plan defines the next implementation step after the Phase 4 planning foundation is validated.

## Scope

This is a planning artifact. It does not authorize product, email, document, or UI template changes by itself.

## Required validation before implementation

```bash
npm run phase3:strict
npm run phase3:closeout
npm run phase4:check
node scripts/dev/check-phase4-final-review.mjs
```

## Implementation candidate

The first functional implementation candidate should be chosen only after confirming:

- data-flow records are accepted;
- access-model records are accepted;
- operational assumptions are accepted;
- repository checks pass locally or in CI;
- no secrets or customer data are added to repository files.

## Candidate areas

- Organization-scoped compliance project workflows.
- Audit-event coverage for privileged actions.
- Read-only operational dashboards or reports.
- Billing-state display backed by existing provider state.

## Safety boundary

Do not begin implementation work that changes product, email, document, or UI templates unless a later scope record explicitly allows it.
