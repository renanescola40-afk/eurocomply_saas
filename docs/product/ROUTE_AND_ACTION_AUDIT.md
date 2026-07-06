# Route and Action Audit

Date: 2026-07-06
Owner role: Senior QA Engineer / Frontend Product Engineer
Scope: localized public routes, authenticated routes, CTA/link/action behavior, form states, redirects, mobile smoke, keyboard navigation and no-store guards.

## Result

Status: ready for review.

This audit maps the critical product surface and backs it with deterministic Playwright coverage. Public form tests intercept network calls and use synthetic `example.test` data. Authenticated create/update flows are represented as opt-in seeded QA tests so production accounts and real customer data are never used.

## Route matrix

| Route | Public/private | Needs auth? | Needs org? | Needs role? | Expected without session | Expected with session | Expected without organization | Expected with insufficient permission |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/{locale}` | Public | No | No | No | Landing renders; no `/undefined`; waitlist form works. | Middleware redirects authenticated users to `/{locale}/onboarding`. | Same redirect to onboarding. | Not role-scoped. |
| `/{locale}/pricing` | Public | No | No | No | Pricing renders; plan CTAs route to signup/demo/enterprise. | Pricing renders unless user enters auth routes. | Same. | Not role-scoped. |
| `/{locale}/signup` | Public auth-entry | No | No | No | Signup renders selected plan and preserves `next`. | Middleware redirects to `/{locale}/onboarding`. | User must create org after auth. | Not role-scoped before org. |
| `/{locale}/login` | Public auth-entry | No | No | No | Login renders and preserves `next`. | Middleware redirects to `/{locale}/onboarding`. | User must create org after auth. | Not role-scoped before org. |
| `/{locale}/checkout?plan=<plan>` | Public continuation | No for view; yes for checkout action | Yes for paid checkout | Owner/admin for billing action | Checkout summary renders account/sign-in CTAs. | Shows billing action if org exists; otherwise onboarding CTA. | `Create workspace before checkout`. | Billing action hidden/blocked by API/RBAC. |
| `/{locale}/checkout` | Public guarded redirect | No | No | No | Redirects to `/{locale}/pricing?checkout=select_plan`. | Same. | Same. | Same. |
| `/{locale}/book-demo` | Public | No | No | No | Demo form loads with loading/error/success feedback. | Same. | Same. | Same. |
| `/{locale}/trust` | Public | No | No | No | Trust Center loads. | Same. | Same. | Same. |
| `/{locale}/security` | Public | No | No | No | Security page loads. | Same. | Same. | Same. |
| `/{locale}/privacy` | Public | No | No | No | Privacy page loads. | Same. | Same. | Same. |
| `/{locale}/terms` | Public | No | No | No | Terms page loads. | Same. | Same. | Same. |
| `/{locale}/vulnerability-disclosure` | Public | No | No | No | Disclosure page loads. | Same. | Same. | Same. |
| `/{locale}/contact` | Public | No | No | No | Contact route loads; sales query params are safe. | Same. | Same. | Same. |
| `/{locale}/onboarding` | Private | Yes | No to start; creates/selects org | Authenticated user | Redirects to `/{locale}/login?next=...` with `Cache-Control: private, no-store`. | Shows activation flow or redirects completed org to dashboard. | Shows create organization path. | Not role-scoped before org exists. |
| `/{locale}/dashboard` | Private | Yes | Usually yes | Member+ | Redirects to login with `next` and no-store. | Dashboard shell loads or routes to org dashboard. | Controlled no-organization state/onboarding. | Admin-only controls hidden/blocked. |
| `/{locale}/dashboard/organizations` | Private | Yes | Yes | Member+ | Redirects to login with `next` and no-store. | Organization dashboard loads. | Controlled empty org state/onboarding. | Admin-only controls hidden/blocked. |
| `/{locale}/dashboard/organizations/team` | Private | Yes | Yes | Owner/admin for management | Redirects to login with `next` and no-store. | Team page loads. | Controlled empty org state/onboarding. | Viewer/member must not see invite/remove controls; API must reject. |
| `/{locale}/dashboard/organizations/billing` | Private | Yes | Yes | Owner/admin | Redirects to login with `next` and no-store. | Billing page/action controls load. | Create organization before checkout. | Billing portal/checkout hidden or rejected. |
| `/{locale}/dashboard/organizations/documents` | Private | Yes | Yes | Member+; writer for create | Redirects to login with `next` and no-store. | Documents page loads. | Controlled empty org state/onboarding. | Create/edit actions hidden or rejected. |
| `/{locale}/dashboard/organizations/risks` | Private | Yes | Yes | Member+; writer for create | Redirects to login with `next` and no-store. | Risks page loads. | Controlled empty org state/onboarding. | Mutations hidden or rejected. |
| `/{locale}/vendor-assurance` | Private | Yes | Yes | Member+; writer for create | Redirects to login with `next` and no-store. | Vendor assurance page loads. | Controlled empty org state/onboarding. | Mutations hidden or rejected. |
| `/{locale}/aprovacoes` | Private | Yes | Yes | Member+ | Redirects to login with `next` and no-store. | Approvals/tasks page loads. | Controlled empty org state/onboarding. | Approve/assign actions hidden or rejected. |
| `/{locale}/dashboard/tasks` | Private | Yes | Yes | Member+ | Redirects to login with `next` and no-store. | Task dashboard loads. | Controlled empty org state/onboarding. | Restricted actions hidden/rejected. |
| `/{locale}/ai-systems` | Private | Yes | Yes | Member+; writer for create | Redirects to login with `next` and no-store. | AI systems inventory loads. | Controlled empty org state/onboarding. | Create/edit actions hidden or rejected. |
| `/{locale}/dashboard/inventario` | Private legacy | Yes | Yes | Member+ | Redirects to login with `next` and no-store. | Legacy inventory remains controlled. | Controlled empty org state/onboarding. | Restricted actions hidden/rejected. |
| `/{locale}/auditoria` | Private | Yes | Yes | Admin/owner or audit-enabled role | Redirects to login with `next` and no-store. | Audit surface loads. | Controlled empty org state/onboarding. | Audit details hidden or rejected. |
| `/{locale}/settings` | Private | Yes | Usually no | Authenticated user | Redirects to login with `next` and no-store. | Settings/profile loads. | Organization-specific panels show setup state. | Admin-only settings hidden/rejected. |
| `/{locale}/security-center` | Private | Yes | Yes | Admin/owner recommended | Redirects to login with `next` and no-store. | Security access center loads. | Controlled empty org state/onboarding. | Sensitive controls hidden/rejected. |

## Action matrix

| Label / CTA | Origin page | Destination or action | Expected click behavior | Loading state | Error state | Success state | Mobile behavior | Required role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Join waitlist` / `Entrar na lista` | Landing | `POST /api/prelaunch` | Submits synthetic lead data and stays on landing. | Submit disabled while request is pending. | Inline status/alert; no raw stack trace. | Inline status confirms waitlist. | Form remains visible and tappable. | Public |
| `Pricing` / `Preços` | Landing/header/footer | `/{locale}/pricing` | Navigates to pricing. | Link navigation. | 404/500 fails route-health. | Pricing page renders. | Visible or accessible via mobile header/footer. | Public |
| `Start Essential` | Pricing card | `/{locale}/signup?plan=essential` | Opens signup with selected plan. | Link navigation. | Signup route must render controlled error if auth fails. | Signup page renders. | CTA remains tappable. | Public |
| `Start Professional Trial` | Pricing hero/card | `/{locale}/signup?plan=professional` | Opens signup with selected plan. | Link navigation. | Signup route must render controlled error if auth fails. | Signup page renders. | CTA remains tappable. | Public |
| `Book a Demo` | Pricing hero | `/{locale}/book-demo` | Opens demo form. | Link navigation. | Demo route must not 404/500. | Demo page renders. | CTA remains tappable. | Public |
| `Book Business Demo` | Pricing business card | `/{locale}/book-demo?plan=business` | Opens demo form with sales context. | Link navigation. | Demo route must not 404/500. | Demo page renders. | CTA remains tappable. | Public |
| `Talk to Sales` | Pricing enterprise card | `/{locale}/enterprise` | Opens enterprise/sales page. | Link navigation. | Enterprise route must not 404/500. | Enterprise page renders. | CTA remains tappable. | Public |
| `Review Trust Center` | Pricing hero | `/{locale}/trust` | Opens Trust Center. | Link navigation. | Trust route must not 404/500. | Trust page renders. | CTA remains tappable. | Public |
| `Book demo` submit | Book-demo form | `POST /api/leads` | Submits synthetic demo request. | Submit disabled while request is pending. | Inline live region/alert. | Live region confirms receipt. | Form fields remain usable on 390px viewport. | Public |
| `Create account and continue` | Checkout | `/{locale}/signup?plan=<canonical-plan>&next=<checkout>` | Opens signup and preserves checkout continuation. | Link navigation. | Signup route controlled. | Signup renders. | Full-width CTA. | Public |
| `Sign in to continue` | Checkout | `/{locale}/login?next=<checkout>` | Opens login and preserves checkout continuation. | Link navigation. | Login route controlled. | Login renders. | Full-width CTA. | Public |
| `Create workspace before checkout` | Checkout with signed-in user and no org | `/{locale}/onboarding?next=<checkout>` | Starts organization creation before billing. | Link navigation. | Onboarding error state controlled. | Organization can be created in seeded QA env. | Full-width CTA. | Authenticated user |
| `Continue to secure checkout` | Billing/checkout | Billing checkout API via `BillingActionButton` | Starts Stripe checkout for selected plan. | Button pending/disabled. | Inline/error toast and redirect marker. | Browser leaves for Stripe or returns success. | Full-width CTA. | Owner/admin |
| `Billing portal` / `Manage billing` | Org billing | Billing portal API via `BillingActionButton` | Opens Stripe billing portal. | Button pending/disabled. | Inline/error toast and redirect marker. | Portal opens/redirects. | Full-width CTA. | Owner/admin |
| `Onboarding complete` | Onboarding | Server action / Supabase writes | Completes organization setup only in synthetic QA. | Pending form state. | Inline validation feedback. | Redirects to organization dashboard. | Wizard remains usable on mobile. | Authenticated user |
| `Create AI system` | AI systems inventory | App write action/API | Creates synthetic AI system only in disposable QA. | Pending/disabled. | Inline validation feedback. | New system appears or route stays healthy. | Primary create CTA accessible. | Writer/admin/owner |
| `Create task/document` | Documents/tasks | App write action/API | Creates synthetic task/document only in disposable QA. | Pending/disabled. | Inline validation feedback. | New item appears or route stays healthy. | Primary create CTA accessible. | Writer/admin/owner |
| Dashboard navigation links | Protected shell | Localized protected routes | Navigate without `/undefined` or placeholder href. | Link navigation. | Protected route redirects anonymous users safely. | Target route renders/empty state. | Mobile nav exposes usable controls. | Member+ depending on page |

## Corrections and coverage changes

- Expanded product E2E coverage for pricing CTA hrefs, checkout missing-plan redirect, login `next` continuation, private redirect no-store, public form error states and seeded authenticated hooks.
- Kept every important CTA in place; no important button was removed just to satisfy tests.
- Kept i18n localized paths (`/{locale}/...`) in all new tests and docs.
- Kept write-path E2E checks behind `E2E_AUTH_STORAGE_STATE` plus explicit synthetic write gates.
- Preserved the existing `/undefined` route normalization coverage and strengthened public/private route-health expectations.

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
E2E_AUTH_STORAGE_STATE=.e2e/storage-state.json E2E_ALLOW_SYNTHETIC_APP_WRITES=true npm run test:e2e
```

Only run synthetic write gates in a disposable QA Supabase project.
