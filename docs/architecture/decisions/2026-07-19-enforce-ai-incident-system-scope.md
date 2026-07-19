# Enforce tenant scope for AI incident system references

- Status: Proposed
- Date: 2026-07-19
- Priority: P1

## Context

`ai_incidents` is organization scoped, but its optional `ai_system_id` foreign key previously proved only that the referenced AI system existed. The incident insert and update RLS policies validate membership in the incident organization; they do not prove that the referenced AI system belongs to that same organization.

A caller able to supply a known AI-system UUID could therefore create or update an incident in one tenant while linking it to an AI system in another tenant. The foreign key would accept the reference because the row exists. This weakens tenant integrity and the reliability of AI-incident governance records even when row visibility remains restricted.

This is a source-review finding. It does not establish exploitation, production impact, a penetration-test result, or regulatory non-compliance.

## Decision

Add a database trigger on `ai_incidents` that runs before inserts and before updates to `organization_id` or `ai_system_id`.

When `ai_system_id` is present, the trigger requires a matching `ai_systems` row with both the supplied system ID and the incident organization ID. A mismatch is rejected with PostgreSQL `check_violation`.

The trigger function uses `SECURITY DEFINER`, an empty `search_path`, fully qualified relations, and revoked direct execution privileges. Incidents without an AI-system reference remain valid.

## Consequences

### Positive

- Cross-tenant AI-system references are rejected at the database boundary.
- Service-role and future application paths receive the same invariant.
- Existing RLS and application authorization remain unchanged.
- No dependency, secret, environment, or API response change is introduced.

### Trade-offs

- This is prospective enforcement. It does not scan, repair, or claim absence of historical mismatches.
- Deployments containing invalid historical rows are not blocked because the trigger validates new writes and relevant updates only.
- Removing or transferring organization membership does not affect this invariant; it concerns system ownership, not actor membership.

## Validation

A source-level migration contract test verifies the tenant join, trigger coverage, nullable-reference behavior, hardened function configuration, and revoked direct execution.

Required exact-head CI, migration validation, lint, typecheck, tests, build, security, and release gates remain authoritative before merge.

## Rollback

Revert the migration, test, and this decision record together. If the migration has already been applied, a follow-up migration must explicitly drop `enforce_ai_incident_system_scope` and `public.enforce_ai_incident_system_scope()`; do not edit an applied migration in place.
