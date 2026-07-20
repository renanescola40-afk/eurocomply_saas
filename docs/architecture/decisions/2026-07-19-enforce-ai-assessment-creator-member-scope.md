# Enforce AI-assessment creator membership scope

- Status: Proposed
- Date: 2026-07-19
- Priority: P1
- Area: AI governance, tenant integrity, accountability

## Context

`public.ai_assessments` stores both `organization_id` and nullable `created_by`. The existing foreign keys prove that the organization and user exist independently, while row-level security authorizes through the assessment organization. They do not prove that the attributed creator belongs to that organization.

A privileged backend, service-role path, migration, or future integration could therefore persist an organization-A assessment attributed to a user who is not an organization-A member. That would weaken tenant-consistent accountability for a material AI-governance record.

This is a source-code finding. It is not evidence of a production incident, exploit, external audit, certification, or penetration test.

## Decision

Add a database trigger that requires every non-null `created_by` value to have a matching `(organization_id, user_id)` row in `public.organization_members`.

The trigger runs before inserts and before updates that change `organization_id` or `created_by`. It preserves null creator attribution, including rows whose user is later deleted through the existing `ON DELETE SET NULL` foreign key behavior.

The function is `SECURITY DEFINER`, uses an empty `search_path`, fully qualifies referenced relations, and is not directly executable by `public`, `anon`, or `authenticated`.

## Impact

Valid same-tenant assessment writes are unchanged. Cross-tenant or non-member creator attribution is rejected at the database boundary for application, RPC, service-role, migration, and future integration writers.

Each affected write performs one membership existence lookup. The repository's organization-member uniqueness/indexing invariant supports that lookup.

## Risks and trade-offs

- Existing inconsistent rows are not scanned or rewritten; enforcement is prospective.
- Updating an existing inconsistent row's organization or creator will fail until corrected.
- Deliberately attributing an assessment to an external non-member is no longer allowed; such provenance must use another explicit field or leave `created_by` null.
- Removing a member does not rewrite historical assessment attribution. This preserves history and avoids coupling offboarding to governance-record mutation.

## Verification

A structural migration contract verifies the organization/member predicate, nullable creator behavior, trigger event coverage, fixed PostgreSQL error class, hardened function configuration, and execution revocations.

Required repository CI must pass on the exact pull-request head before merge. No production migration execution or historical-data validation is claimed by this decision record.

## Rollback

Deploy a follow-up migration that drops `enforce_ai_assessment_creator_member_scope` from `public.ai_assessments`, then drops `public.enforce_ai_assessment_creator_member_scope()`.

Do not rewrite applied migration history. Rollback deliberately reopens the attribution-integrity risk and requires a documented security decision.
