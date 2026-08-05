# SAML SSO runtime evidence contract

Canonical protected artifact:

`saml-sso-runtime-proof-<exact-main-sha>/saml-sso-runtime-validation.json`

## Acceptance

Evidence is accepted only when a protected GitHub Actions run:

- checks out the exact current `main` SHA;
- uses the `production-identity-proof` environment;
- proves the production `/api/ready/release` endpoint serves the same SHA and returns `no-store`;
- reads only a dedicated non-customer SAML connection;
- verifies the connection is active, domain-verified and provider-bound;
- verifies an active Enterprise contract with SSO enabled before login;
- captures a baseline before waiting;
- observes a new `enterprise.sso_login` audit event after that baseline;
- proves the event is bound to the configured connection and provider;
- accepts only a successful seat-aware provisioning outcome;
- proves `last_login_at` advanced to the new event;
- revalidates the SSO entitlement after login;
- emits `Complete/passed`, exact-SHA provenance and zero failures;
- passes the independent redaction validator.

## Prohibited evidence

The retained JSON must not contain:

- a service-role or readiness credential;
- an email address, auth code, cookie, access token or refresh token;
- a SAML response, assertion, certificate or metadata document;
- a user, connection, organization or provider UUID;
- an audit payload or event timestamp;
- request or response headers;
- raw provider or Supabase responses;
- customer data.

## Boundary

This proof validates that a real SAML login traversed the Risck Comply production callback, binding, entitlement, audit and provisioning path for one dedicated proof connection on one exact deployment. It does not claim IdP certification, every Microsoft Entra ID or Okta configuration, customer-specific acceptance, SCIM lifecycle behavior or performance at scale.
