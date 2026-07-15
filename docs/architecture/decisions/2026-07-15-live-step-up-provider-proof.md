# Live provider proof for enterprise step-up

- Date: 2026-07-15
- Status: Accepted
- Scope: Enterprise release evidence integrity

## Context

The step-up runtime evidence writer previously accepted `STEP_UP_RUNTIME_PROVIDER_PROOF=true` as the final signal that Supabase MFA or an enterprise identity provider had been verified.

That flag was not produced by a provider transaction and could be set without signing in, selecting an enrolled factor, creating a challenge, verifying a one-time code or observing an `aal2` session. Source controls remained useful, but the final provider-proof boundary depended on operator assertion rather than reproducible runtime evidence.

## Decision

The canonical step-up runtime command now performs a real Supabase MFA validation with a dedicated synthetic fixture account:

1. sign in with the fixture account;
2. list verified MFA factors;
3. select a verified TOTP factor;
4. create a provider challenge;
5. calculate a TOTP code in memory;
6. verify the challenge;
7. require Supabase Authenticator Assurance Level `aal2`;
8. confirm the authenticated user remains the same;
9. revoke the synthetic session;
10. write redacted evidence.

A protected, manually dispatched GitHub Actions workflow checks out the requested full release SHA, runs the validator in the `production` environment and retains the evidence artifact for 90 days.

`Complete / passed` requires all of the following:

- source validation passes;
- a dedicated `STEP_UP_SIGNING_SECRET` is configured;
- the live provider transaction passes;
- expected and checked-out full SHAs match;
- the expected branch is `main`;
- execution has GitHub Actions provenance for the canonical repository and a numeric run ID.

Local or untrusted execution may diagnose configuration but cannot produce Complete enterprise evidence.

## Security and privacy

The fixture must be synthetic and dedicated to validation. It must not be a customer or employee account.

The following values remain only in protected GitHub environment secrets and process memory:

- fixture email;
- fixture password;
- TOTP seed;
- access and refresh tokens;
- authenticated user identifier;
- factor identifier;
- challenge identifier;
- generated TOTP code.

The evidence stores only boolean outcomes, normalized provider hostname, timing, stable failure categories and exact release provenance. It stores no raw or pseudonymized user identifier, raw provider payload or authentication material.

The workflow has `contents: read`, does not run for pull requests, does not write repository contents, does not merge, and does not use `pull_request_target`.

## Limitations

This proof validates the live Supabase MFA provider and the repository source contract for step-up routes. It does not independently prove every browser interaction, every critical action or an enterprise IdP-only deployment.

An `enterprise_idp`-only configuration remains blocked until a separate protected runner validates fresh ACR/AMR claims from the target identity provider.

The evidence is point-in-time and expires after 24 hours. A new final release SHA requires a new run.

## Operational requirements

Configure these GitHub `production` environment secrets with synthetic values:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `STEP_UP_PROVIDER_MODE`;
- `STEP_UP_SIGNING_SECRET`;
- `STEP_UP_LIVE_USER_EMAIL`;
- `STEP_UP_LIVE_USER_PASSWORD`;
- `STEP_UP_LIVE_TOTP_SECRET`.

The synthetic user must have one verified TOTP factor whose seed matches `STEP_UP_LIVE_TOTP_SECRET`.

Run `Step-Up Runtime Proof` with the exact full SHA promoted to production.

## Risks and trade-offs

- TOTP time drift can cause a legitimate validation failure; runner and Supabase clocks must be synchronized.
- Rotating or reenrolling the fixture factor requires updating the protected TOTP secret.
- A failed sign-out fails session-hygiene evidence and should be investigated.
- Provider rate limits or outages produce a real failed or blocked result, not a source-code failure.

## Rollback

Revert this decision and its implementation. That restores the operator-controlled boolean proof flag and weakens the enterprise evidence boundary. No schema, customer data, provider configuration or production deployment rollback is required.
