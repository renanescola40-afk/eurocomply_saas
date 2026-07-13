# Trial reminder dedupe lookup must fail closed

Date: 2026-07-13
Status: Proposed
Scope: `src/app/api/internal/trial-reminders/route.ts`

## Context

The internal trial-reminder job checks `email_notification_events` before sending a billing trial-ending email. On the base branch, an error from that lookup was reported and then treated as `false`, which is indistinguishable from a trustworthy result that no reminder has been sent.

That behavior could allow the job to send another reminder while its deduplication state was unavailable or unreadable. Repository inspection establishes the control-flow gap only. It does not establish that duplicate production email was sent, that Supabase failed in production, or that a customer incident occurred.

## Decision

Throw the provider error after sanitized observability reporting. The existing route-level handler then returns a no-store `500` response and the job stops before constructing or sending the affected reminder.

A regression test records two repository-side invariants:

1. the dedupe lookup error path throws and does not return `false`;
2. the dedupe check remains before email template construction and delivery.

## Impact

When dedupe state cannot be trusted, the reminder run fails rather than risking an additional email. Normal successful lookup, skip, send, and response behavior is unchanged.

No schema, migration, customer record, secret, provider configuration, schedule, email content, recipient selection, authentication, or authorization change is included.

## Risks and limitations

- A transient dedupe-store error now stops the whole run, delaying reminders until a later successful invocation.
- This change does not make email delivery and dedupe-event persistence atomic.
- A successful email followed by failure to record `email_notification_events` can still permit a retry on a later run. Closing that gap safely requires a separate idempotency or transactional design with schema and concurrency review.
- This change does not prove live provider behavior or production delivery outcomes.

## Tests and evidence

Expected repository checks include the focused Vitest regression, lint, typecheck, unit tests, build, security CI, Full Security Suite, Enterprise Production Gate, CodeQL, Semgrep, Gitleaks, dependency review, Actionlint, and Vercel preview.

GitHub Actions results on the pull request head are the authoritative execution evidence. No check is considered passed until GitHub reports it green.

## Rollback

Revert the pull request. No data, migration, credential, provider, or infrastructure rollback is required. Reverting restores fail-open behavior for dedupe lookup errors.
