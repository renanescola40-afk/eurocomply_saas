# ADR-0073: Pseudonymize prelaunch fallback user-agent hints

- Status: Accepted
- Date: 2026-07-16
- Scope: `POST /api/prelaunch` degraded persistence and webhook fallback

## Context

The public prelaunch waitlist normally persists a minimal waitlist record. When that dedicated table is unavailable, the route falls back to `sales_leads` or an outbound lead webhook.

That fallback record already pseudonymized the forwarded IP hint, but copied the complete `User-Agent` header into `user_agent`. A complete user-agent can expose browser, operating-system, device and automation-client details that are not required to deduplicate or operate the waitlist fallback.

The primary public lead route already uses the shared salted `hashRateLimitUserAgent` primitive. Keeping the prelaunch fallback on a different privacy posture created an avoidable data-minimization inconsistency.

This decision is based on repository source. It does not claim that the fallback executed in production, that data was exposed, or that any regulator, auditor or penetration tester identified the issue.

## Decision

The prelaunch fallback record will:

- trim the inbound `User-Agent` header;
- return `null` when it is absent or empty;
- otherwise store and forward only the value produced by `hashRateLimitUserAgent`;
- keep the existing database field and webhook payload shape unchanged.

The raw header is not persisted or included in the fallback webhook payload.

## Consequences

### Positive

- New degraded-path records retain less client-identifying detail.
- The prelaunch and primary lead routes use the same pseudonymization primitive.
- No migration, dependency, provider configuration, RBAC, RLS or entitlement change is required.

### Trade-offs

- Operators cannot reconstruct the original user-agent from new fallback records.
- Derived identifiers remain pseudonymous data and are not asserted to be anonymous.
- Changing the configured hash salt changes future derived identifiers.
- Historical rows and prior webhook deliveries are not modified.

## Validation

Focused source-contract coverage requires:

- import and use of `hashRateLimitUserAgent`;
- `null` for missing or empty user-agent values;
- fallback records to call `getPrivacySafeUserAgent`;
- absence of the former direct raw-header assignment.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build and security checks on the exact pull-request head.

## Evidence boundary

The evidence consists of repository source, diff, tests and CI results. It does not prove production deployment, historical-data cleanup, webhook-provider deletion, legal compliance, external audit completion or penetration-test coverage.

## Rollback

Revert the pull request. New degraded-path records and webhook payloads would again receive the bounded but raw user-agent header. No schema rollback, migration, secret rotation, provider action or customer-data repair is required for the code rollback.
