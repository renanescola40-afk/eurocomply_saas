# Reject malformed security-settings payloads

- Status: Proposed
- Date: 2026-07-19
- Scope: `POST /api/security/settings`

## Context

The privileged organization security-settings endpoint previously accepted an object with loosely typed fields. An absent or unsupported `stepUpProviderMode` was silently replaced with `supabase_mfa`, while non-array IdP ACR/AMR values were silently converted to empty arrays.

That coercion is unsafe for a step-up authentication control plane: a malformed, stale, or partially constructed client request could reset the configured provider mode or clear accepted identity-provider claims while the API still returned success. This finding is based on repository control flow only. It does not establish that such a request occurred in production.

## Decision

Reject the request with the existing no-store HTTP 400 response unless:

- `stepUpProviderMode` is explicitly present and is one of the supported provider modes;
- optional ACR and AMR values are arrays;
- each list contains at most 20 non-empty strings;
- each value is at most 256 characters after trimming.

Keep the existing authentication, tenant-scoped `manage_settings` authorization, trusted-mutation guard, rate limiting, step-up verification, durable audit requirement, and audit-failure compensation unchanged.

## Consequences

Security configuration changes become explicit and deterministic. Malformed or partial clients fail safely instead of mutating the organization to fallback values.

Clients that previously relied on omitted `stepUpProviderMode` or coercion of invalid claim lists must send a complete valid payload. This is an intentional compatibility trade-off for a privileged security-control mutation.

## Evidence boundary

This decision and its regression test provide source-level evidence only. They do not prove production deployment, runtime provider configuration, identity-provider correctness, penetration testing, external audit assurance, or regulatory compliance.

## Rollback

Revert the route, regression test, and this decision record together. No schema migration, data backfill, dependency rollback, secret rotation, or infrastructure change is required.
