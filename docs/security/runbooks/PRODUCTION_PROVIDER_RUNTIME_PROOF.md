# Production Provider Runtime Proof

## Purpose

The protected `Production Provider Runtime Proof` verifies that the production control plane is connected to the intended GitHub, Vercel, Supabase, Stripe and Sentry providers for the exact current `main` SHA.

This proof is intentionally fail-closed. A configured-looking environment variable is not enough: the workflow performs live, read-only provider probes and emits only redacted booleans and counts.

## Trust boundary

### Versioned, non-secret identity

`config/production-provider-targets.json` contains the canonical Vercel team ID, project ID and project name. These are provider resource identifiers, not credentials. Keeping them in the reviewed repository prevents opaque secret-store drift and binds the expected production target to the same exact SHA being assessed.

Changing this file changes the production proof target and therefore requires normal pull-request review and protected-branch checks.

### Protected credentials

The workflow still requires protected credentials for operations that authenticate to providers:

- `VERCEL_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `SENTRY_AUTH_TOKEN`

Credentials must never be committed to the repository or emitted in artifacts.

## Vercel acceptance criteria

The Vercel probe must prove all of the following:

1. the API token exists;
2. the checked-in target configuration is structurally valid;
3. the configured project endpoint is reachable;
4. the returned project ID, project name and account/team ID match the versioned target exactly;
5. the production environment-variable inventory can be listed with `decrypt=false`;
6. every high-impact runtime key required by enterprise readiness is present by name.

The proof never requests decrypted environment values and never stores provider responses.

## Sentry acceptance criteria

The Sentry probe deliberately does not require a duplicate copy of `NEXT_PUBLIC_SENTRY_DSN` inside GitHub Actions.

Instead it uses the protected Sentry auth token plus the configured organization and project to prove:

1. organization and project metadata are configured;
2. the CI/build auth token is configured;
3. the target project API is reachable;
4. the project client-key inventory is reachable;
5. at least one active client key exposes a syntactically valid HTTPS DSN.

The DSN, public key, secret key and raw client-key payload are inspected only in memory and are never written to the evidence artifact.

Runtime readiness remains a separate control and still verifies that the deployed application itself has the Sentry runtime DSN and metadata it needs.

## Evidence handling

The canonical evidence file is:

`docs/security/evidence/runtime/production-secrets-provider-stores.json`

It may contain only redacted control results, provider names, counts, timestamps, exact-SHA provenance and evidence locations. It must not contain credentials, provider response bodies, decrypted Vercel values, Sentry DSNs/client keys, or customer identifiers.

A failed provider probe produces `status: Open` and exits non-zero. The P0 aggregator may promote only a successful exact-SHA artifact that passes the authoritative validator.

## Redacted blocker diagnostics

The workflow also runs `scripts/security/diagnose-production-provider-blockers.mjs` with `if: always()` so a blocked authoritative proof still produces actionable diagnostics at:

`release-validation/provider-blocker-diagnostics.json`

This file is **diagnostic only**. `status: Complete` means diagnostic collection completed; it never changes `production-secrets-provider-stores.json`, never promotes a blocked provider to PASS and is not accepted by the P0 runtime evidence fetcher.

Allowed diagnostic data is deliberately narrow:

- stable blocker codes such as `vercel_api_token_missing`;
- provider names;
- non-secret counts already present in canonical evidence;
- HTTP status numbers and bounded categories such as `unauthenticated`, `forbidden_or_insufficient_scope`, `resource_not_found`, `rate_limited`, `timeout` or `provider_server_error`.

The diagnostic artifact does not store request URLs, response bodies, provider IDs from responses, credentials, tokens, DSNs or decrypted environment values.

## Operational remediation

When the proof is blocked:

- `vercel_api_token_missing`: configure a read-capable `VERCEL_TOKEN` in the protected GitHub `production` environment.
- `vercel_project_identity_mismatch`: verify the intended project before changing the versioned target; never weaken the identity check.
- `vercel_required_production_environment_keys_missing`: add the missing application runtime variables in Vercel production; do not put their values in evidence.
- `sentry_project_api_unreachable`: use the diagnostic probe category to distinguish missing resource, authentication/scope, rate limit or provider/network failure.
- `sentry_client_key_inventory_unavailable`: ensure the token can read project client keys.
- `sentry_active_client_key_missing`: create or activate an appropriate Sentry project client key/DSN.

After remediation, rerun the protected workflow against the exact current `main` SHA. Do not manually edit runtime evidence to convert a blocked result into `Complete`.
