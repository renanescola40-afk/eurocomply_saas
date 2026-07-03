# Route and Action Audit

Date: 2026-07-03
Scope: public routes, authenticated routes, CTAs, forms, redirects, mobile smoke and basic keyboard navigation.

## Result

Status: ready for review.

This audit adds deterministic Playwright coverage for route health and product journeys without using live personal data. Public form tests intercept API calls and use synthetic `example.test` addresses. Authenticated journeys are prepared behind explicit seeded QA fixture gates.

## Public routes mapped

| Route | Surface | Expected behavior |
| --- | --- | --- |
| `/{locale}` | landing / waitlist | Renders landing, waitlist CTA and form feedback without `/undefined` links. |
| `/{locale}/pricing` | pricing | Renders plan CTAs for signup, demo and enterprise sales. |
| `/{locale}/trust` | trust | Public Trust Center loads. |
| `/{locale}/security` | security | Public security page loads. |
| `/{locale}/privacy` | privacy | Privacy page loads. |
| `/{locale}/terms` | terms | Terms page loads. |
| `/{locale}/contact` | contact | Contact surface loads and keeps contact actions routable. |
| `/{locale}/book-demo` | book demo | Demo form has submit handler, loading state and feedback state. |
| `/{locale}/login` | login | Anonymous auth entry loads; authenticated users are redirected to onboarding by middleware. |
| `/{locale}/signup` | signup | Plan selection and account creation controls load. |
| `/{locale}/checkout?plan=professional` | checkout | Selected plan checkout page loads with account/sign-in continuation CTAs. |

## Authenticated routes mapped

| Route | Surface | Anonymous behavior | Authenticated behavior |
| --- | --- | --- | --- |
| `/{locale}/onboarding` | onboarding | Redirects to `/{locale}/login?next=...`. | Shows organization activation flow or redirects completed org to dashboard. |
| `/{locale}/dashboard/organizations` | organizations | Redirects to login with `next`. | Shows organization workspace or controlled empty state. |
| `/{locale}/dashboard/organizations/billing` | billing | Redirects to login with `next`. | Shows billing actions and feedback. |
| `/{locale}/dashboard/organizations/team` | team | Redirects to login with `next`. | Owner/admin manage team; lower roles must not see admin-only actions. |
| `/{locale}/dashboard/organizations/documents` | documents | Redirects to login with `next`. | Shows document workspace. |
| `/{locale}/dashboard/organizations/risks` | risks | Redirects to login with `next`. | Shows risk workspace. |
| `/{locale}/vendor-assurance` | vendors | Redirects to login with `next`. | Shows vendor assurance workspace. |
| `/{locale}/dashboard/organizations/reports-governance` | reports | Redirects to login with `next`. | Shows governance reports. |
| `/{locale}/aprovacoes` | approvals/tasks | Redirects to login with `next`. | Shows approvals/tasks. |
| `/{locale}/dashboard/tasks` | tasks | Redirects to login with `next`. | Shows task dashboard. |
| `/{locale}/settings` | settings | Redirects to login with `next`. | Shows settings/profile flow. |
| `/{locale}/ai-systems` | AI systems/inventory | Redirects to login with `next`. | Shows AI systems inventory/readiness. |
| `/{locale}/dashboard/inventario` | legacy inventory | Redirects to login with `next`. | Legacy inventory entry remains controlled. |
| `/{locale}/auditoria` | audit/logs | Redirects to login with `next`. | Shows audit/log surface. |

## Button and action matrix

| Label / CTA | Origin | Destination or action | Public/private | No session | With session | No organization | Member/viewer | Admin/owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Join waitlist / Entrar na lista | landing | `POST /api/prelaunch` | Public | Submit synthetic lead and show loading + feedback. | Same. | Same. | Same. | Same. |
| Pricing / Preços | footer/landing | `/{locale}/pricing` | Public | Pricing loads. | Pricing loads. | Same. | Same. | Same. |
| Start Professional Trial | pricing | `/{locale}/signup?plan=professional` | Public auth-entry | Signup loads selected plan. | Middleware sends to onboarding. | Onboarding required. | Not role scoped before org. | Not role scoped before org. |
| Book a Demo | pricing | `/{locale}/book-demo` | Public | Demo page loads. | Same. | Same. | Same. | Same. |
| Book Business Demo | pricing plan | `/{locale}/book-demo?plan=business` | Public | Demo route loads. | Same. | Same. | Same. | Same. |
| Talk to Sales | pricing plan | `/{locale}/enterprise` | Public | Enterprise route loads. | Same. | Same. | Same. | Same. |
| Review Trust Center | pricing | `/{locale}/trust` | Public | Trust route loads. | Same. | Same. | Same. | Same. |
| Create account and continue | checkout | `/{locale}/signup?plan=<plan>&next=<checkout>` | Public auth-entry | Signup loads and preserves continuation. | Middleware sends to onboarding. | Create org before checkout. | Not role scoped before org. | Not role scoped before org. |
| Sign in to continue | checkout | `/{locale}/login?next=<checkout>` | Public auth-entry | Login loads and preserves continuation. | Middleware sends to onboarding. | Create org before checkout. | Not role scoped before org. | Not role scoped before org. |
| Create workspace before checkout | checkout | `/{locale}/onboarding?next=<checkout>` | Private continuation | Login redirect. | Starts onboarding. | Expected path. | Role applies after org exists. | Role applies after org exists. |
| Continue to secure checkout | billing/checkout | `POST /api/billing/checkout` | Private | Not reachable before login. | Runs with loading/error feedback. | Blocked until org exists. | Must be hidden or blocked by RBAC. | Can start checkout when allowed. |
| Billing portal / Manage billing | org billing | `POST /api/billing/portal` | Private | Not reachable before login. | Runs with loading/error feedback. | Blocked until org exists. | Must be hidden or blocked by RBAC. | Can open portal when allowed. |
| Book demo submit | book-demo | `POST /api/leads` | Public | Submit synthetic demo request and show loading + feedback. | Same. | Same. | Same. | Same. |
| Onboarding complete | onboarding | server action `completeOnboardingActivation` | Private | Login redirect with `next`. | Completes only with seeded QA fixture. | Creates/finishes org setup. | Role assigned after org setup. | Owner continues to dashboard. |
| Dashboard navigation | protected shell | protected links | Private | Login redirect with `next`. | Route loads or controlled empty state. | Controlled empty org state. | No admin-only controls. | Admin controls visible. |

## Playwright coverage added

- `tests/e2e/route-health.spec.ts`
  - Expanded public route health coverage.
  - Expanded private route redirect coverage.
  - Added onboarding, team, AI systems and legacy inventory surfaces.
  - Added checkout, book-demo, privacy, terms, vulnerability-disclosure and password continuation surfaces.
  - Preserves multi-locale coverage for `pt`, `en`, `es`, `fr`, `it`, `de`.

- `tests/e2e/product-critical-journeys.spec.ts`
  - Public journey: landing -> pricing -> signup.
  - Auth redirect journey for protected routes.
  - Waitlist form loading/success feedback.
  - Book demo form loading/success feedback.
  - Billing CTA journey.
  - Trust/security/privacy/terms page load checks.
  - Mobile viewport smoke.
  - Basic keyboard navigation.
  - Seeded authenticated dashboard/onboarding smoke hooks gated by QA env vars.

## Corrections made

- Added missing route coverage for public `book-demo`, `checkout`, `privacy`, `terms`, password continuation and vulnerability disclosure.
- Added missing authenticated route coverage for onboarding, team, AI systems/inventory, legacy inventory and audit/logs.
- Added deterministic product journey tests for CTAs and forms.
- Added API interception for public form tests to avoid external writes.
- Kept all important CTAs visible; no important button was removed to hide a defect.
- Did not add empty placeholder pages.
- Kept i18n route prefixes intact.

## Commands

```bash
npm run test:e2e
npm run quality:routes:e2e
npm run quality:routes
```

Optional seeded authenticated checks:

```bash
E2E_AUTH_STORAGE_STATE=.e2e/storage-state.json npm run test:e2e
E2E_AUTH_STORAGE_STATE=.e2e/storage-state.json E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE=true npm run test:e2e
```

Only run the onboarding write gate in a disposable QA environment with synthetic data.

## Remaining note

The anonymous/public route and CTA flows are deterministic. Full authenticated role validation still requires seeded owner, admin, member and viewer fixtures so RBAC can be asserted without relying on production accounts.
