# E2E Coverage Matrix

Date: 2026-07-06
Scope: Playwright coverage for route health, critical CTAs, forms, auth redirects, billing entry points, trust/security pages, mobile smoke, keyboard navigation and seeded authenticated flows.

## Acceptance coverage

| Acceptance item | Coverage file | Test / mechanism | Data mode | Status |
| --- | --- | --- | --- | --- |
| Landing -> pricing -> signup | `tests/e2e/product-critical-journeys.spec.ts` | `landing and pricing signup CTAs stay routable and localized` | Public synthetic | Covered |
| Login redirect | `tests/e2e/product-critical-journeys.spec.ts` | `login page accepts next continuation without losing the target` | Public synthetic | Covered |
| Protected route redirect | `tests/e2e/product-critical-journeys.spec.ts` and `tests/e2e/route-health.spec.ts` | Anonymous private routes redirect to localized login and preserve `next` | Public synthetic | Covered |
| Protected route no-store | `tests/e2e/product-critical-journeys.spec.ts` | `anonymous private redirect response is no-store and preserves the next URL` | Public synthetic | Covered |
| Onboarding complete | `tests/e2e/product-critical-journeys.spec.ts` | `onboarding complete journey is guarded behind synthetic fixture opt-in` | Seeded disposable QA only | Gated |
| Dashboard load | `tests/e2e/product-critical-journeys.spec.ts` | `dashboard load journey renders for a seeded authenticated persona` | Seeded storage state | Gated |
| Create AI system | `tests/e2e/product-critical-journeys.spec.ts` | `create AI system journey is guarded behind synthetic fixture opt-in` | Seeded disposable QA only | Gated |
| Create task/document | `tests/e2e/product-critical-journeys.spec.ts` | `create task/document journey is guarded behind synthetic fixture opt-in` | Seeded disposable QA only | Gated |
| Billing CTA | `tests/e2e/product-critical-journeys.spec.ts` | `checkout selected plan shows anonymous account and sign-in CTAs`; `billing CTA renders for a seeded billing-capable persona` | Public synthetic + seeded | Covered/Gated |
| Trust/security pages | `tests/e2e/product-critical-journeys.spec.ts` and `tests/e2e/route-health.spec.ts` | Trust, security, privacy and terms health checks | Public synthetic | Covered |
| Mobile smoke | `tests/e2e/product-critical-journeys.spec.ts` and `tests/e2e/route-health.spec.ts` | 390x844 viewport smoke checks | Public synthetic | Covered |
| Keyboard basic navigation | `tests/e2e/product-critical-journeys.spec.ts` | `landing exposes reachable keyboard targets and avoids focus traps` | Public synthetic | Covered |
| `/undefined` protection | `tests/e2e/route-health.spec.ts` | Legacy undefined route guard | Public synthetic | Covered |
| Public form loading/success | `tests/e2e/product-critical-journeys.spec.ts` | Waitlist and book-demo success tests | API intercepted synthetic | Covered |
| Public form error feedback | `tests/e2e/product-critical-journeys.spec.ts` | Waitlist and book-demo controlled error tests | API intercepted synthetic | Covered |
| Checkout without plan | `tests/e2e/product-critical-journeys.spec.ts` | Missing-plan redirect to pricing with marker | Public synthetic | Covered |

## Route-health coverage

| Route group | Routes covered | Expected anonymous outcome | Expected authenticated/seeded outcome |
| --- | --- | --- | --- |
| Public marketing | `/{locale}`, `/pricing`, `/resources`, `/faq`, `/about`, `/contact`, `/book-demo` | Render without 404/500, stack trace, `/undefined`, or dead primary controls. | Same public rendering unless auth-entry redirect applies. |
| Public trust/legal | `/trust`, `/security`, `/privacy`, `/terms`, `/data-processing`, `/sla`, `/dpa`, `/subprocessors`, `/status`, `/vulnerability-disclosure` | Render without missing pages or broken visible links. | Same. |
| Auth entry | `/login`, `/signup`, `/recuperar-senha`, `/atualizar-senha` | Render controlled auth surfaces. | Authenticated users redirect to onboarding by middleware. |
| Checkout | `/checkout?plan=professional`, `/checkout` | Selected plan renders account/sign-in CTAs; missing plan redirects to pricing marker. | Authenticated users continue to billing or onboarding depending on org state. |
| Core protected | `/onboarding`, `/dashboard`, `/dashboard/organizations`, `/settings` | Redirect to localized login with `next` and no-store. | Seeded tests can render. |
| Org protected | `/dashboard/organizations/team`, `/dashboard/organizations/documents`, `/dashboard/organizations/risks`, `/dashboard/organizations/billing`, `/dashboard/tasks` | Redirect to localized login with `next` and no-store. | Seeded tests can render; RBAC fixtures required for role-specific assertions. |
| Product protected | `/ai-systems`, `/dashboard/inventario`, `/vendor-assurance`, `/aprovacoes`, `/auditoria`, `/security-center` | Redirect to localized login with `next` and no-store. | Seeded tests can render; synthetic write gates required for create/update flows. |

## Action-state coverage

| Action type | Loading state | Error state | Success state | Test strategy |
| --- | --- | --- | --- | --- |
| Link CTA | Browser navigation | 404/500/stack trace assertions | Destination renders | Route health + explicit CTA href assertions |
| Waitlist form | Submit disabled during intercepted pending request | Intercepted 500 checks visible feedback | Intercepted 200 checks status text | Public synthetic |
| Book-demo form | Submit disabled during intercepted pending request | Intercepted 503 checks visible feedback | Intercepted 200 checks live-region text | Public synthetic |
| Billing checkout | Button-level pending expected in component | Error marker/controlled response expected | Stripe redirect/return expected | Public CTA + seeded billing smoke |
| Onboarding write | Pending form state expected | Validation feedback expected | Redirect/dashboard expected | Gated seeded QA only |
| AI system write | Pending state expected | Validation feedback expected | Created item/healthy route expected | Gated seeded QA only |
| Task/document write | Pending state expected | Validation feedback expected | Created item/healthy route expected | Gated seeded QA only |

## Synthetic data policy

- Public tests use `qa+playwright@example.test` and intercepted API responses.
- Authenticated tests require `E2E_AUTH_STORAGE_STATE` generated from a disposable QA user.
- Write flows require explicit gates:
  - `E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE=true`
  - `E2E_ALLOW_SYNTHETIC_APP_WRITES=true`
- These tests must not run against production customer data.

## Commands

```bash
npm run test:e2e
npm run quality:routes:e2e
npm run quality:routes
```

Seeded QA examples:

```bash
E2E_AUTH_STORAGE_STATE=.e2e/storage-state.json npm run test:e2e
E2E_AUTH_STORAGE_STATE=.e2e/storage-state.json E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE=true npm run test:e2e
E2E_AUTH_STORAGE_STATE=.e2e/storage-state.json E2E_ALLOW_SYNTHETIC_APP_WRITES=true npm run test:e2e
```

## Remaining QA gap

Full role-specific RBAC visual assertions still need seeded owner, admin, member/editor and viewer fixtures. The anonymous/public and seeded-smoke coverage is deterministic today; role mutation assertions should be enabled only in a disposable QA Supabase project.
