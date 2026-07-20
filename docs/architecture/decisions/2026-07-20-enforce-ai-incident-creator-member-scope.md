# ADR: Enforce AI-incident creator membership at the database boundary

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security and AI-governance accountability

## Context

`public.ai_incidents` stores `organization_id` and nullable `created_by` as independent foreign keys. The organization reference scopes the incident, while the user reference proves only that the attributed account exists in `auth.users`.

Existing row-level policies authorize through the incident organization. They do not establish that `created_by` belongs to that organization. A privileged backend defect, service-role integration, migration, or future writer could therefore persist a tenant-scoped incident attributed to a user from another tenant or to a non-member.

This decision is based on repository source review only. It does not claim a production incident, exploit, historical-data defect, penetration test, external audit, certification, or customer impact.

## Decision

Add a prospective `BEFORE INSERT OR UPDATE OF organization_id, created_by` trigger on `public.ai_incidents`.

For each non-null `created_by`, the trigger requires a matching `(organization_id, user_id)` row in `public.organization_members`. Violations fail with PostgreSQL `check_violation` (`23514`).

The trigger function is `SECURITY DEFINER`, uses an empty `search_path`, references fully qualified relations, and has direct execution revoked from `public`, `anon`, and `authenticated`.

## Consequences

Valid same-tenant incident writes are unchanged. Null creator attribution remains supported for system-created or legacy-compatible records. Cross-tenant and non-member creator attribution is rejected at the database boundary, including writes performed by application code, RPCs, service-role clients, migrations, or future integrations.

Each affected write adds one indexed organization-membership existence lookup.

## Risks and trade-offs

- Enforcement is prospective; this change does not assert that historical production rows are clean.
- Updating the organization or creator on an already inconsistent row will fail until the attribution is corrected or cleared.
- External reporters or other non-member actors must be represented in an explicit non-user provenance field rather than `created_by`.
- Member offboarding does not rewrite historical incident attribution.
- Tenant-transfer workflows must update creator attribution deliberately.
- The migration has not been executed against production data in this review.

## Validation

A focused Vitest contract verifies the membership predicate, nullable creator behavior, trigger coverage, failure class, empty `search_path`, and execution revocation.

Repository-mandated CI must pass on the exact pull-request head before merge. No runtime Supabase validation, production migration execution, audit, certification, or penetration-test result is claimed by this ADR.

## Rollback

Deploy a new follow-up migration that drops trigger `enforce_ai_incident_creator_member_scope` from `public.ai_incidents`, then drops function `public.enforce_ai_incident_creator_member_scope()`.

Do not rewrite an applied migration. Rollback deliberately reopens the attribution-integrity risk and requires a documented security decision.
