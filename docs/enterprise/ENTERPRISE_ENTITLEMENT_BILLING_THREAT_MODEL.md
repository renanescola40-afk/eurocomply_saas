# Enterprise Entitlement and Billing Threat Model

## Threats and controls

### Duplicate webhook amplification
Organization-scoped idempotency ensures repeated delivery returns the original result without changing capacity twice.

### Stale contract overwrite
Expected source versions and row locking reject stale observations.

### Lower-priority billing overwrite
Explicit source priority prevents Stripe state from silently overriding a stronger signed-contract or emergency authority.

### Split-brain policy state
Snapshot acceptance and canonical seat-policy mutation occur in one database transaction.

### Cross-tenant references
Composite source references and organization predicates scope every reconciliation operation.

### Payload tampering
A deterministic SHA-256 digest binds the normalized entitlement payload without persisting webhook secrets.

### Browser privilege escalation
Tables and RPCs are revoked from browser roles and granted only to service role.

### Evidence removal
Forced RLS, revoked access and explicit delete-deny policies preserve reconciliation history.

## Residual risks

- production migration may not be applied;
- Stripe signature verification remains owned by the existing webhook boundary;
- contract imports require approved human authority and source mapping;
- service-role compromise remains a privileged threat;
- external drift monitoring must be validated after deployment.
