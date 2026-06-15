# Phase 6 Inventory

This inventory tracks the first Phase 6 reporting surface.

## Selected surface

Read-only organization workflow readiness reporting.

## Source signal

- `src/server/queries/organization-dashboard.ts`
- `OrganizationWorkflowReadiness`
- `workflowReadiness`
- `getOrganizationWorkflowReadiness`

## Existing consumers

- `src/app/[locale]/dashboard/organizations/page.tsx`
- `src/components/dashboard/dashboard-home-overview.tsx`
- `src/components/dashboard/next-best-actions.tsx`
- `src/components/dashboard/workflow-readiness-summary.tsx`

## Validation artifacts

- `docs/PHASE6_KICKOFF.md`
- `docs/PHASE6_SCOPE.md`
- `docs/PHASE6_INVENTORY.md`
- `docs/PHASE6_VALIDATION_PLAN.md`
- `scripts/dev/check-phase6-kickoff.mjs`
- `scripts/dev/check-phase6-scope.mjs`
- `scripts/dev/check-phase6-inventory.mjs`
- `scripts/dev/check-phase6-validation-plan.mjs`
- `scripts/dev/check-phase6-readiness-surface.mjs`
- `scripts/dev/check-phase6-focused-test.mjs`
- `scripts/dev/run-phase6-checks.mjs`
- `tests/phase6/readiness-reporting-surface.test.ts`

## Required commands

```bash
npm run phase5:review
npm run phase6:review
```

## Runtime boundary

Phase 6 inventory records the readiness reporting surface and validation requirements for the read-only dashboard summary.

## Safety boundary

Do not commit local environment files, provider credentials, private keys, service credentials, or customer data.
