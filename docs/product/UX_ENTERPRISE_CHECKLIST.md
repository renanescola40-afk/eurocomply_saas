# EuroComply Enterprise UX Checklist

This checklist defines the minimum UX/UI bar for public and authenticated EuroComply surfaces. It is written as an acceptance tool for product, design, frontend, QA and security review.

## 1. Audit scope

Public and private pages must be reviewed as buyer-facing product, not as internal prototypes.

| Surface | Review goal | Current gate |
| --- | --- | --- |
| Public marketing routes | Clear proposition, trustworthy CTAs, no generic SaaS filler | `tests/e2e/enterprise-ux.spec.ts` public visual smoke |
| Authentication and onboarding | Safe redirects, preserved intent, no raw auth errors | Protected route and enterprise smoke checks |
| Organization dashboard | Executive readiness, risk, work, evidence, vendors, audit and billing | Enterprise overview component and authenticated visual smoke |
| Documents, risks, approvals and vendors | Clear empty/error/permission states and safe next action | Route health plus page-level review before release |
| Billing and plan-gated flows | Role-aware actions and upgrade copy | Enterprise dashboard billing status and add-ons/pricing routes |

## 2. Page completeness

Every page must answer these questions before it is considered enterprise-ready:

- What job does this page do for the user?
- What data is real, derived, simulated or unavailable?
- What is the primary action and where does it go?
- What happens when the user cannot take that action?
- What does a buyer, admin, viewer and unauthenticated visitor see?

A page fails review if it contains lorem ipsum, “coming soon” without a useful next step, sample metrics presented as production data, disabled primary buttons without explanation, raw framework errors, or routes that land on `/undefined`.

## 3. Required product states

Each data-dependent surface must define the following states using the shared enterprise state pattern:

| State | UX requirement | Security requirement |
| --- | --- | --- |
| Loading | Skeleton or progress copy that names what is loading. Avoid full-screen spinners except during auth/session bootstrap. | Do not reveal tenant identifiers while session is unresolved. |
| Empty | Explain why nothing exists and provide one safe next action. | Do not imply access to objects the user cannot view. |
| Error | Human copy, retry or support path, no stack traces. | Never expose SQL, provider errors, tokens or internal IDs. |
| Permission denied | Explain role/plan limitation and who can help. | Do not leak object names or counts outside permission scope. |
| Success | Confirm what changed and what happens next. | Avoid exposing hidden fields or internal IDs in toast/copy. |
| Offline/network issue | Preserve user context and provide retry guidance. | Do not retry destructive writes automatically. |

Implementation reference: `src/components/dashboard/enterprise-dashboard-overview.tsx` renders visible `role="status"` and `role="alert"` examples for the dashboard control room. Downstream pages should reuse the same copy tone and aria behavior.

## 4. Dashboard acceptance

The dashboard must provide an executive overview that builds trust within 10 seconds:

- Clear page title and buyer-grade description.
- Compliance status with source/meaning explained.
- Risk summary with severity and next step.
- Pending tasks grouped by priority/SLA.
- Document status with review and expiry signal.
- Vendor status for third-party exposure.
- Audit activity that explains actor/timestamp/entity when available.
- Billing status gated by role and plan.
- Primary actions route to working pages or show a permission state.
- Metrics must not pretend sample values are live production data.

Current implementation gate:

- `src/app/[locale]/dashboard/organizations/page.tsx` localizes hero copy, plan intent, quick links and enterprise overview.
- `src/lib/i18n/dashboard-copy.ts` includes dashboard enterprise copy for `en`, `pt`, `es`, `fr`, `it`, `de`.
- `tests/e2e/enterprise-ux.spec.ts` checks the dashboard heading, compliance/risk/task/document/vendor/audit/billing panels and standardized states.

## 5. Visual consistency

Use a consistent system across public and private pages:

- Spacing: page shell `px-4 sm:px-6 lg:px-8`, section gap `gap-6` or `gap-8`, card padding `p-6` minimum.
- Typography: one page `h1`, descriptive copy under headings, no orphan labels.
- Cards: consistent border radius, border contrast and header/body separation.
- Buttons: one primary action per surface, visible focus ring, no icon-only button without an accessible name.
- Modals: title, description, close affordance, focus trap, escape behavior, error state.
- Tables: visible headers, empty state, row actions, keyboard reachability, responsive fallback.
- Forms: label every control, inline validation, success/error feedback, prevent duplicate submission.

## 6. Accessibility

Minimum accessibility gates:

- All inputs have programmatic labels.
- All icon-only controls have `aria-label` or visible text.
- Keyboard tab order follows visual order.
- Focus states are visible against dark and light backgrounds.
- Interactive cards must be buttons/links, not clickable divs unless fully keyboard-enabled.
- Error and network states use `role="alert"` or `aria-live="assertive"`.
- Loading and success states use `role="status"` or `aria-live="polite"`.
- Color is never the only way to communicate status.
- Text/background contrast is checked for normal and muted text.

## 7. Responsive behavior

Every critical flow must be reviewed at:

- Mobile: 390 × 844
- Tablet: 768 × 1024
- Desktop: 1440 × 900

Pass criteria:

- No horizontal scrolling for standard content.
- Primary action remains reachable without opening devtools-level gymnastics.
- Navigation is usable by touch and keyboard.
- Tables/cards collapse into readable stacked layouts.
- Sticky headers do not hide form fields or focus targets.

## 8. i18n completeness

Existing locales: `pt`, `en`, `es`, `fr`, `it`, `de`.

For every new user-visible string:

- Add locale coverage for all existing locales.
- Avoid hard-coded English in private dashboards unless it is an accepted product term.
- Keep tone formal, concise and compliance-safe.
- Avoid idioms that break translation.
- Test at least one long-string locale for layout wrapping.

## 9. RBAC and permissions

UI must respect permissions before the user clicks:

- Viewer/read-only users do not see destructive or billing-management primary actions.
- Admin/owner actions are labeled and routed clearly.
- Permission denied states are safe and useful.
- Plan-gated features explain the required plan without exposing restricted tenant data.

## 10. E2E and smoke visual gates

Required coverage:

- Public critical routes render in every locale without 404/500, `/undefined`, raw errors or dead primary CTAs.
- Private routes redirect anonymous users to login with `next` preserved where applicable.
- Authenticated owner/admin/member/viewer can reach their critical surfaces when credentials are provided.
- Viewer cannot see admin-only actions.
- Mobile viewport passes public and dashboard smoke.
- Tablet viewport passes dashboard smoke and keyboard focus.
- Enterprise dashboard smoke checks: headings, CTAs, product-state examples, no template copy, no horizontal overflow.
- Basic visual screenshots capture public home and enterprise dashboard when credentials are available.

Recommended command:

```bash
npx playwright test tests/e2e/enterprise-ux.spec.ts
```

Credential-dependent tests are skipped unless `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD` are present.

## 11. Review sign-off

Before merge, attach evidence in the PR:

- Screenshots or video for desktop, tablet and mobile dashboard.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npx playwright test tests/e2e/enterprise-ux.spec.ts`
- Notes for any intentionally deferred page or state.
