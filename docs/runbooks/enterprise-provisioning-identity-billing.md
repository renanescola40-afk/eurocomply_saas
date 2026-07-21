# Runbook — Enterprise provisioning, identity and billing

## Scope

Use this runbook for negotiated Enterprise customers using high-volume invitations, CSV jobs, SAML SSO, SCIM or negotiated billing. Do not apply Enterprise lifecycle actions to compatibility contracts.

## Fast triage

Collect only non-secret identifiers:

- organization UUID;
- contract UUID and version;
- contract mode/status and billing status;
- provisioning job UUID;
- SCIM identity UUID or token prefix, never the token;
- Stripe event/subscription/invoice IDs;
- request ID and timestamp.

Never copy bearer tokens, service-role keys, SAML certificates, webhook secrets or customer CSV contents into tickets or logs.

## Seat limit incident

1. Read the platform usage endpoint for the organization.
2. Compare active, pending and queued values with each negotiated limit.
3. Check open `enterprise_usage_alerts`.
4. Reconcile `organization_usage` using the service-role-only reconciliation RPC.
5. Do not increase a contract merely to clear an operational error. Contract changes need commercial authorization and an audit reason.
6. Retry the original idempotency key after reconciliation.

Expected quota errors:

- `member_limit_reached`;
- `seat_limit_reached`;
- `admin_limit_reached`;
- `capacity_insufficient`.

## Stuck CSV job

1. Confirm the job belongs to the expected organization.
2. Inspect job status, processed/succeeded/failed counters and lease expiry.
3. Run the protected internal provisioning endpoint with a small batch.
4. Workers reclaim items only after `lease_expires_at`.
5. Do not reset successful rows to queued.
6. Cancel only queued items when the customer requests termination.
7. Export no raw email list into operational logs.

## SAML login denied

1. Confirm the Supabase SSO provider UUID is bound to the expected organization.
2. Confirm the login email domain equals the verified domain.
3. Confirm the identity connection is active.
4. Confirm the negotiated contract is active and `sso_enabled=true`.
5. Check whether auto-provision is disabled and a membership is required in advance.
6. Check seat availability, including pending invitations and queued jobs.
7. Verify the Supabase JWT `amr` contains `method=sso/saml` and the expected provider UUID. Do not accept tenant IDs from user metadata.
8. Reproduce in a non-production IdP before changing production settings.

## SCIM 401/403/409

- 401: invalid, revoked or expired token. Rotate the token; never retrieve plaintext.
- 403: contract inactive or SCIM entitlement disabled.
- 409: email conflict or licensed capacity exhausted.

For deactivation failures, verify the SCIM identity is bound to the current organization membership. DELETE must release the seat before marking the SCIM identity inactive.

## Stripe event not updating Enterprise contract

1. Verify webhook signature processing succeeded.
2. Confirm the contract has `contract_mode=negotiated`.
3. Confirm metadata contains a valid Enterprise contract UUID or organization UUID, or the subscription was previously bound.
4. Confirm Stripe customer/subscription IDs do not conflict with stored bindings.
5. Search `enterprise_contract_billing_events` by Stripe event ID.
6. Duplicate events are successful no-ops.
7. Binding conflicts and invalid transitions return processing failure and must not fall through to the self-service handler.

## Past due and read-only

1. Check `payment_due_at`, `grace_period_days`, `dunning_stage` and `billing_status`.
2. Run the protected contract lifecycle endpoint.
3. Expected sequence is `past_due -> grace_period -> read_only`.
4. Payment confirmation may return `past_due`, `grace_period` or `read_only` to `active`.
5. Suspension/termination requires explicit platform action and an audit reason; the scheduler does not terminate customers.

## Threshold alert not delivered

1. Run the protected usage-alert endpoint.
2. Confirm the threshold is newly open, not already notified.
3. Confirm at least one active owner/admin has a valid auth email.
4. Check the email delivery record and idempotency digest.
5. Recipient addresses must not be present in metadata or logs.
6. Reducing usage below a threshold resolves the alert; crossing again reopens it and permits a new notification.

## Rollback

Application rollback alone does not remove migrations. For an emergency:

1. Disable internal Enterprise schedulers.
2. Disable new SAML/SCIM onboarding in operations.
3. Revoke affected SCIM tokens.
4. Keep ledger and audit tables intact.
5. Restore the last known good deployment.
6. Do not drop contract, identity, job or audit data.
7. If a function is unsafe, revoke service-role execution and deploy a replacement function with a versioned name.
8. Reconcile organization usage before re-enabling provisioning.

## Escalation evidence

Attach:

- sanitized request IDs;
- contract state/version timeline;
- job counters and lease timestamps;
- audit event names and timestamps;
- Stripe event IDs and event types;
- exact deployment SHA;
- migration list applied in the environment.

Do not attach secrets or employee CSV rows.
