# Route Inventory

This is the canonical route quality contract for Risck Comply.

## Objective

Eliminate broken pages, invalid links, `/undefined`, unexpected 404, unexpected 500, dead flows, uncontrolled stack traces and RBAC visual drift before release.

## Locales

All critical routes use explicit locale prefixes and are covered by Playwright E2E for `pt`, `en`, `es`, `fr`, `it` and `de`.

## Public route inventory

| Surface | Canonical route | Critical | Expected behavior |
| --- | --- | --- | --- |
| landing | `/{locale}` | Yes | Public landing renders without 404/500, `/undefined`, stack traces or dead primary CTAs |
| pricing | `/{locale}/pricing` | Yes | Pricing renders with live primary CTAs |
| login | `/{locale}/login` | Yes | Login renders and controlled auth errors do not leak stack traces |
| signup | `/{locale}/signup` | Yes | Signup renders with live account creation CTAs |
| password reset | `/{locale}/recuperar-senha` | Yes | Account recovery route renders a controlled page |
| password reset continuation | `/{locale}/atualizar-senha` | No | Account recovery continuation route renders a controlled page |
| trust/security | `/{locale}/trust` | Yes | Trust Center renders publicly |
| trust/security | `/{locale}/security` | Yes | Security page renders publicly |
| compliance | `/{locale}/compliance` | No | Compliance page renders publicly |
| resources | `/{locale}/resources` | No | Resources page renders publicly |
| FAQ | `/{locale}/faq` | No | FAQ page renders publicly |
| about | `/{locale}/about` | No | About page renders publicly |
| contact | `/{locale}/contact` | No | Contact page renders publicly |
| privacy | `/{locale}/privacy` | No | Privacy page renders publicly |
| terms | `/{locale}/terms` | No | Terms page renders publicly |
| data processing | `/{locale}/data-processing` | No | Data processing page renders publicly |
| service commitments | `/{locale}/sla` | No | Service commitments page renders publicly |
| DPA | `/{locale}/dpa` | No | DPA renders publicly |
| subprocessors | `/{locale}/subprocessors` | No | Subprocessors page renders publicly |
| status | `/{locale}/status` | No | Status page renders publicly |

## Private route inventory

Anonymous visitors must be redirected to `/{locale}/login?next=<requested path>` for every private route below. A private route is not allowed to remain on the requested URL for anonymous users, even if the page body renders a friendly empty state.

| Surface | Canonical route | Critical | Expected behavior |
| --- | --- | --- | --- |
| dashboard | `/{locale}/dashboard` | Yes | Anonymous redirects to login; authenticated users see dashboard or controlled empty state |
| organizations | `/{locale}/dashboard/organizations` | Yes | Anonymous redirects to login; authenticated users see organization workspace or controlled empty state |
| documents | `/{locale}/dashboard/organizations/documents` | Yes | Anonymous redirects to login; authenticated users see documents without crash |
| vendors | `/{locale}/vendor-assurance` | Yes | Anonymous redirects to login; authenticated users see vendor assurance without crash |
| risks | `/{locale}/dashboard/organizations/risks` | Yes | Anonymous redirects to login; authenticated users see risks without crash |
| tasks/approvals | `/{locale}/aprovacoes` | Yes | Anonymous redirects to login; authenticated users see approvals without crash |
| tasks/approvals | `/{locale}/dashboard/tasks` | Yes | Anonymous redirects to login; authenticated users see task dashboard without crash |
| reports | `/{locale}/dashboard/organizations/reports-governance` | Yes | Anonymous redirects to login; authenticated users see reports without crash |
| audit | `/{locale}/auditoria` | Yes | Anonymous redirects to login; authenticated users see audit without crash |
| settings | `/{locale}/settings` | Yes | Anonymous redirects to login; authenticated users are sent to profile/settings |
| billing | `/{locale}/billing` | Yes | Anonymous redirects to login; authenticated users are sent to organization billing |
| billing | `/{locale}/dashboard/organizations/billing` | Yes | Anonymous redirects to login; authenticated users see billing without crash |
| trust/security | `/{locale}/security-center` | Yes | Anonymous redirects to login; authenticated users see Access Center and RBAC permissions |

## RBAC persona inventory

Authenticated E2E personas are optional locally and run when matching `E2E_*` credentials exist in the environment.

| Persona | Expected visual behavior |
| --- | --- |
| authenticated user without organization | Access Center shows a controlled empty organization state without crash |
| owner | Owner sees admin permission actions such as Manage Billing, Manage Team and Manage Settings |
| admin | Admin route smoke works across protected critical surfaces |
| editor | Editor route smoke works across protected critical surfaces without admin-only permission drift |
| viewer | Viewer does not see admin permission actions such as Manage Billing, Manage Team or Manage Settings |

## Redirect contract

| Source | Expected destination |
| --- | --- |
| `/{locale}/dashboard/*` as anonymous | `/{locale}/login?next=/{locale}/dashboard/*` |
| `/{locale}/vendor-assurance` as anonymous | `/{locale}/login?next=/{locale}/vendor-assurance` |
| `/{locale}/aprovacoes` as anonymous | `/{locale}/login?next=/{locale}/aprovacoes` |
| `/{locale}/security-center` as anonymous | `/{locale}/login?next=/{locale}/security-center` |
| `/undefined/dashboard/organizations/vendors` | Redirect away from `/undefined` to vendor assurance without 500 |
| `/undefined/dashboard/organizations/risks` | Redirect away from `/undefined` to risks without 500 |
| `/{locale}/undefined/dashboard/organizations/documents` | Redirect away from `/undefined` to documents without 500 |

## Deployment target contract

`npm run quality:routes:e2e` runs the route suite against the local app by default. It also runs against preview and production deployments when one of the deployment URL environment variables exists.

| Target | Environment variables | Required behavior |
| --- | --- | --- |
| local | default local Playwright `webServer` | Always runs unless `ROUTE_HEALTH_SKIP_LOCAL=true` |
| preview | `E2E_PREVIEW_URL`, `PREVIEW_DEPLOYMENT_URL`, `VERCEL_BRANCH_URL`, `VERCEL_URL` | Runs when a preview deployment URL exists |
| production | `E2E_PRODUCTION_URL`, `PRODUCTION_DEPLOYMENT_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL` | Runs when a production deployment URL exists |
| additional deployments | comma-separated `E2E_BASE_URLS` | Runs every listed URL |

## Gates

| Command | Responsibility | Merge behavior |
| --- | --- | --- |
| `npm run quality:routes` | Static route/link scan plus required route-health artifact and marker gate | Fails on `/undefined`, missing route-health artifacts or missing coverage markers |
| `npm run quality:routes:e2e` | Playwright route health across local, preview and production targets when configured | Fails on unexpected 404/500, `/undefined`, dead primary controls, broken private redirects or RBAC visual drift |
| `npm run test:e2e` | Full Playwright suite | Runs broader E2E coverage |
| Full Security Suite | Runs route quality gates before branch protection evidence | Blocks CI when a critical route breaks |

## Acceptance criteria mapping

- All critical public and private routes are listed here.
- All critical route families are visited by E2E across `pt`, `en`, `es`, `fr`, `it`, `de`.
- No critical route may return unexpected 404 or 500.
- No visited page or visible link may contain `/undefined`.
- Primary links must not be empty, `#`, or `/undefined`; primary buttons must not be disabled or inert.
- Private pages must redirect anonymous users to localized login and preserve `next`.
- Viewer does not see admin actions.
- Owner sees admin actions.
- Authenticated user without organization gets a controlled empty state without crash.
- Controlled auth error page does not expose a stack trace.
- Mobile viewport smoke coverage runs for critical public routes.
- Preview deployment and production deployment URLs are tested when they exist.
- CI blocks merge when `quality:routes` or `quality:routes:e2e` fails.
