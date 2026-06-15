# Phase 5 Validation Plan

This plan defines validation requirements for the concrete Phase 5 files identified so far.

## Functional target

Organization-scoped compliance project workflows.

## Identified files

- `src/app/page.tsx`
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/dashboard/organizations/page.tsx`
- `src/server/queries/organization-dashboard.ts`
- `src/server/queries/current-organization.ts`

## Required validation areas

- Authenticated users are routed to the localized organization dashboard.
- Anonymous users are routed to login where required.
- Users without an organization are routed to onboarding.
- Organization dashboard data is scoped through organization membership.
- Dashboard preview queries use organization identifiers for tasks, risks, vendors, and documents.
- Query fallbacks remain safe when optional tables or columns are missing.
- No product, email, document, or UI template changes are required for this validation plan.

## Required command sequence

```bash
npm run phase3:strict
npm run phase3:closeout
npm run phase4:check
npm run phase4:review
npm run phase5:check
```

## Readiness rule

Functional changes to the identified files should be paired with focused tests or checkers that cover routing, organization membership, and dashboard data scoping.

## Safety boundary

Do not commit local environment files, provider credentials, private keys, service credentials, or customer data.
