# Enterprise tenant licensing operations runbook

## Scope

Use this runbook to roll out, operate, diagnose and safely restrict the contract-backed tenant licensing foundation.

This runbook does not authorize commercial promises. Supported capacity must be based on live migration, concurrency and load evidence from the target environment.

## Preconditions

- A tested backup or recovery point exists for the target Supabase database.
- Migrations are applied in timestamp order.
- The deployment uses a private Supabase service-role key only on the server.
- Trusted origins and distributed rate limiting are configured.
- The platform operator has an enabled `platform_admin_users` record and an AAL2 MFA session.
- The operator understands that contracts are created in `draft` and require explicit activation.

## Migration order

```text
20260721193000_enterprise_tenant_licensing_core.sql
20260721193500_enterprise_platform_roles_and_contract_transitions.sql
20260721194000_enterprise_contract_creation.sql
20260721194500_safe_enterprise_contract_provisioning.sql
20260721195000_transactional_enterprise_invitations.sql
20260721195500_enterprise_usage_and_role_invariants.sql
20260721200000_enterprise_trigger_hardening.sql
```

Do not edit an already-applied migration. Correct production issues with a new compensating migration.

## Post-migration verification

Verify that every existing organization has:

- one current compatibility or negotiated contract;
- one `organization_entitlements` row;
- one `organization_usage` row;
- non-negative counters;
- `active_members = full_users + participants + viewers`.

Verify that browser roles have no direct privileges on:

```text
enterprise_contracts
organization_entitlements
organization_usage
enterprise_seat_operations
```

Verify that safe service-role RPCs are executable and lower-level writers are not directly executable by browser roles.

Regenerate Supabase database types after the target schema is applied. The code contains a narrow compatibility cast for invitation compensation until this regeneration occurs.

## Granting platform access

Use the existing authorized platform-admin provisioning process to add or update `platform_admin_users`. Do not derive platform access from organization membership.

Supported Enterprise roles:

```text
platform_owner
platform_admin
platform_billing
platform_support
platform_security
platform_auditor
```

The user must complete MFA and reach AAL2 before the Control Center or protected APIs authorize access.

## Creating a negotiated contract

1. Open `/{locale}/platform`.
2. Enter the target organization UUID.
3. Enter the signed contract code, currency and annual value in minor units.
4. Enter dates, payment terms and grace period.
5. Define total, full, participant, viewer and administrator limits.
6. Define the non-seat entitlements.
7. Create the contract.
8. Confirm the response says `created` and the status is `draft`.
9. Record the contract UUID in the approved commercial system.
10. Transition `draft -> pending_activation` with a reason.
11. After the approved activation condition is met, transition `pending_activation -> active`.
12. Load organization usage and verify the expected limits.

The safe provisioning RPC rejects a contract whose limits are below current active usage.

## Contract state operations

Every transition requires the expected current status and a reason. A stale expected state returns `state_changed`; reload the contract before retrying.

Common flows:

```text
draft -> pending_activation -> active
active -> past_due -> grace_period -> read_only -> suspended
past_due -> active
read_only -> active
suspended -> active
active -> expired
expired -> active
any allowed state -> terminated
```

`terminated` is terminal. Create a new negotiated contract instead of mutating a terminated contract.

Do not delete organization data because of payment status.

## Seat operations

### Invitation

- Invitation creation reserves capacity immediately.
- Pending invitations count toward total, seat-type and administrator limits.
- Invitation acceptance consumes its reserved capacity atomically.
- Failed email or audit persistence triggers the existing compensation delete.
- Expired, revoked, accepted or deleted invitations no longer reserve capacity after reconciliation/trigger execution.

### Change or reactivate a seat

Use `POST /api/team/members/seat`. The route requires `manage_team`, trusted origin, fail-closed rate limiting and step-up authentication.

A seat change may return:

```text
organization_seat_limit_reached
organization_admin_limit_reached
organization_contract_not_accepting_members
```

Do not override these errors by editing `organization_members` directly.

### Suspend or deprovision

The shared release RPC changes the member status and releases usage. SCIM deprovisioning uses `deprovisioned`; organization administration uses `suspended`.

## Diagnosing usage divergence

Symptoms:

- dashboard usage differs from the member list;
- a seat is blocked even though an administrator expects capacity;
- a counter is negative or the seat sum invariant fails;
- pending invitations do not match visible pending records.

Actions:

1. Stop automated seat provisioning for the affected organization.
2. Capture the organization UUID, request/correlation IDs and current contract status.
3. Run `reconcile_organization_usage_atomic` with an authorized platform actor.
4. Compare active members and pending invitations against real rows.
5. Review `enterprise_seat_operations` for duplicate or failed idempotency keys.
6. Review audit events for direct or legacy membership writes.
7. Do not manually decrement counters.
8. If divergence recurs, identify and migrate the bypassing code path to the shared provisioning adapter.

## Last-seat concurrency validation

Before production approval, execute a database integration test that:

1. creates an active contract with one available seat;
2. issues two concurrent reserve operations with different idempotency keys;
3. confirms exactly one returns a successful allocation;
4. confirms the other returns a limit outcome;
5. confirms real membership count and `organization_usage` agree;
6. repeats the test for full, participant, viewer and administrator quotas;
7. repeats with SCIM/admin/invitation combinations after those entrypoints are implemented.

Static source tests are not sufficient evidence for this production invariant.

## Contract or entitlement outage

If entitlement resolution returns unavailable:

- new seats fail closed;
- existing users are not automatically deleted;
- inspect the current contract, entitlement and usage rows;
- verify schema cache reload and RPC grants;
- verify that the current contract reference matches the entitlement reference;
- reconcile usage after restoring the missing row;
- create an incident record before applying manual corrections.

## Emergency restriction

To stop new access for one organization without deleting data:

1. transition the current contract to `suspended` with an incident reason;
2. verify new invitation, reactivation and provisioning attempts fail;
3. preserve existing data and audit evidence;
4. follow the security incident runbook if compromise is suspected.

To stop all new seat writes during an incident, revoke service-role execute from the safe reserve and invitation RPCs in a new emergency migration, then restore them with another reviewed migration after remediation.

## Operational rollback

This change is additive, but it replaces invitation acceptance and member-role transition RPC definitions. Rollback must therefore be a reviewed compensating migration, not a manual database edit.

Recommended rollback sequence:

1. Disable access to `/{locale}/platform` and the new platform/team seat routes at the application layer.
2. Revoke service-role execute from:
   - `provision_enterprise_contract_atomic`;
   - `transition_enterprise_contract_status_atomic`;
   - `reserve_organization_seat_with_pending_atomic`;
   - `create_organization_invitation_with_seat_atomic`;
   - `release_organization_seat_atomic`.
3. Restore the previous invitation acceptance RPC from `20260716164000_atomic_invitation_acceptance.sql` only if the old application version is being redeployed.
4. Restore the previous role-transition RPC from `20260715113500_atomic_team_member_role_transition.sql` only if the old application version is being redeployed.
5. Keep contract, entitlement, usage, operation and new membership columns in place. Do not drop them during an incident rollback.
6. Do not remove compatibility contracts until the incident is resolved.
7. Reconcile every organization touched during the rollback window.
8. Validate auth, invitations, role changes, RLS and audit logging before reopening writes.

A destructive schema rollback is not recommended because it can lose contract and seat audit evidence.

## Evidence required before merge/release

Repository/CI evidence:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
```

Database evidence:

- migrations applied to an isolated database;
- RLS and grants inspected;
- compatibility backfill verified;
- final-seat concurrency test passed;
- invitation create/accept/revoke/expire flows passed;
- contract transition matrix passed;
- cross-tenant read/write attempts denied;
- rollback rehearsal completed.

Production capacity claims additionally require measured load tests for the intended customer size.
