# EuroComply Enterprise UX Checklist

This checklist defines the minimum UX/UI bar for public and authenticated EuroComply surfaces. It is written as an acceptance tool for product, design, frontend, QA and security review.

## 1. Page completeness

Every page must answer these questions before it is considered enterprise-ready:

- What job does this page do for the user?
- What data is real, derived, simulated or unavailable?
- What is the primary action and where does it go?
- What happens when the user cannot take that action?
- What does a buyer, admin, viewer and unauthenticated visitor see?

A page fails review if it contains lorem ipsum, “coming soon” without a useful next step, placeholder metrics presented as real data, disabled primary buttons without explanation, raw framework errors, or routes that land on `/undefined`.

## 2. Required product states

Each data-dependent surface must define the following states using the shared enterprise state pattern:

| State | UX requirement | Security requirement |
| --- | --- | --- |
| Loading | Skeleton or progress copy that names what is loading. Avoid full-screen spinners except during auth/session bootstrap. | Do not reveal tenant identifiers while session is unresolved. |
| Empty | Explain why nothing exists and provide one safe next action. | Do not imply access to objects the user cannot view. |
| Error | Human copy, retry or support path, no stack traces. | Never expose SQL, provider errors, tokens, request IDs unless explicitly safe. |
| Permission denied | Explain role/plan limitation and who can help. | Do not leak object names or counts outside permission scope. |
| Success | Confirm what changed and what happens next. | Avoid exposing hidden fields or internal IDs in toast/copy. |
| Offline/network issue | Preserve user context and provide retry guidance. | Do not retry destructive writes automatically. |

## 3. Dashboard acceptance

The dashboard must provide an executive overview that builds trust within 10 seconds:

- Clear page title and buyer-grade description.
- Compliance status with source/meaning explained.
- Risk summary with severity, owner and next step.
- Pending tasks grouped by priority/SLA.
- Document status with version/review state.
- Audit activity that explains actor, timestamp and entity.
- Billing status gated by role and plan.
- Primary actions must route to working pages or show a permission state.
- Metrics must not pretend placeholder/sample values are live production data.

## 4. Visual consistency

Use a consistent system across public and private pages:

- Spacing: page shell `px-4 sm:px-6 lg:px-8`, section gap `gap-6` or `gap-8`, card padding `p-6` minimum.
- Typography: one page `h1`, descriptive copy under headings, no orphan labels.
- Cards: consistent border radius, border contrast and header/body separation.
- Buttons: one primary action per surface, visible focus ring, no icon-only button without an accessible name.
- Modals: title, description, close affordance, focus trap, escape behavior, error state.
- Tables: visible headers, empty state, row actions, keyboard reachability, responsive fallback.
- Forms: label every control, inline validation, success/error feedback, prevent duplicate submission.

## 5. Accessibility

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

## 6. Responsive behavior

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

## 7. i18n completeness

Existing locales: `pt`, `en`, `es`, `fr`, `it`, `de`.

For every new user-visible string:

- Add locale coverage for all existing locales.
- Avoid hard-coded English in private dashboards unless it is an accepted product term.
- Keep tone formal, concise and compliance-safe.
- Avoid idioms that break translation.
- Test at least one long-string locale for layout wrapping.

## 8. RBAC and permissions

UI must respect permissions before the user clicks:

- Viewer/read-only users do not see destructive or billing-management primary actions.
- Admin/owner actions are labeled and routed clearly.
- Permission denied states are safe and useful.
- Plan-gated features explain the required plan without exposing restricted tenant data.

## 9. E2E and smoke visual gates

Required coverage:

- Public critical routes render in every locale without 404/500, `/undefined`, raw errors or dead primary CTAs.
- Private routes redirect anonymous users to login with `next` preserved.
- Authenticated owner/admin/member/viewer can reach their critical surfaces when credentials are provided.
- Viewer cannot see admin-only actions.
- Mobile viewport passes public critical route smoke.
- Enterprise dashboard smoke checks: headings, CTAs, product-state examples, no placeholder copy, no horizontal overflow.
- Basic visual screenshot smoke captures public home and enterprise dashboard when credentials are available.

## 10. Review sign-off

Before merge, attach evidence in the PR:

- Screenshots or video for desktop and mobile dashboard.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e` or a scoped Playwright command with skipped credential-dependent tests documented.
- Notes for any intentionally deferred page or state.
