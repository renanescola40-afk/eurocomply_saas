# Stripe Runtime Proof Threat Model

## Threats and controls

### Forged runtime evidence
Only the protected workflow may collect evidence, and the release SHA must equal the current `main` tip.

### Wrong-tenant correlation
Every snapshot, policy and reconciliation query is constrained by the supplied organization UUID.

### Event replay confusion
The proof correlates the durable Stripe event row and the `stripe:<event id>` entitlement idempotency key.

### Secret leakage
Secrets are used only as workflow environment values. The retained artifact excludes connection data and raw database rows.

### PII leakage
Only event and organization suffixes are retained. The raw catalog is removed before upload.

### Overclaiming
The artifact explicitly states that one observed event does not prove all future events, load capacity or contract authority.

### Mutable evidence
The artifact contains the exact release SHA and SHA-256 digest of the source catalog.

## Residual risks

- compromised protected-environment secrets;
- incorrect operator-supplied expected limits;
- Stripe metadata configured against the wrong entitlement source;
- a database administrator altering evidence before collection;
- production behavior differing from a test-mode event.
