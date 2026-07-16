# Propagate Supabase auth cookies from middleware session checks

- Status: Proposed
- Date: 2026-07-16
- Decision owners: Identity Engineering and Release Engineering

## Context

The localized middleware validates Supabase sessions before it redirects authenticated users away from login and marketing entry points or rejects anonymous access to private routes. Supabase may refresh, rotate, or clear auth cookies while `auth.getUser()` runs.

The previous implementation supplied a `setAll` callback backed by a temporary `NextResponse`, but returned only a boolean from the session check. The temporary response was then discarded. Any cookies written during refresh or invalid-session cleanup therefore did not reach the browser, which could leave the client with stale credentials and create intermittent login, onboarding, or dashboard behavior.

## Decision

Return both the authentication decision and the response that receives Supabase cookie mutations. Before returning any localized redirect or pass-through response that depended on the session check, copy every cookie written by Supabase onto the actual final response.

Keep the controls already applied to the final response:

- private redirects retain `private, no-store`;
- request correlation remains application-owned;
- locale handling remains unchanged;
- public routes that do not need an authentication decision do not initialize Supabase;
- authentication errors remain fail-closed.

The middleware continues to use `auth.getUser()` as the server-validated identity decision. Cookie propagation does not make cookie presence an authentication signal.

## Consequences

### Positive

- refreshed session cookies reach the browser on authenticated redirects and private pass-through responses;
- expired or revoked session cleanup reaches the browser on the login redirect;
- session validation and cookie rotation use the same request and response cycle;
- onboarding and dashboard routing no longer discard Supabase session mutations.

### Risks and trade-offs

- every response path that depends on the session check must apply the session cookies before returning;
- a future early return added inside the localized authenticated flow could reintroduce the loss unless covered by the focused tests;
- copying response cookies preserves the attributes supplied by Supabase, so provider-library cookie behavior remains part of the trust boundary;
- repository tests prove response propagation with a simulated Supabase callback, not live token rotation in the production provider.

## Validation

Focused Vitest coverage executes the middleware with a mocked Supabase server client and validates:

- a valid session redirects login to localized onboarding;
- refreshed cookies are returned on the authenticated redirect;
- expired or revoked sessions redirect to login and propagate cookie cleanup;
- authenticated onboarding does not loop and preserves refreshed cookies;
- unrelated public routes avoid an unnecessary authentication check.

The exact PR SHA must also pass lint, typecheck, unit tests, build, E2E, and security gates before merge. Live Supabase refresh, OAuth, logout, and cross-browser behavior remain part of the final runtime auth/RBAC validation.

## Rollback

Revert the pull request containing this decision. No database migration, provider configuration, secret rotation, or customer-data repair is required. Reverting restores the known risk that middleware-generated Supabase cookie updates are discarded.
