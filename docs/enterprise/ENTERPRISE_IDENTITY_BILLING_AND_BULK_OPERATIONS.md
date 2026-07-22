# Enterprise identity, billing and bulk operations

## Status

This document describes repository-side implementation in the Enterprise tenant licensing Mega PR. It is not a claim that production providers have been configured or that a 10,000-user live benchmark has passed.

## Operating model

Risck Comply runs one application and one codebase. Each customer is represented by an `organizations` row and all customer membership, invitations, identities, jobs, contracts, usage and audit evidence are scoped to `organization_id`.

Platform operators use localized `/{locale}/platform` pages. Customer administrators use tenant-scoped team APIs. External identity providers use organization-bound SAML or SCIM credentials.

## Provisioning sequence

1. Create the tenant at `/{locale}/platform/organizations/new`.
2. Copy the returned organization UUID.
3. Create a negotiated Enterprise contract in the Platform Control Center.
4. Configure limits and feature entitlements.
5. Configure billing method and status.
6. Move the contract through the audited state machine to `active` only when commercial prerequisites are satisfied.
7. Provision initial users by individual invitation or a CSV job.
8. Optionally configure a Supabase SAML provider binding and issue a SCIM token.
9. Run internal provisioning, lifecycle and usage-alert schedulers.

## Seat authority

All active membership allocation uses a PostgreSQL RPC that serializes on the organization usage record. The operation checks:

- contract status;
- total member limit;
- full-user, participant and viewer limits;
- administrator limit;
- pending invitations;
- queued bulk-provisioning rows;
- idempotency key;
- existing membership state.

The frontend is never the authority. Direct backend calls and simultaneous requests reach the same transactional functions.

## Bulk CSV

Both platform operators and customer administrators can create durable provisioning jobs. The parser accepts at most 10,000 unique normalized email addresses. Jobs reserve aggregate capacity before queue insertion and are processed with bounded leases and `FOR UPDATE SKIP LOCKED`.

Each row still enters the canonical invitation service. The worker does not insert into `organization_members` directly. Email delivery and durable audit evidence are required; compensation deletes the pending invitation if a later mandatory step fails.

Internal endpoint:

```text
POST /api/internal/enterprise-provisioning?batchSize=100
Authorization: Bearer <internal cron secret>
```

## SAML SSO

Supabase Auth remains the single authentication stack. The platform binds one Supabase SSO provider UUID to:

- one organization;
- one verified email domain;
- an active identity connection;
- default role and seat type;
- auto-provision or pre-provision policy;
- the negotiated SSO entitlement.

The callback reads the SAML provider UUID from trusted Supabase claims. It does not trust editable user metadata for tenant selection. A SAML session is signed out when the provider/domain binding is missing, the contract is inactive, SSO is disabled or no licensed seat is available.

Login initiation uses `supabase.auth.signInWithSSO({ domain })`. Provider configuration itself remains an external Supabase dashboard/API operation and needs runtime validation with the customer IdP.

## SCIM

Implemented SCIM surface:

```text
/api/scim/v2/ServiceProviderConfig
/api/scim/v2/ResourceTypes
/api/scim/v2/Schemas
/api/scim/v2/Users
/api/scim/v2/Users/{id}
```

Supported user operations:

- create;
- list and `userName eq` filter;
- read;
- PatchOp for active state, external ID, role and seat type;
- DELETE as deactivation and seat release.

Tokens are displayed once and stored only as a SHA-256 digest. The token supplies the tenant boundary. Request payloads cannot select another organization. Every SCIM allocation and reactivation uses the same seat ledger.

SCIM Groups and provider-specific certification suites are not included in this PR.

## Negotiated billing

`enterprise_contracts.contract_mode` distinguishes:

- `compatibility`: legacy bridge records used to preserve existing organizations;
- `negotiated`: real Enterprise agreements managed by the Platform Control Center.

Only negotiated contracts participate in Enterprise Stripe synchronization, dunning, lifecycle scheduling and usage alerts.

Supported payment methods:

- Stripe subscription;
- Stripe invoice;
- bank transfer;
- manual invoice.

The Stripe webhook first attempts an idempotent negotiated-contract match using contract metadata, subscription binding and organization binding. Unmatched events continue through the existing self-service billing handler.

Billing events are persisted in `enterprise_contract_billing_events`. The lifecycle scheduler can advance:

```text
pending_activation -> active
active -> past_due
past_due -> grace_period
past_due/grace_period/read_only -> active after payment
 grace_period -> read_only
active/past_due/grace_period/read_only -> expired at contract end
```

Internal endpoint:

```text
POST /api/internal/enterprise-contract-lifecycle?batchSize=100
Authorization: Bearer <internal cron secret>
```

## Usage alerts

Thresholds are durable and idempotent at 80%, 90% and 100% for:

- total members;
- full users;
- participants;
- viewers;
- administrators.

The calculation includes active usage, pending invitations and queued/processing import rows. New alerts are emailed to active organization owners/admins without putting recipient email addresses in audit metadata or idempotency keys.

Internal endpoint:

```text
POST /api/internal/enterprise-usage-alerts?batchSize=100
Authorization: Bearer <internal cron secret>
```

## Required production validation

Before claiming production readiness, capture evidence for:

- migrations applied to a non-production Supabase project;
- RLS and service-role grants;
- concurrent last-seat reservation;
- 1,000, 3,000, 5,000 and 10,000-row imports against real Postgres;
- email provider delivery and retry behavior;
- Supabase SAML provider login with a real IdP;
- SCIM conformance tests from the selected identity provider;
- Stripe test-mode subscription, invoice paid and payment-failed events;
- scheduler execution, alert delivery and rollback;
- observability dashboards and sanitized failure events.

The repository test for exactly 10,000 CSV rows proves the parser boundary and stable digest only. It is not a live throughput benchmark.
