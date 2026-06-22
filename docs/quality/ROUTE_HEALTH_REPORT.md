# Route Health Report

## Status

Route health coverage has been added as a release gate for public pages, private redirects, locale coverage, `/undefined` regressions, mobile viewport smoke, controlled error rendering and RBAC visual checks.

## Scope covered

| Area | Included surfaces | Gate |
| --- | --- | --- |
| Public marketing | landing, pricing, login, signup, password reset, trust/security, compliance, resources, FAQ, about, contact, privacy, terms, data-processing, SLA, DPA, subprocessors, status | `npm run quality:routes:e2e` |
| Private workspace | dashboard, organizations, documents, vendors, risks, tasks/approvals, reports, audit, settings, billing, trust/security access center | `npm run quality:routes:e2e` |
| Locales | `pt`, `en`, `es`, `fr`, `it`, `de` | `npm run quality:routes:e2e` |
| Static route artifacts | inventory, report, E2E spec and critical route page files | `npm run quality:routes` |
| Link safety | no `/undefined` in scanned source or visited page links | `npm run quality:routes` and `npm run quality:routes:e2e` |
| Mobile | basic mobile viewport smoke for critical public routes | `npm run quality:routes:e2e` |
| RBAC | authenticated user without organization, owner, admin, editor, viewer | Conditional E2E when `E2E_*` credentials are available |

## Implemented controls

1. `docs/quality/ROUTE_INVENTORY.md` records the route inventory and the expected behavior for every critical route family.
2. `tests/e2e/route-health.spec.ts` visits public routes across all supported locales.
3. `tests/e2e/route-health.spec.ts` verifies anonymous private routes redirect to localized login with `next` preserved.
4. `tests/e2e/route-health.spec.ts` verifies legacy `/undefined` paths redirect away from `/undefined`.
5. `tests/e2e/route-health.spec.ts` runs basic mobile viewport checks for critical public surfaces.
6. `tests/e2e/route-health.spec.ts` verifies controlled login error rendering without stack traces.
7. `tests/e2e/route-health.spec.ts` includes conditional authenticated smoke checks for owner, admin, editor and viewer.
8. `tests/e2e/route-health.spec.ts` verifies viewer does not see admin permissions and owner sees admin permissions in the Access Center.
9. `scripts/quality/check-route-health-artifacts.mjs` fails the route quality gate if critical docs, route files or E2E coverage markers are removed.
10. `npm run quality:routes:e2e` provides a focused route-health Playwright command.

## Route fixes included

| Fix | Reason |
| --- | --- |
| Public trust/legal routes added under `src/app/[locale]/(public-info)` | Footer links must not lead to 404 or private login redirects |
| `data-processing` route alias added | Public data-processing footer/sitemap links must not 404 |
| `recuperar-senha` and `atualizar-senha` pages added | Password reset routes were listed as public auth routes and needed controlled pages |
| `settings` route alias added | Settings is a critical route and should not 404 |
| `billing` route alias added | Billing is a critical route and should not 404 |
| Public routes added to middleware allowlist | Trust/security/legal pages must remain public |
| `getCurrentUser` handles missing Supabase public runtime configuration | Public pages should not crash in CI without application secrets |

## Acceptance criteria result

| Criterion | Result |
| --- | --- |
| All critical routes are visited by E2E | Covered by `tests/e2e/route-health.spec.ts` |
| No critical route returns unexpected 404/500 | Enforced by Playwright status assertions |
| No `/undefined` | Enforced by static scan and Playwright page/link checks |
| Permissions visuals match RBAC | Owner and viewer Access Center assertions added; admin/editor route smoke added |
| Mobile basic works | Critical public route smoke runs with `390x844` mobile viewport |
| CI blocks merge if route critical breaks | `quality:routes` and `quality:routes:e2e` are wired as CI gates |

## Operational notes

Authenticated scenarios are written to run when seeded E2E accounts exist. Local and CI environments without those credentials still run anonymous, redirect, public, `/undefined`, mobile and controlled-error gates. Static artifact checks continue to enforce that authenticated user without organization, owner, admin, editor and viewer coverage remains present in the test suite.

## Required commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run quality:routes
npm run quality:routes:e2e
npm run build
```

## CI behavior

A merge must be blocked when any of the following happens:

- route inventory or route health report is missing;
- route health E2E spec is missing required coverage markers;
- critical route page files are missing;
- source contains `/undefined` route patterns;
- a critical public route returns unexpected 404 or 500;
- an anonymous private route stops redirecting to login;
- a visited page exposes a stack trace;
- a visible primary CTA points to `/undefined` or a dead link;
- viewer sees admin actions;
- owner cannot see admin actions.
