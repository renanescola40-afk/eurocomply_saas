# Trial reminder authentication rate limit

Date: 2026-07-14
Status: Proposed
Scope: `GET|POST /api/internal/trial-reminders`

## Decision

Apply the shared distributed internal-authentication rate limiter before validating the internal cron credential for the trial-reminder endpoint.

The route uses the fixed scope `/api/internal/trial-reminders` and action `authenticate_trial_reminder_job`. The shared control is fail-closed: when it cannot make a trustworthy decision, the request must not reach credential validation, privileged database access, user-email resolution, or email delivery.

## Motivation

A successful invocation creates an admin Supabase client, enumerates trialing subscriptions across organizations, resolves organization-owner email addresses, sends billing-related email, and writes completion records. Before this change, repeated unauthenticated requests reached secret validation without the repository's shared distributed authentication throttle.

This is a concrete abuse-resistance and operational-safety gap. The change reduces brute-force and request-amplification exposure without changing valid cron credentials or the authorized job behavior.

## Impact

- Requests denied by the shared limiter return its existing no-store `429` or fail-closed `503` response.
- Credential validation and all downstream work occur only after the limiter allows the request.
- Authorized reminder selection, deduplication, provider idempotency, templates, completion recording, response schema, and `GET` compatibility remain unchanged.
- No database schema, secret, schedule, provider configuration, or tenant data is changed.

## Risks and limitations

- A rate-limit backend outage can temporarily block legitimate reminder execution. This availability trade-off is intentional for a privileged cross-organization email job.
- This control does not replace strong secret rotation, scheduler authentication, monitoring, provider idempotency, or completion-record integrity.
- The source-level regression test verifies policy wiring and execution order. It is not runtime evidence, a penetration test, or proof of production configuration.

## Validation

Relevant review and CI checks should include:

- the focused Vitest source-order regression test;
- TypeScript and lint checks;
- repository security gates;
- build and existing test suites.

No production invocation or email delivery was performed as evidence for this decision.

## Rollback

Revert the route import, constants, and pre-authentication limiter call together with the focused test and this decision record. Rollback restores the previous behavior and should only be used if the shared limiter causes a confirmed operational regression that cannot be corrected safely.
