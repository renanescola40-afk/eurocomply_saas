# Privileged Access Incident Runbook

## Trigger conditions

- active elevation exceeds its expiry;
- approval originates from the requester;
- multiple active requests target the same membership;
- unexpected owner elevation;
- expiry or revocation worker fails repeatedly;
- audit event sequence is incomplete.

## Immediate containment

1. Disable the privileged-access activation path.
2. Keep the expiry worker enabled unless it is the suspected cause.
3. Revoke affected membership elevation through the canonical seat/membership transaction.
4. Preserve request, approval and event rows; do not delete evidence.
5. Rotate internal worker credentials if unauthorized invocation is suspected.

## Investigation

- Verify `organization_id`, target membership and actor identities.
- Confirm requester and approvers are distinct.
- Confirm approval count and required approvals.
- Compare activation and expiry timestamps.
- Review audit and privileged-access event chronology.
- Check internal worker authorization and rate-limit events.

## Recovery

- Re-run expiry in bounded batches of at most 500.
- Confirm no active request has `expires_at <= now()`.
- Validate role and seat state against the canonical membership ledger.
- Record operator decision and remediation evidence.

## Escalation

Page Security and IAM owners for owner-role elevation, cross-tenant evidence, suspected credential compromise or any failure to revoke within 15 minutes.