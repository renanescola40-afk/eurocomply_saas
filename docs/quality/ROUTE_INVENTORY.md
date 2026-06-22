# Route Inventory

This is the canonical route quality contract for EuroComply.

## Objective

Eliminate broken pages, invalid links, `/undefined`, unexpected 404, unexpected 500, dead flows, uncontrolled stack traces and RBAC visual drift.

## Locales

All critical routes use explicit locale prefixes and are covered by E2E for `pt`, `en`, `es`, `fr`, `it` and `de`.

## Public route inventory

| Surface | Canonical route | Critical | Expected behavior |
| --- | --- | --- | --- |
| landing | `/{locale}` | Yes | Public landing renders without 404/500 or `/undefined` |
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
| DPA | `/{locale}/dpa` | No | DPA page renders publicly |
| subprocessors | `/{locale}/subprocessors` | No | Subprocessors page renders publicly |
| status | `/{locale}/status` | No | Status page renders publicly |

## Private route inventory

Anonymous visitors must be redirected to `/{locale}/login?next=<requested path>` for every private route below.

| Surface | Canonical route | Critical | Expected behavior |
| --- | --- | --- | --- |
| dashboard | `/{locale}/dashboard` | Yes | Anonymous redirects; authenticated users see dashboard or controlled empty state |
| organizations | `/{locale}/dashboard/organizations` | Yes | Anonymous redirects; authenticated users see organization workspace or controlled empty state |
| documents | `/{locale}/dashboard/organizations/documents` | Yes | Anonymous redirects; authenticated users see documents without crash |
| vendors | `/{locale}/vendor-assurance` | Yes | Anonymous redirects; authenticated users see vendor assurance without crash |
| risks | `/{locale}/dashboard/organizations/risks` | Yes | Anonymous redirects; authenticated users see risks without crash |
| tasks/approvals | `/{locale}/aprovacoes` | Yes | Anonymous redirects; authenticated users see approvals without crash |
| tasks/approvals | `/{locale}/dashboard/tasks` | Yes | Anonymous redirects; authenticated users see task dashboard without crash |
| reports | `/{locale}/dashboard/organizations/reports-governance` | Yes | Anonymous redirects; authenticated users see reports without crash |
| audit | `/{locale}/auditoria` | Yes | Anonymous redirects; authenticated users see audit without crash |
| settings | `/{locale}/settings` | Yes | Anonymous redirects; authenticated users are sent to profile/settings |
| billing | `/{locale}/billing` | Yes | Anonymous redirects; authenticated users are sent to organization billing |
| billing | `/{locale}/dashboard/organizations/billing` | Yes | Anonymous redirects; authenticated users see billing without crash |
| trust/security | `/{locale}/security-center` | Yes | Anonymous redirects; authenticated users see Access Center and RBAC permissions |

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
| `/undefined/dashboard/organizations/vendors` | Redirect away from `/undefined` to vendor assurance |
| `/undefined/dashboard/organizations/risks` | Redirect away from `/undefined` to risks |
| `/{locale}/undefined/dashboard/organizations/documents` | Redirect away from `/undefined` to documents |

## Gates

| Command | Responsibility | Merge behavior |
| --- | --- | --- |
| `npm run quality:routes` | Static route/link scan plus required route-health artifact gate | Fails on `/undefined` or missing route-health artifacts |
| `npm run quality:routes:e2e` | Playwright route health, redirect, locale, mobile, controlled error and RBAC smoke coverage | Fails on unexpected 404/500, `/undefined`, dead primary controls or RBAC visual drift |
| `npm run test:e2e` | Full Playwright suite | Runs broader E2E coverage |

## Acceptance criteria mapping

- All critical public and private routes are listed here.
- All critical route families are visited by E2E across `pt`, `en`, `es`, `fr`, `it`, `de`.
- No critical route may return unexpected 404 or 500.
- No visited page or visible primary link may contain `/undefined`.
- Private pages redirect anonymous users to localized login.
- Viewer does not see admin actions.
- Owner sees admin actions.
- Authenticated user without organization gets a controlled empty state without crash.
- Controlled auth error page does not expose a stack trace.
- Mobile viewport smoke coverage runs for critical public routes.
- CI blocks merge when `quality:routes` or `quality:routes:e2e` fails.
