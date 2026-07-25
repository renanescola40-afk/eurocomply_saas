# Enterprise Seat Concurrency Threat Model

## Assets

- contracted seat capacity;
- organization membership state;
- invite and SCIM admission integrity;
- billing and contract references;
- immutable operational evidence.

## Threats and controls

### Concurrent over-admission
Multiple workers observe the same free seat. Controlled through per-organization/per-seat transaction advisory locks and reservations counted before activation.

### Retry amplification
Webhook or client retries allocate more than one seat. Controlled through organization-scoped idempotency keys and deterministic replay outcomes.

### Stale policy use
A worker acts on an older contract limit. Controlled through explicit expected policy versions and `version_conflict` outcomes.

### Lost member updates
Two administrators or provisioners change the same member. Controlled through `seat_version` optimistic concurrency during reservation consumption.

### Cross-tenant references
A reservation from one organization is consumed for another. Controlled through organization predicates in every lookup and mutation.

### Browser privilege escalation
An authenticated client calls capacity RPCs directly. Controlled through revoked execution and service-role-only grants.

### Invite PII retention
Raw invite email leaks into capacity evidence. Controlled through normalized SHA-256 email hashes.

### Evidence deletion
An operator erases rejected capacity decisions. Controlled through forced RLS, revoked browser access and an append-only service boundary.

### Unlimited fallback
Missing contract data is interpreted as unlimited. Controlled through `policy_unavailable`, which rejects admission.

## Residual risks

- production database migration may not yet be applied;
- billing and contract synchronization can lag;
- advisory locking behavior must be load-tested against the deployment database;
- service-role compromise remains a privileged threat requiring secret rotation and incident response.
