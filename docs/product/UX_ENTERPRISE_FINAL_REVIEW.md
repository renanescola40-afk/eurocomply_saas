# UX Enterprise Final Review

Review date: 2026-07-11

## Scope

This review covers the customer journey and operational UX for landing, pricing, trust center, login, signup, password recovery, onboarding, organization dashboard, billing, documents, risks, vendors, tasks, audit logs and settings.

This is a repository-side review. It does not claim that every browser, viewport and assistive-technology combination has been manually certified.

## Enterprise UX principles

1. Security and permission boundaries must be understandable without exposing internal implementation.
2. A user must always know whether the system is loading, empty, unavailable, forbidden, expired or complete.
3. Destructive and billing actions require explicit scope, confirmation and recovery guidance.
4. Legal/compliance copy must describe support and readiness, not guaranteed outcomes.
5. Localization must preserve meaning, route safety, labels and accessibility.
6. Mobile layouts may simplify density but must not hide required actions or security context.

## Critical journey assessment

### Public marketing and trust

Expected strengths:

- trust content explicitly avoids unsupported certification, audit and compliance guarantees;
- security, privacy, DPA, subprocessors, SLA/status and disclosure surfaces exist;
- pricing and enterprise copy can be reviewed without authentication;
- public health/status language is conservative.

Required checks:

- no contradictory claim appears in metadata, structured data, footer, emails or localized copy;
- primary CTA clearly distinguishes trial/demo/waitlist from a guaranteed enterprise deployment;
- pricing identifies plan limits and what requires a signed agreement;
- trust pages display a review/update date and current limitations;
- vulnerability reports use a dedicated security mailbox when available instead of a personal address.

### Login, signup and session recovery

Required flow:

```text
login/signup -> onboarding -> organization creation when absent -> dashboard organizations
```

UX requirements:

- password recovery and update states are clear;
- invalid/expired links do not leak account existence;
- session-expired state explains that reauthentication is required;
- logout returns to a safe localized public route;
- `next` redirects are same-origin and bounded;
- provider errors are sanitized and actionable;
- no Clerk terminology appears in the runtime experience while Supabase Auth is authoritative.

### Onboarding

The onboarding must allow the user to understand progress, save safely and continue later. Organization creation must not loop between home, login and dashboard.

Required states:

- initial loading/skeleton;
- organization absent;
- form validation error;
- server/network error;
- duplicate organization or membership conflict;
- success and redirect;
- permission/session expired;
- resumable progress where supported.

### Dashboard and operational modules

For documents, risks, vendors, tasks, audit logs and settings, every view should have:

- loading state that preserves layout stability;
- useful empty state with a permitted next action;
- retryable network/server error;
- explicit permission-denied state without revealing restricted data;
- success feedback for mutations;
- session-expired path;
- offline/network degradation messaging where meaningful;
- bounded tables with pagination/filter state;
- responsive actions that remain keyboard accessible.

### Billing

- Show current effective plan and underlying subscription status separately.
- Past-due/unpaid states must not silently appear as active paid entitlement.
- Checkout/portal failures must not reveal Stripe internals.
- Billing actions require server-side permission and may require step-up.
- Cancellation/downgrade copy must explain timing without promising unsupported refunds.

## Accessibility requirements

Target: WCAG 2.1 AA where applicable.

- Visible focus for all keyboard-interactive controls.
- Correct heading hierarchy and landmark regions.
- Accessible names for icon-only buttons.
- `role="status"` or polite live regions for non-blocking progress/success.
- `role="alert"` for blocking validation and submission failures.
- Dialog focus trap, initial focus, Escape behavior and focus restoration.
- Labels, descriptions and errors programmatically associated with inputs.
- Color is not the sole indicator of risk/status.
- Minimum contrast for text, controls and focus indicators.
- Tables expose headers and remain usable at narrow widths.
- Motion respects reduced-motion preferences.
- Toasts do not contain the only copy of critical information.

## Responsive review matrix

Validate at minimum:

- mobile: 360 x 800 and 390 x 844;
- tablet: 768 x 1024;
- desktop: 1280 x 800 and 1440 x 900;
- zoom: 200% on critical forms and tables.

Critical routes:

- localized landing;
- pricing and trust center;
- login/signup/password recovery;
- onboarding;
- dashboard organizations;
- documents upload/list/detail;
- risks/vendors/tasks;
- billing;
- audit logs;
- settings and destructive account/data controls.

## Visual and E2E smoke

The enterprise CI must not report success by skipping Playwright. The required E2E gate now runs after a production build with `PLAYWRIGHT_USE_PRODUCTION_SERVER=true` and fails closed when the script, configuration or runtime is unavailable.

Visual smoke should capture screenshots only with synthetic data and must redact email addresses, organization names, document content, billing identifiers and security tokens. Recommended assertions:

- page does not horizontally overflow;
- primary navigation and page title are visible;
- no unhandled error boundary;
- protected route redirects unauthenticated users;
- session-expired and permission-denied states are reachable;
- mobile menu/dialog focus works;
- localized routes do not produce `/undefined` paths;
- critical CTA and form labels remain visible at 200% zoom.

## Legal and trust copy

Allowed positioning includes AI Act readiness, governance workflows, evidence preparation, risk visibility, compliance operations support, trust documentation and procurement support.

Prohibited without evidence:

- fully compliant or guaranteed compliance;
- certified, audited or pentested;
- SOC 2 ready/compliant or ISO certified;
- automatic EU AI Act compliance;
- replacement for lawyers, DPOs or compliance officers;
- 24/7 support/monitoring without real staffing and process;
- immutable logs without external immutability proof.

## Current UX risks

- Repository-side checks cannot prove all loading/error/permission/offline states are visually complete.
- Production-like E2E evidence for the exact release commit is not yet available.
- Manual screen-reader and keyboard audit evidence is not attached.
- Live status integration is pending; public status wording must remain explicit about that limitation.
- A personal email remains in vulnerability disclosure content until a dedicated security mailbox is provisioned.
- Mobile/tablet screenshot evidence for every critical authenticated route is incomplete.

## Release decision for UX

Repository structure and copy controls are strong enough for continued hardening and a controlled internal/staging pilot. Enterprise public production remains No-Go until mandatory E2E passes for the promoted commit and the critical journey/accessibility evidence is reviewed.
