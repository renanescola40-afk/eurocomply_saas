# SEC-02 — API authorization context red/green evidence and CircleCI manual test contract

**Date:** 2026-11-08. **Formal status:** NOT_VERIFIED.
**Source branch:** `fix/a02-sec02-fail-closed-unknown-roles-20261108`.
**PR:** https://github.com/renanescola40-afk/eurocomply_saas/pull/2653

## Proven defect and bounded fix

Before: `requireOrganizationAccess` in `src/server/security/api-guards.ts`
returned `membership.role as OrganizationRole`, a TypeScript cast on
provider-sourced data, despite the membership loader accepting legacy role
aliases and returning the raw role string. A legacy role could reach the typed
server API context uncanonicalized and an unexpected role could be represented
as an authority if that loader unexpectedly returned the row.

After: `requireOrganizationAccess` explicitly uses
`parseOrganizationRole(membership.role)`. It returns one of the five
canonical roles, or a 403 `organization_membership_required` error for
unknown/null/invalid roles, **before** requesting MFA.

- New Vitest regression cases in `src/server/security/api-guards.test.ts`:
  recognized legacy role -> canonical role; unexpected role -> 403.
- Isolated execution of the **actual function source extracted from GitHub**
  with mock MFA/membership providers and the actual strict role parser:
  **9/9 assertions passed, 0 failures.**
- Tested baseline `main` source at
  `313eb1e258b3a790ea2f8bd4b103079cb38dc5ce` reproduced
  legacy role `administrador` returned raw and unexpected role `superuser`
  allowed through a mocked provider result.
- Source-level patched function was obtained at commit
  `57f1712f83bf97435ca1db013cab8e08b3c16629`,
  GitHub blob SHA `6d087784adf5f7541fa592b2655ed1ac3d1dcf6e`;
  parser GitHub blob `44d415f4b77e1ba3d8378d153a0066b1dd801173`.

**Limit:** isolated dependency-mocked execution, not Vitest, signed
Supabase QA session, production route proof or qualified formal acceptance.

## New CircleCI alternative — source-only

A dedicated job `sec02-rbac-source-proof` and workflow
`sec02-source-proof-manual` were added to `.circleci/config.yml`
for the exact A-02 feature branch. Its boolean pipeline parameter
`run_sec02_source` defaults to `false` so pushes do not launch it.
The job refuses wrong branch/commit, privileged environment variables,
and does **not** connect to external providers or run deployment.
When explicitly triggered, it will execute:

```bash
npm ci --ignore-scripts --no-audit --no-fund
./node_modules/.bin/vitest run \
  src/server/security/rbac.test.ts \
  src/server/security/rbac-membership.test.ts \
  src/server/security/api-guards.test.ts \
  tests/unit/permissions.test.ts \
  tests/unit/sec02-rbac-matrix-contract.test.ts
npm run typecheck
```

CircleCI will record SHA provenance in
`sec02-source-only-exact-sha/provenance.json`. That artifact says
`qaAuthenticatedTests=NOT_RUN` and `formalAcceptance=NOT_GRANTED`.

As of this writing the CircleCI job is **CONFIGURED, NOT RUN**.
Only trigger after confirming included credits and no added spend;
a default-disabled job does not imply any CI proof.

### Exact human operator action when budget permits

1. Sign into https://app.circleci.com/ and find the CircleCI project
   whose GitHub source is `renanescola40-afk/eurocomply_saas`.
2. Choose **Pipelines** then **Trigger Pipeline**.
3. Select **config branch** `fix/a02-sec02-fail-closed-unknown-roles-20261108`;
   use the same branch for **checkout source** when that separate field exists.
4. **Add Parameter**: name `run_sec02_source`, type **boolean**, value **true**.
5. Confirm this is a small, **source-only** job with no production credentials
   and that no new billing will be incurred; run it once.
6. Inspect job `sec02-rbac-source-proof` and its output. Do not treat a
   failed/canceled/unexecuted job as PASS. Preserve exact SHA and CircleCI run URL.

A manual CircleCI source run cannot close SEC-02: authenticated QA API
allow/deny, audit RLS migration/readback, SEC-01 dependency, and independent
acceptance remain mandatory.

## Runtime environment status

Vercel deployment listings for both the A-02 branch and code commit
`57f1712f83bf97435ca1db013cab8e08b3c16629` returned zero
matching deployments at the inspection time. No exact-SHA deployed QA
runtime was confirmed. **No deployment was created.**

Formal gate progress remains `SEC-02=NOT_VERIFIED`,
`SEC-04=NOT_VERIFIED`, `A-02=0/2`.
