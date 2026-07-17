# Fail closed on incomplete GDPR exports

- Status: Proposed
- Date: 2026-07-17
- Priority: P1
- Area: Privacy, product integrity, SRE

## Context

The organization GDPR export collector records tables that could not be read in `unavailableTables`. The API route previously returned HTTP 200 and a downloadable JSON file even when one or more exportable inventory tables were unavailable because of missing privileged configuration, schema drift, provider errors, or query failures.

Although the payload disclosed the unavailable tables, a partial export could still be mistaken for a complete data-subject or customer data export. The success audit event and success notification were also emitted for that incomplete result.

## Decision

The GDPR export route must fail closed when `unavailableTables` is non-empty.

It now:

- records `gdpr_export_failed` with the existing sanitized export metadata;
- returns `503` with the stable code `gdpr_export_incomplete`;
- does not create a success notification;
- does not return a downloadable partial export;
- preserves authentication, tenant-scope validation, RBAC, entitlement, step-up authentication, rate limiting, no-store behavior, and successful complete exports.

## Consequences

Customers may need to retry an export after an operational or schema issue is resolved. This is preferable to presenting incomplete privacy data as a successful export.

The collector still identifies unavailable tables so operators and audit records retain objective diagnostic scope without exposing provider messages or secrets.

## Evidence boundary

This decision is supported by repository code, a regression contract test, and GitHub Actions results for the exact pull-request head. It does not prove production database availability, completeness of every deployed schema, fulfillment of a specific legal request, external legal review, audit certification, or penetration testing.

## Rollback

Revert the route, test, and this decision record. A rollback restores HTTP 200 partial exports and their success notification behavior, so it should only be used after an explicit privacy and product-risk decision.
