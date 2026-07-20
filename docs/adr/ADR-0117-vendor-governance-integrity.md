# ADR-0117: Vendor governance integrity at the database boundary

## Status
Proposed.

## Context
Vendor records influence procurement, data-access review and third-party risk decisions. The existing application path had RBAC, throttling and audit logging, but authenticated PostgREST writes remained possible, legacy-schema fallback could omit governance fields, approval attribution was not enforced by the database, and no immutable review history existed.

## Decision
1. Revoke direct `anon` and `authenticated` DML on `vendors`; supported mutations use reviewed backend code.
2. Enforce enumerated risk, access and review states.
3. Require review dates to be chronologically consistent.
4. Require approved records to carry an approval timestamp and an authorized same-organization approver.
5. Require creator attribution to a same-organization member.
6. Increment `review_version` on every update and allow callers to use optimistic concurrency.
7. Maintain database-triggered immutable `vendor_review_history` rows.
8. Remove the application legacy-schema fallback and broad mutation-path selects.
9. Keep application audit events in addition to database history; neither mechanism is represented as an external audit or production validation.

## Consequences
A production deployment must apply the migration before deploying the updated server action. Existing rows that violate newly introduced `NOT VALID` checks remain readable, while new or changed rows must comply. Historical rows should be remediated separately before constraints are validated globally.

## Evidence boundary
Repository migration, tests and reviewed code prove intended controls only. They do not prove production application, historical-data cleanliness, regulator acceptance, penetration testing, certification, uptime or external audit.

## Rollback
Rollback is intentionally staged: redeploy the previous application version first, then restore the prior write policy only if emergency browser DML is explicitly accepted. Do not drop `vendor_review_history` during rollback; preserve evidence. Trigger and constraints may be disabled individually after exporting affected rows and recording the change decision.
