# ADR: Exact-SHA production SAML SSO runtime proof

- Status: Accepted
- Date: 2026-08-05
- Owners: Identity, Security, Enterprise Platform, SRE

## Context

The product already implements domain-based Supabase Enterprise SSO, trusted `sso/saml` claim extraction, active provider/domain binding, entitlement checks, seat-aware JIT provisioning and fail-closed callback handling. Contract tests prove those code paths, but they do not prove that a real external identity provider completed a production SAML login against the deployed release.

A historical `last_login_at` value or an old audit row is not sufficient evidence because it may belong to another deployment.

## Decision

Add a protected manual workflow that:

- checks out the exact current `main` SHA;
- proves the production runtime serves that SHA through `/api/ready/release`;
- reads a dedicated non-customer SAML connection through a protected Supabase service credential;
- records a baseline and waits for a new `enterprise.sso_login` audit event;
- accepts only successful seat-aware provisioning outcomes;
- rechecks the active Enterprise SSO entitlement after login;
- emits a redacted canonical artifact and checksum.

The workflow becomes the required `IAM-SAML` runtime campaign lane. It maps to the existing identity-provider control and does not create a new scorecard point.

## Security decisions

- The connection identifier, organization identifier and service credential exist only as protected environment secrets or in process memory.
- No email, SAML assertion, cookie, auth code, user identifier, UUID, provider identifier, audit payload, response body or request header is retained.
- A login event created before the workflow baseline is never accepted.
- The workflow is read-only and cannot alter the SAML provider, entitlement, membership or production deployment.
- The proof tenant and identity provider connection must not contain customer data.
- Missing runtime SHA binding, entitlement, audit linkage or provisioning success fails closed.

## Consequences

This closes the executable production SAML login evidence gap for the configured proof provider and exact release. It does not claim Microsoft Entra ID or Okta certification, universal compatibility across every IdP configuration, customer acceptance, SCIM behavior or high-volume performance.
