# Current organization query syntax fix

Status: implemented in this branch.

## Issue

GitHub Actions lint diagnostics showed a parser failure in `src/server/queries/current-organization.ts` caused by a malformed duplicate `getUserOrganizationMemberships` export.

## Fix

The file now contains a single `getUserOrganizationMemberships` implementation with bounded query limits, normalization of joined organization rows, and the existing `getCurrentOrganizationForUser` helper.

## Validation

Expected validation commands:

```bash
npm run lint
npm run test -- tests/current-organization-source.test.ts
npm run typecheck
```

No runtime evidence is marked complete by this fix.
