# Fail closed on AI inventory and history read failures

- Date: 2026-07-16
- Status: Proposed
- Scope: AI-governance inventory read boundary

## Context

`listAiSystems` and `listAiSystemHistory` used `tryCreateAdminClient()` and returned an empty array when the privileged Supabase client could not be created. They also returned an empty array for query errors, including missing tables and provider/database failures.

That behavior made materially different states indistinguishable:

1. the organization genuinely has no AI systems or history records; and
2. the application could not read the governance records.

For an AI-governance product, presenting an infrastructure or configuration failure as an empty inventory can mislead operators, downstream evidence-pack generation, incident workflows, and customers reviewing governance evidence.

## Decision

Use `createAdminClient()` for AI inventory and history reads and propagate query errors after logging only the provider error code.

Successful reads continue returning an empty array when the database successfully reports zero rows. Failed reads now reach the existing secure API/page error boundaries instead of being represented as valid empty governance data.

## Impact

- AI inventory and history pages/APIs fail visibly when the privileged client or database query is unavailable.
- Workflows that validate an AI-system identifier no longer misclassify a database outage as `ai_system_not_found`.
- Evidence generation no longer silently derives country scope or content from a fabricated empty inventory.
- No database schema, RLS, RBAC, dependency, secret, or migration changes are introduced.

## Risks

- Some server-rendered pages that previously showed an empty state during a Supabase outage will now render their configured error boundary.
- Deployments missing required Supabase service-role configuration will fail earlier and more visibly.

These are intentional fail-closed outcomes. The change does not alter authorization or tenant filters.

## Verification

A regression contract asserts that the shared query module:

- no longer imports or invokes `tryCreateAdminClient`;
- uses `createAdminClient` for the read paths;
- throws query errors for inventory and history reads;
- does not return `[]` from either error branch.

Repository CI remains the source of truth for typecheck, lint, unit tests, security gates, and build results. No runtime availability or production migration evidence is claimed by this decision record.

## Rollback

Revert the commits in this pull request. That restores the previous best-effort behavior, including its known risk of representing read failures as empty governance data. No database rollback is required.
