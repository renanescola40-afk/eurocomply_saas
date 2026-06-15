# Phase 5 Functional Inventory

This inventory defines the file-level discovery requirements before Phase 5 functional work.

## Functional target

Organization-scoped compliance project workflows.

## Current status

Initial concrete files have been identified through direct file inspection.

## Identified routes and modules

- `src/app/page.tsx` redirects root traffic to `/pt`.
- `src/app/[locale]/page.tsx` redirects authenticated users to `/{locale}/dashboard/organizations`.
- `src/app/[locale]/dashboard/organizations/page.tsx` is the organization dashboard route.
- `src/server/queries/organization-dashboard.ts` loads organization dashboard data.
- `src/server/queries/current-organization.ts` resolves organization membership for a user.

## Relevant data areas

- `organization_members`
- `organizations`
- `compliance_tasks`
- `risks`
- `vendors`
- `documents`
- billing entitlements
- dashboard summaries and trend snapshots

## Required before functional work

- Review organization dashboard route behavior.
- Review organization membership resolution.
- Review project workflow terminology before introducing new route names.
- Name the tests to add or update.
- Confirm no product, email, document, or UI template changes are required.

## Readiness rule

Functional work should proceed only after the identified files have matching validation steps.

## Safety boundary

Do not commit local environment files, provider credentials, private keys, service credentials, or customer data.
