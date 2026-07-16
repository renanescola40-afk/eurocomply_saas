# Fail closed on vendor-register read failures

- **Status:** Proposed
- **Date:** 2026-07-16
- **Decision owners:** Engineering, Security, SRE, AI Governance

## Context

The shared `listVendors` query used `tryCreateAdminClient()` and returned an empty array when the privileged Supabase client could not be created. It also logged a sanitized provider error code and returned an empty array when the vendor query failed.

That behavior made three materially different states indistinguishable:

1. a successful query with zero vendor records;
2. missing or invalid service-role configuration;
3. a database, provider, schema, or query failure.

The vendor register is used for third-party governance, review status, risk classification, compliance alerts, reporting, and evidence workflows. Representing an infrastructure failure as a valid empty register can mislead users and downstream controls.

## Decision

`listVendors` will:

- require `createAdminClient()` rather than the optional client factory;
- preserve organization-scoped filtering and deterministic ordering;
- log only the sanitized Supabase error code when a query fails;
- propagate the original query error to the existing server error boundary;
- return an empty array only when Supabase successfully returns zero rows.

## Consequences

### Positive

- Empty vendor states now represent successful zero-row reads only.
- Configuration and provider failures reach existing operational error handling instead of appearing as valid governance data.
- Vendor review, alerting, reporting, and evidence consumers are less likely to rely on fabricated empty state.

### Trade-offs

- During a Supabase outage or configuration failure, affected pages or APIs may show their configured error state instead of an empty-state UI.
- This intentionally favors governance integrity over degraded read availability.

## Security and privacy

- Tenant filtering remains `organization_id = organizationId`.
- No secrets, raw database messages, customer data, or runtime evidence are added.
- Logging remains limited to a provider error code.
- RLS, RBAC, schema, migrations, and dependencies are unchanged.

## Validation

A static regression contract verifies that the shared query:

- uses the required admin client;
- does not use `tryCreateAdminClient`;
- throws query failures instead of returning `[]`;
- preserves tenant scoping and ordering.

This decision does not claim production execution, incident occurrence, audit completion, or penetration-test evidence.

## Rollback

Revert the commits in this pull request. Rollback restores the previous best-effort behavior in which client-creation and query failures were represented as an empty vendor register. No database rollback is required.
