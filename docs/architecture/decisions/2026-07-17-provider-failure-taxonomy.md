# Stable provider failure taxonomy

- Status: Accepted
- Date: 2026-07-17
- Scope: Stripe, Resend, Supabase and shared API error handling

## Context

External-provider failures were handled through unrelated generic errors. Stripe configuration errors, HTTP rejection, rate limits and network outages could collapse into `internal_server_error`; Resend retries did not distinguish permanent rejection from transient failure; Supabase recovery failures were observable only as an undifferentiated unavailable state.

That made support, incident response and retry policy unreliable. Returning raw provider messages would be worse: SDK messages may contain internal details, identifiers, request fragments or credential-like values.

## Decision

A server-only provider failure boundary defines stable operational categories:

- `configuration`;
- `authentication`;
- `authorization`;
- `rate_limited`;
- `timeout`;
- `unavailable`;
- `invalid_request`;
- `conflict`;
- `rejected`;
- `unknown`.

Every classified failure records only:

- provider name;
- stable failure kind;
- normalized provider code;
- normalized operation;
- retryability;
- stable public code;
- safe HTTP status.

Raw provider messages and payloads are retained only as the internal `cause` object for runtime debugging and are never copied into safe summaries, API responses or evidence.

## Public response contract

`secureApiError` recognizes `ProviderFailureError` and returns a no-store response containing only:

- stable public error code;
- retryability flag;
- request ID.

The provider name, provider code and operation remain in sanitized observability context rather than in the customer-facing response.

## Retry contract

Retries are permitted only when the classifier marks the failure retryable. Current retryable categories are rate limiting, timeout and unavailability. Configuration, authentication, authorization, invalid request, conflict, rejected and unknown failures stop immediately.

Resend uses this contract so permanent provider rejection is not retried three times. Stripe checkout and portal operations and Supabase recovery boundaries use the same classification model.

## Evidence

The Enterprise Readiness Scorecard generates `docs/security/evidence/runtime/provider-failure-classification.json` for the exact assessed SHA. Promotion requires:

- central taxonomy coverage;
- safe no-store API response handling;
- real Stripe, Resend and Supabase integration points;
- classification and redaction tests;
- exact target/checkout SHA equality;
- canonical GitHub Actions provenance;
- Full Security Suite and required checks passing.

## Evidence boundary

This evidence proves repository behavior and exact-SHA CI execution. It does not prove that a real provider outage occurred in production, provider availability, alert delivery, continuity, SLA compliance or perfect classification of every future SDK error shape.

## Consequences

- Operational dashboards can group failures by provider, operation and category.
- Customer responses remain stable and sanitized.
- Transient failures can be retried while permanent failures stop promptly.
- Missing provider configuration is distinguishable from provider downtime.
- PLT-10 can be scored from exact-SHA repository evidence without fabricating production outage evidence.

## Rollback

Revert the provider taxonomy, API guard integration, Stripe/Resend/Supabase adoption, tests, evidence builder, workflow integration and this decision. Rollback returns provider failures to generic handling and must not retain the PLT-10 PASS claim.
