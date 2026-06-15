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

## Validation artifacts

- `docs/PHASE6_KICKOFF.md`
- `docs/PHASE6_SCOPE.md`
- `docs/PHASE6_INVENTORY.md`
- `scripts/dev/check-phase6-kickoff.mjs`
- `scripts/dev/check-phase6-scope.mjs`
- `scripts/dev/check-phase6-inventory.mjs`
- `scripts/dev/run-phase6-checks.mjs`

## Required commands

```bash
npm run phase5:review
npm run phase6:check
```

## Runtime boundary

Phase 6 inventory does not introduce new runtime behavior by itself. It records the reporting surface and validation requirements before additional changes.

## Safety boundary

Do not commit local environment files, provider credentials, private keys, service credentials, or customer data.
