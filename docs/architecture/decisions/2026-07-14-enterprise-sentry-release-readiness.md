# ADR: Require Sentry release-upload configuration for enterprise readiness

- Date: 2026-07-14
- Status: Accepted
- Scope: `/api/ready` enterprise release profile

## Context

The readiness route already reported whether `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` were configured, but that result did not affect the final readiness decision. Consequently, an enterprise deployment could return HTTP 200 with `status: ready` while release source-map upload configuration was missing.

This conflicted with the enterprise release profile, which treats release observability and source-map upload credentials as required production configuration. Missing source maps do not normally stop the application from serving traffic, but they materially reduce incident diagnosis quality for an enterprise release and can make production stack traces unusable.

The existing public-production profile intentionally does not require those enterprise-only credentials.

## Decision

For enterprise readiness only, require the existing Sentry release-upload check to be configured before `/api/ready` can return HTTP 200.

The route now:

- treats blank or whitespace-only Sentry release-upload values as missing;
- requires all three release-upload settings when enterprise readiness is active;
- preserves the existing public-production behavior;
- preserves the existing response shape and does not expose variable names or secret values;
- preserves authentication, rate limiting, no-store behavior, Supabase probes, Stripe probes, and malware-scanner readiness.

Enterprise readiness remains active under the existing conditions: `RELEASE_TARGET=enterprise`, `RISCK_COMPLY_ENTERPRISE_RELEASE=true`, or mandatory malware scanning.

## Impact

- Enterprise deployments without complete Sentry release-upload configuration now return HTTP 503 from `/api/ready`.
- Public-production readiness is unchanged.
- No migration, dependency, API contract, secret value, or customer data is introduced.
- Existing readiness consumers continue receiving the same response fields.

## Security and privacy

The response reports only booleans and a missing count. It does not return environment-variable names, organization names, project names, tokens, DSNs, or other secret values.

## Risks and trade-offs

- A deliberately configured enterprise deployment that does not use Sentry source-map upload will remain not-ready until the release profile is changed explicitly.
- Sentry credential presence does not prove that an upload succeeded; provider-backed runtime evidence remains required for release approval.
- This check validates non-blank configuration, not token permissions or provider availability.

## Tests

Focused tests cover:

- public readiness remaining available without enterprise Sentry release-upload credentials;
- enterprise readiness failing when credentials are absent or whitespace-only;
- enterprise readiness passing when all required values are non-blank;
- response redaction of environment-variable names and secret values.

## Evidence limitations

No Sentry API call, source-map upload, production deployment, customer traffic, or provider configuration was exercised by this repository change. Runtime evidence must remain Open until the relevant release workflow runs against the target environment.

## Rollback

Revert this change. Enterprise readiness will again report Sentry release-upload configuration without using it in the final readiness decision. No data migration, provider rollback, credential rotation, or customer-data repair is required.
