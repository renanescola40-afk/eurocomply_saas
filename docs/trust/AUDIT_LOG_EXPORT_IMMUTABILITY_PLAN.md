# Audit log export and immutability plan

Status: planned. Internal audit events exist, but enterprise-grade export and tamper-evident/immutable audit retention are not yet complete.

## Objective

Define the controls required before claiming exportable logs or immutable audit trails.

## Target audit event categories

- Authentication and session events.
- Organization membership changes.
- Role and permission changes.
- Billing/subscription changes.
- Document upload/download/delete events.
- SSO/MFA configuration changes, when implemented.
- Admin/security setting changes.
- Data export and deletion requests.
- Internal cron/admin job outcomes.

## Export requirements

- Organization-scoped export endpoint.
- RBAC: only authorized roles can export logs.
- Date-range filter.
- Actor, action, target, IP/user agent where available.
- CSV and JSON formats.
- Export audit event emitted after export.
- Large export pagination or async job handling.

## Immutability requirements

Before claiming immutable audit trails, EuroComply must implement or procure:

1. Append-only write path for audit events.
2. Separation between application writers and audit retention administrators.
3. Tamper-evident hash chain, signed log batches, WORM storage, or equivalent provider control.
4. Retention policy with deletion restrictions.
5. Integrity verification procedure.
6. Evidence that normal application administrators cannot silently alter or delete audit history.

## Customer-safe answer while partial

EuroComply records internal audit events for sensitive actions, but enterprise-grade log export and immutable/tamper-evident retention are not yet complete. Do not claim immutable audit trails until the controls above are implemented and tested.
