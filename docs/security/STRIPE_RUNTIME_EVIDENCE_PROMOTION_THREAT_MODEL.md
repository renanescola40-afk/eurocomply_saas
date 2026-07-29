# Stripe Runtime Evidence Promotion Threat Model

## Assets

- exact release identity;
- trustworthy runtime evidence;
- tenant-scoped billing and entitlement state;
- release decision integrity;
- protected workflow credentials.

## Threats and controls

### Stale artifact reuse
Controlled by exact current-main SHA authorization and artifact naming bound to the SHA.

### Fabricated completion
Controlled by mandatory event, snapshot, policy, reconciliation and raw-deletion checks before `Complete` can be emitted.

### Duplicate side effects
Controlled by a separate replay artifact proving stable snapshot count, policy version, seat limits and reconciliation count.

### Cross-tenant evidence
Controlled by the upstream tenant-scoped runtime proof; promotion accepts only its sanitized output.

### Secret or identifier leakage
Controlled by rejection of sensitive-value flags, deletion of raw evidence upstream and retention of bounded promoted output only.

### Workflow substitution
Controlled by protected environment approval, read-only GitHub permissions and source artifact download from the same repository.

### Branch confusion
Controlled by checkout of `main`, fetch of `origin/main` and exact equality with the provided release SHA.

## Residual risks

- protected environment reviewers may approve an incorrect operational input;
- one passing event does not prove every Stripe event type;
- GitHub artifact retention and access controls remain platform dependencies;
- a compromised repository administrator can alter workflows and requires independent review controls.
