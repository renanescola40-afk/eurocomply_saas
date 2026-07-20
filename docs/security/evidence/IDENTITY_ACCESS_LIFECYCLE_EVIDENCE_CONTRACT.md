# Identity access lifecycle evidence contract

Canonical evidence:

`docs/security/evidence/runtime/identity-access-lifecycle-validation.json`

## Acceptance requirements

The evidence may be accepted only when:

- execution occurred in protected GitHub Actions on exact `main`;
- signup, login, refresh, recovery, logout and revoked-session denial passed;
- the production OAuth callback failed closed for an invalid synthetic code without returning a server error;
- configured OIDC discovery returned a valid HTTPS issuer and authorization endpoint;
- administrator MFA, sensitive-action step-up and organization onboarding attestations were protected and true;
- the disposable account was deleted;
- status is `Complete`, outcome is `passed` and failures is empty.

## Prohibited content

Evidence must not contain:

- synthetic or customer email addresses;
- passwords;
- access or refresh tokens;
- service-role values;
- callback codes or query strings;
- provider response bodies;
- OIDC discovery documents;
- cookies or authorization headers.

## Scorecard boundary

A merged workflow is not runtime proof. Controls may be promoted only after a successful exact-SHA run and strict validator acceptance. Enterprise SSO interoperability with a specific customer IdP requires an additional customer/provider acceptance exercise and must not be inferred from discovery validation alone.
