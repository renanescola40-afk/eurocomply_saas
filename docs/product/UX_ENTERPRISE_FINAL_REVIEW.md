# UX Enterprise Final Review

Status: acceptance checklist. Visual and runtime evidence are required before marking complete.

## Critical journeys

Validate landing, pricing, trust center, login, signup, password recovery, onboarding, organization creation, dashboard, inventory, risks, vendors, documents, tasks, billing, audit logs and settings in every supported locale.

## Mandatory states

Every data-driven surface must define loading, empty, error, success, permission denied, expired session and offline/network states. Errors must provide a safe recovery action and requestId where support correlation is useful. Sensitive details, SQL errors and stack traces must never be rendered.

## Accessibility

- Keyboard-only operation for navigation, dialogs, menus, forms and tables.
- Visible focus that is not removed by custom styles.
- Programmatic labels for controls; icon-only buttons require accessible names.
- `role=status` for non-urgent async feedback and `role=alert` for blocking errors.
- Dialog focus trap and restoration.
- Sufficient contrast and no color-only status meaning.
- Reduced-motion behavior for non-essential animation.
- Tables remain understandable on narrow screens or provide an accessible alternative.

Target: WCAG 2.1 AA where applicable, verified by automated checks plus manual keyboard/screen-reader review.

## Enterprise usability

- Tenant and active organization are always clear.
- Dangerous actions state impact, require confirmation and use step-up where required.
- Permission-denied UI does not imply missing data or encourage repeated retries.
- Long operations expose progress, idempotency and safe retry behavior.
- Audit/history views show actor, action, target, time and outcome without leaking secrets.
- Legal/product copy uses readiness, governance workflows and evidence preparation; it does not claim certification or guaranteed compliance.

## Responsive and visual smoke

Required viewports: representative mobile, tablet and desktop. E2E visual smoke must cover public landing, auth, onboarding, authenticated dashboard, one dense table, one form, permission denied and error state. Snapshots must be reviewed rather than blindly updated.

## Release blockers

No-Go for: inaccessible login/onboarding, broken locale navigation, hidden focus, unusable mobile critical flow, missing permission/session states, misleading compliance claims, or visual regressions that block purchase or core governance work.
