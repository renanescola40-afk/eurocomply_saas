# E2E Coverage Matrix

Date: 2026-08-14  
Scope: Playwright coverage for public acquisition, auth redirects, localized commercial surfaces, paid-access recovery, role-aware billing UX and opt-in authenticated product smoke.

## Current completion status

- **Automated public/anonymous coverage:** deterministic coverage exists for critical public routes, CTA actionability, protected redirects, no-store, localized pricing/auth/checkout, mobile overflow and runtime-error smoke.
- **Authenticated commercial smoke:** executable opt-in tests now exist in `tests/e2e/authenticated-commercial-acceptance.spec.ts` for paid owner/admin/member/viewer personas and blocked subscription states.
- **Synthetic writes:** first-AI-system creation is executable only when a disposable paid-owner fixture and `E2E_ALLOW_SYNTHETIC_APP_WRITES=true` are explicitly provided.
- **Not yet executable end-to-end:** onboarding completion writes, task/document create/edit/delete, and full role-specific mutation matrices remain open QA work. They are not counted as covered.
- **Real Stripe payment return:** remains blocked on the authoritative billing handoff tracked in issue #1650; repository smoke is not proof of live provider behavior.

## CI gate

`npm run quality:routes` validates route-health and product route/action audit artifacts. Product acceptance additionally relies on:

- `tests/e2e/product-critical-journeys.spec.ts`
- `tests/e2e/authenticated-commercial-acceptance.spec.ts`
- `tests/e2e/route-health.spec.ts`
- `tests/i18n/commercial-surface-locale-continuity.test.ts`
- `tests/security/billing-ui-api-boundary.test.ts`

## Acceptance coverage

| Acceptance item | Coverage file | Data mode | Current status |
| --- | --- | --- | --- |
| Landing -> pricing -> signup/login | `tests/e2e/product-critical-journeys.spec.ts` | Public | Covered |
| PT/ES/FR/IT/DE pricing -> checkout -> login -> signup locale continuity | `tests/e2e/product-critical-journeys.spec.ts` | Public | Covered |
| Protected route redirect + preserved `next` | `tests/e2e/product-critical-journeys.spec.ts` | Public | Covered |
| Protected redirect `no-store` | `tests/e2e/product-critical-journeys.spec.ts` | Public | Covered |
| Mobile 390x844 purchase/auth overflow | `tests/e2e/product-critical-journeys.spec.ts` | Public | Covered |
| Active paid owner dashboard | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | `E2E_OWNER_STORAGE_STATE` | Executable, fixture-gated |
| Active paid admin/member/viewer dashboard | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Role-specific storage states | Executable, fixture-gated |
| Owner vs non-owner billing controls | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Role-specific storage states | Executable, fixture-gated |
| Existing paid owner recurring routes | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Paid owner fixture | Executable, fixture-gated |
| First AI system creation | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Disposable owner + write gate | Executable, write-gated |
| Canceled subscription fails closed | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | `E2E_CANCELED_STORAGE_STATE` | Executable, fixture-gated |
| `past_due` subscription fails closed | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | `E2E_PAST_DUE_STORAGE_STATE` | Executable, fixture-gated |
| `unpaid` subscription fails closed | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | `E2E_UNPAID_STORAGE_STATE` | Executable, fixture-gated |
| FRIA route load | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Paid owner fixture | Executable, fixture-gated |
| Evidence/document route load | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Paid owner fixture | Executable, fixture-gated |
| Audit route load | `tests/e2e/authenticated-commercial-acceptance.spec.ts` | Paid owner fixture | Executable, fixture-gated |
| Onboarding completion write | — | Disposable QA required | **Open** |
| Task/document create/edit/delete | — | Disposable QA required | **Open** |
| Admin/member/viewer mutation-denied matrix | — | Disposable role fixtures required | **Open** |
| Real Stripe success return with delayed webhook | issue #1650 / provider-backed E2E | Stripe test runtime | **Blocked** |

## Route-quality contract index

The route-quality gate checks for stable coverage labels as a fail-closed documentation contract. Presence in this index means the scenario is explicitly tracked; it does **not** turn an `Open`, fixture-gated or provider-blocked scenario into runtime evidence.

| Contract marker | Evidence / boundary | Status |
| --- | --- | --- |
| Login redirect | Public auth/continuation coverage in `tests/e2e/product-critical-journeys.spec.ts` | Covered |
| Protected route no-store | Anonymous protected redirects assert cache-safe behavior | Covered |
| Onboarding complete | Completion mutation requires disposable QA execution | **Open** |
| Dashboard load | Role-specific authenticated storage states | Executable, fixture-gated |
| Create AI system | Explicit synthetic app-write opt-in on disposable paid-owner fixture | Executable, write-gated |
| Create task/document | Disposable mutation fixtures are still required | **Open** |
| Billing CTA | Public purchase route plus role-aware authenticated billing controls | Covered / fixture-gated |
| Trust/security pages | Public trust/security route smoke | Covered |
| Mobile smoke | 390x844 purchase/auth overflow and public conversion smoke | Covered |
| Keyboard basic navigation | Public critical controls retain keyboard/focus coverage | Covered |
| Public form loading/success | Deterministic public form state coverage | Covered |
| Public form error feedback | Deterministic controlled-error feedback coverage | Covered |
| Checkout without plan | Missing-plan checkout remains a controlled route state | Covered |
| Synthetic data policy | Synthetic writes are restricted to disposable QA fixtures and explicit opt-in | Enforced |
| E2E_AUTH_STORAGE_STATE | General seeded-fixture contract retained for route-quality compatibility; commercial acceptance uses role-specific storage states | Fixture contract |
| E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE | Reserved explicit opt-in boundary for disposable onboarding writes; onboarding completion is not claimed as executed here | **Open / not runtime proof** |
| E2E_ALLOW_SYNTHETIC_APP_WRITES | Explicit opt-in required for disposable product writes | Enforced |

## Authenticated fixture contract

The authenticated suite never assumes production accounts. Each persona requires its own explicit storage-state file:

- `E2E_OWNER_STORAGE_STATE`
- `E2E_ADMIN_STORAGE_STATE`
- `E2E_MEMBER_STORAGE_STATE`
- `E2E_VIEWER_STORAGE_STATE`
- `E2E_CANCELED_STORAGE_STATE`
- `E2E_PAST_DUE_STORAGE_STATE`
- `E2E_UNPAID_STORAGE_STATE`

Synthetic product writes require:

```bash
E2E_ALLOW_SYNTHETIC_APP_WRITES=true
```

The storage states must point to disposable QA users/workspaces. Do not use production customer sessions or production customer data.

## Route-health coverage

| Route group | Anonymous expectation | Authenticated/seeded expectation |
| --- | --- | --- |
| Public marketing | Render without 404/500/runtime error or dead primary controls. | Same public rendering unless auth-entry redirect applies. |
| Public trust/legal | Render controlled public pages without missing routes or broken critical links. | Same. |
| Auth entry | Render localized controlled auth surfaces. | Authenticated users follow middleware continuation policy. |
| Checkout | Selected self-serve plan exposes account/sign-in continuation; missing plan is controlled. | Existing subscription/org state controls the next action. |
| Core protected | Redirect anonymous visitor to localized login with `next` and no-store. | Paid fixtures render or commercial access policy redirects. |
| Product protected | Redirect anonymous visitor to localized login. | Paid fixtures can smoke dashboard, AI systems, FRIA, evidence and audit routes. |

## Action-state coverage

| Action type | Current executable evidence |
| --- | --- |
| Link CTA | Route navigation + runtime health assertions |
| Public purchase/auth journey | Localized route smoke + actionable links + mobile overflow |
| Billing controls | Role-aware source contract + fixture-gated owner/non-owner browser assertions |
| AI system write | Disposable paid-owner fixture + explicit write gate |
| Onboarding write | Open |
| Task/document writes | Open |
| Payment success return | Blocked on #1650 and real Stripe test-mode evidence |

## Commands

```bash
npm run test:e2e
npm run quality:routes:e2e
npm run quality:routes
```

Example disposable QA run:

```bash
E2E_OWNER_STORAGE_STATE=.e2e/owner.json \
E2E_ADMIN_STORAGE_STATE=.e2e/admin.json \
E2E_MEMBER_STORAGE_STATE=.e2e/member.json \
E2E_VIEWER_STORAGE_STATE=.e2e/viewer.json \
npm run test:e2e
```

Write-enabled example:

```bash
E2E_OWNER_STORAGE_STATE=.e2e/owner.json \
E2E_ALLOW_SYNTHETIC_APP_WRITES=true \
npm run test:e2e tests/e2e/authenticated-commercial-acceptance.spec.ts
```

## Remaining QA gap

Final Product/Commercial PASS still requires actual disposable-fixture execution for role-specific authenticated flows, onboarding completion/mutations, task/document mutations, and the provider-backed Stripe success-return path. Skipped fixture-gated tests are capability, not proof of runtime PASS.
