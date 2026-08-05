# SCIM runtime evidence contract

Canonical protected artifact:

`scim-runtime-proof-<exact-main-sha>/scim-runtime-validation.json`

## Acceptance

Evidence is accepted only when a protected GitHub Actions run:

- checks out the exact current `main` SHA;
- uses the `production-identity-proof` environment;
- targets an HTTPS production origin;
- uses a dedicated tenant-bound SCIM credential stored only as an environment secret;
- validates ServiceProviderConfig, ResourceTypes and Schemas;
- proves unauthenticated access is denied;
- creates, filters, reads, patches, deactivates and reactivates a disposable User;
- creates, filters, reads, patches and deletes a Group with membership;
- deprovisions the User and proves the retained identity is inactive;
- verifies SCIM JSON content types and `no-store` responses;
- removes the Group and leaves no active licensed identity;
- emits `Complete/passed`, exact-SHA provenance and zero failures;
- passes the independent redaction validator.

## Prohibited evidence

The retained JSON must not contain:

- the SCIM credential;
- email addresses;
- external IDs;
- User or Group resource IDs;
- provider response bodies;
- request/response headers;
- cookies, authorization material or network payloads.

## Boundary

This proof validates the Risck Comply production SCIM protocol and lifecycle using a dedicated Enterprise test tenant. It does not claim Microsoft Entra ID, Okta or Google Workspace certification, customer-specific SAML success, provider replay behavior or 10,000-member performance. Those remain separate external acceptance exercises.
