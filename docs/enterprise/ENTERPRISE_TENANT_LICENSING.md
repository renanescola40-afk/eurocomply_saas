# Enterprise tenant licensing and access control

## Purpose

This architecture allows Risck Comply to sell negotiated annual contracts to organizations with hundreds or thousands of users while keeping one application, one codebase and one multi-tenant database.

An Enterprise customer is an existing `organizations` record. Every customer-owned resource remains scoped by `organization_id`; the licensing layer does not create a separate deployment, database or copy of the application for each customer.

## Delivered scope

This implementation provides the deployable licensing and control-plane foundation:

- negotiated Enterprise contracts with annual value, currency, dates, payment terms, grace period and lifecycle status;
- central organization entitlements instead of scattered `plan === "enterprise"` checks;
- independent `role` and `seat_type` values;
- full, participant and viewer seat quotas;
- administrator quotas;
- transactionally serialized seat reservation and release;
- pending-invitation capacity reservation;
- idempotent provisioning operations;
- authoritative usage reconciliation and membership/invitation triggers;
- platform roles consolidated in the existing MFA-protected `platform_admin_users` authority;
- an internal `/{locale}/platform` Control Center;
- protected APIs for contract provisioning, state transitions and organization usage;
- a shared provisioning adapter for future SCIM, SSO, CSV, API and platform entrypoints;
- compatibility backfill for existing organizations so rollout does not unexpectedly block current customers.

## Data model

### `enterprise_contracts`

Stores the commercial and operational contract authority for one organization. Important fields include:

- `organization_id`;
- `contract_code`;
- `currency` and `annual_value_minor`;
- `starts_at`, `ends_at` and `renews_at`;
- payment and grace-period settings;
- contract lifecycle status;
- total, seat-type and administrator limits;
- AI-system, legal-entity, storage and audit-retention limits;
- SSO, SCIM, API, webhook, custom-role, advanced-report and priority-support switches;
- Stripe references when they are populated by an authorized billing integration;
- optimistic `version` and audit actors.

Only one current contract may exist per organization. Historic expired or terminated contracts may remain for evidence and renewal history.

### `organization_entitlements`

Materializes the effective contractual limits and feature switches for an organization. Authorization resolves the strictest value between the current contract and the materialized entitlement. Missing or inconsistent data fails closed.

### `organization_usage`

Stores optimized counters for active members, seat types, active administrators and pending invitations. The row also acts as the organization-level serialization lock for every seat-consuming operation.

The counters are not trusted blindly. Critical RPCs recount the real membership state while holding the same lock, and triggers keep the optimized row synchronized after inserts, updates and deletes.

### `enterprise_seat_operations`

Provides an organization-scoped idempotency ledger for seat reserve, release and change operations. The tuple `(organization_id, idempotency_key)` is unique.

The ledger stores only sanitized operational metadata. It must not contain invitation tokens, SCIM tokens, assertions, passwords or full personal payloads.

## Roles and seats are different concepts

`organization_members.role` controls what a user may do. `organization_members.seat_type` controls which contractual capacity the user consumes.

Examples:

```text
role = admin
seat_type = full
```

```text
role = member
seat_type = participant
```

Supported seat types:

- `full`: normal operational access subject to RBAC;
- `participant`: constrained participation, evidence, task or questionnaire access when the relevant product surface supports it;
- `viewer`: read-only access where permitted by RBAC.

Adding a seat type does not grant a permission. Adding a role does not bypass a seat quota.

## Contract lifecycle

Supported states:

```text
draft
pending_activation
active
past_due
grace_period
read_only
suspended
expired
terminated
```

Only explicit transitions defined by `is_valid_enterprise_contract_transition` are accepted. The transition RPC requires:

- the expected current state;
- the requested next state;
- a platform actor with the required capability;
- an audit reason;
- a locked contract row.

Only `active` contracts accept new seats. Existing customer data is not deleted when a contract becomes overdue, read-only, suspended, expired or terminated.

## Seat serialization invariant

Every active membership allocation must pass through the organization usage lock:

1. lock `organization_usage` for the organization;
2. lock and validate the current contract;
3. lock and validate entitlements;
4. recount active members and administrators;
5. count non-expired pending invitations;
6. validate total, seat-type and administrator limits;
7. write or reactivate the member;
8. update usage;
9. persist audit and idempotency evidence;
10. commit everything in one transaction.

This prevents two administrators, SCIM and an invitation, or multiple API calls from consuming the same final seat concurrently.

## Invitation reservation

Creating an invitation reserves contractual capacity before email delivery. The creation RPC locks the organization usage row and counts all valid pending invitations.

Acceptance excludes only the invitation currently being accepted, then calls the same pending-aware seat reservation path. The invitation is marked accepted only after the membership allocation succeeds.

If email delivery or required audit persistence fails, the existing compensation flow deletes the pending invitation. The invitation trigger recalculates pending usage.

## Platform authority

Global platform roles remain separate from organization membership and use the existing `platform_admin_users` table:

- `platform_owner`;
- `platform_admin`;
- `platform_billing`;
- `platform_support`;
- `platform_security`;
- `platform_auditor`.

Legacy `owner`, `sales_admin`, `sales_rep` and `support_admin` roles remain supported for compatibility.

All platform access requires an enabled global role and an AAL2 MFA session. The TypeScript capability matrix and PostgreSQL transition/provisioning checks both enforce operator scope.

## Application entrypoints

### Internal platform UI

```text
/{locale}/platform
```

The page can:

- provision a draft negotiated contract;
- inspect current limits, usage and availability;
- apply audited contract transitions.

The browser is never an authorization source. All actions use protected APIs and are checked again by PostgreSQL RPCs.

### Platform APIs

```text
POST /api/platform/contracts
POST /api/platform/contracts/status
GET  /api/platform/organizations/{organizationId}/usage
```

Mutation routes require authentication, trusted origin, distributed fail-closed rate limiting, platform capability and AAL2 MFA. Responses use no-store headers and sanitized error codes.

### Organization team APIs

```text
POST /api/team/invites
POST /api/team/members/role
POST /api/team/members/seat
```

These routes require organization membership, `manage_team`, trusted mutation controls and step-up authentication where applicable.

## Integration contract

SCIM, SSO, CSV, API and internal administration must call:

```text
provisionEnterpriseIdentity
```

Deprovisioning must call:

```text
deprovisionEnterpriseIdentity
```

The adapter delegates to the same seat RPCs used by the product UI. New integrations must not insert or reactivate `organization_members` directly.

## Compatibility rollout

Existing organizations receive a permissive compatibility contract and entitlements during migration. This avoids blocking current customers before commercial limits are configured.

When the first negotiated contract is provisioned:

1. the organization usage row is locked;
2. real current usage is reconciled;
3. proposed limits are validated against current usage;
4. only then is the compatibility contract replaced;
5. the negotiated contract starts in `draft`.

The platform operator must separately transition it to `pending_activation` and then `active`.

## Security properties

- new contract, entitlement, usage and operation tables have RLS enabled and forced;
- browser roles have no direct table privileges;
- privileged RPCs use `security definer` with a fixed `search_path`;
- service-role execute grants are explicit;
- the lower-level contract writer and legacy seat writer are revoked from service-role callers after safe wrappers are installed;
- platform roles are not derived from `organization_members`;
- tenant IDs are supplied and validated server-side;
- sensitive routes use no-store responses;
- logs use codes and sources, not tokens, assertions or full payloads;
- contract and seat changes create audit events.

## Known remaining work

This PR does **not** claim that the complete Enterprise roadmap is finished. The following require additional end-to-end implementation and runtime proof before being sold as available:

- persisted CSV import jobs, worker execution, preview, resume and per-row reports;
- a complete SCIM HTTP server and provider conformance tests;
- SAML/OIDC login provisioning wired to the shared seat adapter;
- Stripe quote/invoice/subscription automation for negotiated contracts;
- automatic past-due, grace, read-only and suspension scheduling;
- production load evidence for 1,000, 3,000 and 10,000-member organizations;
- live Supabase migration, rollback and concurrency evidence;
- customer-facing team/license management UI beyond the protected backend APIs;
- alert delivery at 80%, 90%, 95% and 100% usage.

These items must reuse this licensing authority instead of creating parallel counters or plan checks.
