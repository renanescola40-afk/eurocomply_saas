# ADR: Exact-SHA SCIM Users and Groups runtime proof

- Status: Accepted
- Date: 2026-08-05
- Owners: Identity, Security, Enterprise Platform, SRE

## Context

The repository implements tenant-bound SCIM v2 Users and Groups, transactional seat enforcement, rate limiting and redacted credentials. Existing identity runtime evidence validates account lifecycle and OIDC discovery, but explicitly does not prove the production SCIM surface. Provider interoperability remained an external statement with no executable evidence producer.

## Decision

Add a protected manual workflow that exercises the production SCIM protocol against a dedicated Enterprise test tenant. It must be exact-current-main bound, fail closed, use a secret-only tenant credential, cover discovery and negative authorization, execute User and Group lifecycle operations, deprovision the identity, validate no-store/content-type behavior and retain only redacted canonical evidence plus a checksum.

The workflow becomes a required `IAM-SCIM` runtime campaign lane. It maps only to the existing identity-provider control and does not create a new scorecard point.

## Security decisions

- No credential, email, external ID, resource ID, response body or header is retained.
- The request body cannot select an organization; the token remains the tenant authority.
- A dedicated non-customer tenant is mandatory.
- Cleanup means Group deletion and User deprovisioning, not destructive removal of audit history.
- Missing rate-limit infrastructure, entitlement, seat capacity or cleanup evidence fails the run.
- The workflow has read-only repository permissions and cannot deploy or modify provider configuration.

## Consequences

This closes the controllable production SCIM evidence gap and makes failures diagnosable. It still does not prove SAML login completion, Entra/Okta/Google certification, provider retries or high-volume performance. Those require independent provider acceptance evidence.
