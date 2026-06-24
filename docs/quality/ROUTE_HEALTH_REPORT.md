# Route Health Report

## Status

Route health coverage is implemented as a release gate for public pages, private redirects, locale coverage, `/undefined` regressions, mobile viewport smoke, controlled error rendering, RBAC visual checks and deployment-target smoke against local, preview and production URLs when configured.

## Scope covered

| Area | Included surfaces | Gate |
| --- | --- | --- |
| Public marketing | landing, pricing, login, signup, password reset, trust/security, compliance, resources, FAQ, about, contact, privacy, terms, data-processing, SLA, DPA, subprocessors, status | `npm run quality:routes:e2e` |
| Private workspace | dashboard, organizations, documents, vendors, risks, tasks/approvals, reports, audit, settings, billing, trust/security access center | `npm run quality:routes:e2e` |
| Locales | `pt`, `en`, `es`, `fr`, `it`, `de` | `npm run quality:routes:e2e` |
| Static route artifacts | inventory, report, runner, E2E spec and critical route page files | `npm run quality:routes` |
| Link safety | no `/undefined` in scanned source, final URL, or visible links | `npm run quality:routes` and `npm run quality:routes:e2e` |
| Primary controls | primary links cannot be empty, `#`, or `/undefined`; primary buttons cannot be disabled/inert | `npm run quality:routes:e2e` |
| Mobile | basic mobile viewport smoke for critical public routes | `npm run quality:routes:e2e` |
| RBAC | authenticated user without organization, owner, admin, editor, viewer | Conditional E2E when `E2E_*` credentials are available |
| Deployment targets | local always, preview when a preview URL exists, production when a production URL exists | `scripts/quality/run-route-health-e2e.mjs` |

## Implemented controls

1. `docs/quality/ROUTE_INVENTORY.md` records the route inventory and the expected behavior for every critical route family.
2. `tests/e2e/route-health.spec.ts` visits public routes across all supported locales.
3. `tests/e2e/route-health.spec.ts` verifies anonymous private routes redirect specifically to localized login with `next` preserved.
4. `tests/e2e/route-health.spec.ts` verifies legacy `/undefined` paths are controlled, do not 500 and end away from `/undefined`.
5. `tests/e2e/route-health.spec.ts` verifies every visited page has no visible `/undefined` links.
6. `tests/e2e/route-health.spec.ts` checks primary links and buttons for dead/inert states.
7. `tests/e2e/route-health.spec.ts` runs basic mobile viewport checks for critical public surfaces.
8. `tests/e2e/route-health.spec.ts` verifies controlled login error rendering without stack traces.
9. `tests/e2e/route-health.spec.ts` includes conditional authenticated smoke checks for owner, admin, editor and viewer.
10. `tests/e2e/route-health.spec.ts` verifies viewer does not see admin permissions and owner sees admin permissions in the Access Center.
11. `scripts/quality/run-route-health-e2e.mjs` runs the suite against local plus preview and production deployments when URLs exist.
12. `scripts/quality/check-route-health-artifacts.mjs` fails the route quality gate if critical docs, route files, runner, E2E coverage markers or deployment markers are removed.
13. `npm run quality:routes:e2e` provides the focused route-health command.

## Route fixes covered by the gate

| Fix/guard | Reason |
| --- | --- |
| Public trust/legal routes under `src/app/[locale]/(public-info)` | Footer links must not lead to 404 or private login redirects |
| `data-processing` route alias | Public data-processing footer/sitemap links must not 404 |
| `recuperar-senha` and `atualizar-senha` pages | Password reset routes need controlled pages |
| `settings` route alias | Settings is a critical route and should not 404 |
| `billing` and organization billing routes | Billing is a critical route and should not 404 |
| Public routes in middleware allowlist | Trust/security/legal pages must remain public |
| Strict anonymous private redirect check | Private pages must redirect to login, not merely render a localized page |
| All visible link `/undefined` check | `/undefined` must not reappear through navigation links |
| `getCurrentUser` missing Supabase public config handling | Public pages should not crash in CI without application secrets |

## Acceptance criteria result

| Criterion | Result |
| --- | --- |
| All critical routes are visited by E2E | Covered by `tests/e2e/route-health.spec.ts` |
| All locales are tested | `pt`, `en`, `es`, `fr`, `it`, `de` loops cover public and private guard routes |
| No critical route returns unexpected 404/500 | Enforced by Playwright status assertions |
| No `/undefined` | Enforced by static scan plus final URL and visible-link checks |
| Primary buttons and links have action | Primary links cannot be empty/`#`; primary buttons cannot be disabled or inert |
| Private pages redirect to login | Anonymous private route tests assert exact `/{locale}/login` destination |
| Permissions visuals match RBAC | Owner and viewer Access Center assertions added; admin/editor route smoke included |
| Empty states do not crash | No-organization Access Center empty state is covered when credentials exist |
| Error states do not expose stack traces | Every visited route and controlled login error state is scanned for raw stack traces |
| Preview/prod deployment tested | Runner executes preview/production targets when URL variables exist |
| CI blocks merge if critical route breaks | Full Security Suite runs `quality:routes` and `quality:routes:e2e` as blocking steps |

## Operational notes

Authenticated scenarios are written to run when seeded E2E accounts exist. Local and CI environments without those credentials still run anonymous, redirect, public, `/undefined`, mobile and controlled-error gates. Static artifact checks continue to enforce that authenticated user without organization, owner, admin, editor and viewer coverage remains present in the test suite.

Deployment target variables:

```bash
E2E_PREVIEW_URL=https://preview.example.com npm run quality:routes:e2e
E2E_PRODUCTION_URL=https://app.example.com npm run quality:routes:e2e
E2E_BASE_URLS=https://one.example.com,https://two.example.com npm run quality:routes:e2e
```

`ROUTE_HEALTH_SKIP_LOCAL=true` can be used for a deployment-only check, but the Full Security Suite keeps local coverage enabled by default.

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

CI blocks merge when any of the following happens:

- route inventory or route health report is missing;
- route-health runner or E2E spec is missing required coverage markers;
- critical route page files are missing;
- source contains `/undefined` route patterns;
- a critical public route returns unexpected 404 or 500;
- an anonymous private route does not redirect to localized login;
- a visited page exposes a stack trace;
- a visible link points to `/undefined`;
- a visible primary CTA points to `/undefined`, `#`, or no destination;
- a visible primary button is disabled or inert;
- viewer sees admin actions;
- owner cannot see admin actions;
- any configured preview or production deployment target fails route health.
