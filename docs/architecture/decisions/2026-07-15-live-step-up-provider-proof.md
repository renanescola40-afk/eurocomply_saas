# Live provider proof for enterprise step-up

- Date: 2026-07-15
- Updated: 2026-08-10
- Status: Accepted
- Scope: Enterprise release evidence integrity

## Context

The step-up runtime evidence writer previously accepted an operator-controlled boolean as the final signal that Supabase MFA or an enterprise identity provider had been verified. That was replaced with a real provider transaction, but the first protected implementation still depended on a persistent synthetic email, password and pre-enrolled TOTP seed stored as GitHub environment secrets.

Persistent authentication fixtures create avoidable rotation, leakage and stale-factor risks. The protected environment already exposes the canonical Supabase provider credentials required to create disposable test identities safely.

## Decision

The canonical Step-Up Runtime Proof performs a real Supabase MFA validation with a fully disposable synthetic account and TOTP factor:

1. create a confirmed synthetic user through the protected Supabase service-role client;
2. sign in through the public Supabase Auth boundary with that user's in-memory password;
3. enroll a TOTP factor through `supabase.auth.mfa.enroll`;
4. create a provider challenge;
5. calculate the enrolled TOTP code in memory;
6. verify the challenge;
7. list factors and require the new TOTP factor to be `verified`;
8. require Supabase Authenticator Assurance Level `aal2`;
9. confirm the authenticated user remains the same;
10. revoke the synthetic session;
11. hard-delete the synthetic Auth user and verify its absence;
12. write redacted exact-SHA evidence.

The workflow is dedicated to the Supabase MFA implementation, so its non-sensitive proof mode is fixed to `supabase_mfa`. This does not configure the production application's provider mode; production readiness remains independently fail-closed until the application runtime is configured.

A protected, manually dispatched GitHub Actions workflow checks out the requested full release SHA, runs the validator in the `production` environment and retains the evidence artifact for 90 days.

`Complete / passed` requires all of the following:

- source validation passes;
- a dedicated step-up signing secret is configured in the protected environment;
- Supabase URL, anon key and service-role credentials are available to the protected proof;
- disposable-user creation succeeds;
- live TOTP enrollment, challenge and verification succeed;
- the resulting session reaches `aal2` for the same user;
- sign-out succeeds;
- hard-delete cleanup is verified;
- expected and checked-out full SHAs match;
- the expected branch is `main`;
- execution has GitHub Actions provenance for the canonical repository and a numeric run ID.

Local or untrusted execution may diagnose configuration but cannot produce Complete enterprise evidence.

## Security and privacy

The synthetic account exists only for one protected workflow execution. It must never be a customer or employee account.

The following values exist only in protected provider stores or process memory and are never written to evidence:

- service-role credential;
- disposable email and password;
- enrolled TOTP seed;
- generated TOTP code;
- access and refresh tokens;
- authenticated user identifier;
- factor identifier;
- challenge identifier;
- raw provider payloads.

The evidence stores only boolean outcomes, normalized provider hostname, timing, stable failure categories and exact release provenance. User cleanup verification is part of the PASS condition.

The workflow has `contents: read`, does not run for pull requests, does not write repository contents, does not merge, and does not use `pull_request_target`.

## Limitations

This proof validates the live Supabase MFA provider and the repository source contract for step-up routes. It does not independently prove every browser interaction, every critical action, production application environment configuration or an enterprise IdP-only deployment.

An `enterprise_idp`-only configuration remains blocked until a separate protected runner validates fresh ACR/AMR claims from the target identity provider.

The evidence is point-in-time and expires after 24 hours. A new final release SHA requires a new run.

## Operational requirements

The protected GitHub `production` environment needs only the canonical provider credentials already used by other protected Supabase proofs plus the dedicated step-up signing secret:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `STEP_UP_ASSERTION_SIGNING_SECRET` (preferred), with legacy `STEP_UP_SIGNING_SECRET` accepted by the workflow during migration.

No persistent `STEP_UP_LIVE_USER_EMAIL`, `STEP_UP_LIVE_USER_PASSWORD` or `STEP_UP_LIVE_TOTP_SECRET` is required.

Run `Step-Up Runtime Proof` with the exact full SHA promoted to `main`.

## Risks and trade-offs

- TOTP time drift can cause a legitimate validation failure; runner and Supabase clocks must be synchronized.
- Provider rate limits or outages produce a real failed or blocked result, not a source-code failure.
- If synthetic-user deletion cannot be verified, the proof remains failed even when MFA itself succeeded.
- The proof's hard-coded `supabase_mfa` mode is intentionally limited to this provider-validation workflow and is not evidence that Vercel production runtime configuration is complete.

## Rollback

Revert this decision and its implementation. Do not restore an operator-controlled boolean or persistent customer-like fixture as evidence. A rollback should return the Step-Up runtime evidence to Open until another protected, reproducible live provider proof is available.
