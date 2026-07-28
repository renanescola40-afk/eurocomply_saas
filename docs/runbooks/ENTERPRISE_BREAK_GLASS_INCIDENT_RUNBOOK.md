# Enterprise Break-Glass Incident Runbook

## Trigger

Use break-glass access only when a production incident cannot be contained through normal privileged-access workflows within the required response window.

## Activation checklist

1. Open or link the incident record.
2. Identify the exact membership requiring temporary elevation.
3. Set the shortest viable duration; never exceed four hours.
4. Record a concrete justification.
5. Obtain two independent approvals.
6. Confirm step-up authentication before activation.
7. Start enhanced audit and telemetry monitoring.

## Containment

- Revoke access as soon as the emergency action is complete.
- Do not wait for automatic expiry when manual revocation is possible.
- Preserve request, approval, event-chain and related incident evidence.
- Rotate credentials when exposure is suspected.
- Suspend the affected account if activity diverges from the approved purpose.

## Expiry failure

1. Disable new activations.
2. Run the authenticated expiry worker manually.
3. Query all active requests with an expired `expires_at` value.
4. Revoke through the canonical membership path.
5. Open a security incident if any elevation remained active beyond its window.

## Post-incident review

Complete within 48 hours. Determine whether the request was appropriate, whether approval separation was genuine, whether access was used only for the incident, and which remediation removes the need for recurrence.

## No-Go conditions

Do not use break-glass access when step-up is unavailable, the tenant cannot be resolved, rate limiting is unavailable, approval identity cannot be verified, or event evidence cannot be persisted.
