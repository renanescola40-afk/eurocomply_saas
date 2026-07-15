# ADR-0064: Fail closed on invalid GDPR delete-request payloads

- Status: Proposed
- Date: 2026-07-15
- Scope: `POST /api/gdpr/delete-request`

## Context

The GDPR deletion-request route uses `readBoundedJsonRequest` with a 4 KiB limit. Reader failures were caught and replaced with an empty object. This made malformed JSON, oversized bodies, and other bounded-reader rejections indistinguishable from a valid JSON object that omitted the required deletion confirmation.

The route then created a `gdpr_delete_denied` audit event with reason `missing_delete_confirmation` and returned the confirmation-specific response. That chronology was not truthful about why the request was rejected.

This finding is based only on repository source. It does not prove exploitation, production impact, provider behavior, audit durability, or completion of any external audit or penetration test.

## Decision

Reject bounded JSON reader failures with HTTP 400 and stable error code `invalid_gdpr_delete_payload`.

Record the denied attempt using the existing `gdpr_delete_denied` action and a distinct `invalid_delete_request_payload` reason. Do not create the deletion-request success audit event or notification after parsing fails.

Keep the existing access-gate order, 4 KiB limit, trusted-origin enforcement, authentication, organization resolution, permission check, distributed rate limit, entitlement check, step-up requirement, no-store responses, and valid-request behavior.

## Impact

Malformed or oversized request bodies are now represented separately from a valid payload that lacks the required confirmation. This improves audit chronology and avoids presenting a confirmation-specific remediation for a transport-level payload failure.

No database migration, RLS policy, RBAC rule, entitlement, dependency, provider configuration, secret, public route, or deletion workflow is changed.

## Risks and trade-offs

- Clients that relied on the previous confirmation-specific error for malformed JSON will now receive a different stable error code.
- The route intentionally retains a denial audit event for invalid payloads; audit persistence remains subject to the existing audit writer behavior.
- The response groups malformed JSON and body-limit failures under one public error to avoid exposing parser internals.
- Static and unit checks do not prove production deployment or runtime audit delivery.

## Tests and evidence

A focused source-contract test requires:

- no fallback from reader failure to an empty object;
- distinct invalid-payload and missing-confirmation paths;
- bounded parsing before success audit and notification side effects;
- HTTP 400 and no-store response construction.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks on the exact pull-request head. No runtime evidence is created or modified by this change.

## Rollback

Revert the commits that modify the route and add the test and this ADR. The previous empty-object fallback and confirmation-specific classification will return. No schema rollback, data migration, credential rotation, provider action, or customer-data repair is required.
