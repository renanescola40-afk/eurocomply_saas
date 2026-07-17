# Enumeration-safe account recovery

- Status: Accepted
- Date: 2026-07-17
- Scope: public recovery request, localized reset completion, exact-SHA enterprise evidence

## Context

The product exposed a localized account-recovery information page, and the browser auth context contained a Supabase password-reset helper, but there was no usable recovery form, no localized password-reset completion route, and no login entrypoint. The configured redirect pointed to `/reset-password`, which did not exist and was not included in the middleware public-route allowlist.

That left users unable to complete a basic account recovery journey. A naive public implementation would also create account-enumeration, brute-force, open-redirect, provider-error disclosure, cache, and abuse risks.

## Decision

Account recovery is implemented as two separate controls.

### Recovery request

`POST /api/auth/recovery` is a deliberately public mutation with a dedicated security contract. It:

- accepts only bounded JSON;
- validates trusted Origin;
- uses the fail-closed `password-reset` distributed rate-limit policy;
- hashes the normalized email before it is used in the limiter key;
- validates the email and locale;
- builds a same-origin localized `/reset-password` redirect;
- calls the Supabase public Auth recovery API server-side;
- returns one generic success message that does not confirm whether an account exists;
- returns no-store responses;
- reports only stable internal error categories and a provider code, never email values or raw provider messages.

Provider or configuration failure returns the same sanitized `503 account_recovery_unavailable` response for every valid email shape. This is operationally truthful without revealing account existence.

### Password reset completion

The localized `/[locale]/reset-password` page waits for a valid Supabase recovery session before showing password fields. It:

- accepts the `PASSWORD_RECOVERY` auth event or an existing recovery session;
- requires a minimum of eight characters, consistent with signup;
- requires password confirmation;
- calls `supabase.auth.updateUser({ password })` only after the recovery session is ready;
- signs out after a successful change so the user authenticates again;
- exposes stable invalid, expired, success, and unavailable states;
- never renders, logs, stores, or persists recovery tokens or passwords.

The browser Supabase stub also fails safely when public provider configuration is absent, rather than throwing an undefined-method error.

## Public-route exception

The enterprise API security scanner normally requires authentication, organization context, and RBAC for mutations. Account recovery cannot require an authenticated user, so it has a narrow route-specific exception backed by a stronger public-recovery contract. The exception still requires Origin protection, no-store responses, bounded JSON, the dedicated fail-closed limiter, privacy-safe keying, generic enumeration-resistant messaging, same-origin redirect construction, and sanitized provider failure handling.

This exception applies only to `src/app/api/auth/recovery/route.ts`.

## Evidence

The scorecard workflow generates `docs/security/evidence/runtime/auth-recovery-validation.json` for the exact assessed SHA. Promotion requires:

- all recovery source contracts;
- route tests;
- Playwright recovery UX tests;
- exact-SHA Full Security Suite success;
- exact-SHA required checks success;
- canonical repository and GitHub Actions provenance.

## Evidence boundary

The generated document validates repository behavior and required CI execution. It does not prove production email delivery, Supabase production availability, receipt in a real inbox, token-delivery latency, or a completed production-user recovery transaction. Those provider/runtime claims remain independent.

## Consequences

- Users have a complete localized recovery journey.
- Account existence is not disclosed by successful responses.
- Abuse is bounded with the dedicated high-risk fail-closed policy.
- Broken or missing provider configuration fails explicitly and safely.
- IAM account-recovery evidence can be generated without misrepresenting email-provider runtime behavior.

## Rollback

Revert the API route, recovery and reset pages, login link, middleware allowlist entry, browser stub update, security-scanner contract, tests, evidence builder, workflow integration, and this decision record. Rollback restores the previous non-functional recovery experience and must not be represented as enterprise-ready account recovery.
