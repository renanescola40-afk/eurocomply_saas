# ADR: Enterprise Integrations Platform

- Status: Proposed
- Date: 2026-07-21

## Context

Enterprise customers require machine-to-machine access, outbound event delivery and identity lifecycle integration. Implementing API keys, webhooks, SSO and SCIM independently would duplicate tenant, audit, secret and lifecycle controls and create inconsistent security boundaries.

## Decision

Create one tenant-scoped integrations control plane covering service accounts, scoped API keys, webhook subscriptions and deliveries, OIDC/SAML connection readiness, domain verification, SCIM bearer tokens and append-oriented integration audit events.

Material rules:

- plaintext API keys and SCIM tokens are returned once and only SHA-256 digests are persisted;
- API credentials are organization-bound, scoped, expiring, revocable and rotation-aware;
- outbound webhooks use HTTPS, HMAC-SHA256, signed timestamps, replay windows, stable event IDs, idempotency keys, bounded retries, delivery leases and dead-letter state;
- outbound payloads are allowlist-oriented and common secret/PII keys are removed before signing;
- SSO cannot be enforced until the connection is active and its domain has been verified;
- SCIM credentials are independent, expiring and revocable;
- every table uses `organization_id`, foreign keys, constraints, indexes, enabled and forced RLS;
- ordinary authenticated roles cannot update or delete integration audit history;
- privileged runtime workers must use narrowly scoped server credentials and may never expose stored ciphertext or digests.

## Separation of duties

Organization owners and admins configure integrations. Runtime delivery and provisioning workers execute through server-side paths. Verification and activation should be performed by a different privileged actor whenever the deployment supports independent approval.

## Consequences

The schema and security primitives prepare a stable enterprise integration boundary without adding another authentication stack. Production activation still requires encryption-key configuration, worker execution, provider-specific metadata validation, protected runtime evidence and operational ownership.

## Rejected alternatives

- Store encrypted API-key plaintext for recovery: rejected; credentials must be rotated, not recovered.
- One global webhook secret: rejected; compromise would affect every tenant.
- Accept arbitrary HTTP endpoints: rejected because transport confidentiality is mandatory.
- Treat SAML/OIDC readiness as a replacement for Supabase Auth: rejected; the connection layer federates into the existing identity architecture.
