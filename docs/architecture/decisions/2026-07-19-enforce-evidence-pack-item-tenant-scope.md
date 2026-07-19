# Enforce evidence-pack item tenant scope

- Status: Proposed
- Date: 2026-07-19
- Priority: P1 tenant integrity and AI-governance evidence correctness

## Context

`public.enterprise_evidence_pack_items` stores both `organization_id` and `pack_id`. The original schema defines them as independent foreign keys: the organization identifies the tenant used by row-level security, while `pack_id` proves only that an evidence pack exists.

That shape does not prove that the referenced pack belongs to the same organization as the item. A privileged application path, service-role writer, RPC, migration, or future integration could therefore persist an organization-A item under an organization-B pack. Reads and writes would still be authorized using the item's organization, producing inconsistent governance evidence and potentially misleading pack exports or review workflows.

This finding is based on repository source review. It is not evidence of exploitation, a production incident, historical invalid rows, customer impact, an external audit, or a penetration test.

## Decision

Add a unique parent key on `enterprise_evidence_packs (id, organization_id)` and a composite foreign key from `enterprise_evidence_pack_items (pack_id, organization_id)` to that parent key.

The constraint preserves `ON DELETE CASCADE` and is validated immediately when the migration runs. PostgreSQL therefore rejects both future mismatches and deployment when inconsistent historical rows already exist.

The existing single-column foreign key is retained for compatibility. The additional composite constraint supplies the missing tenant invariant without changing RLS or application permissions.

## Consequences

Valid same-tenant item writes remain unchanged. Cross-tenant pack references and pack tenant changes that would orphan item scope are rejected at the database boundary.

The migration adds one unique constraint/index and one foreign key. Existing inconsistent rows, if any, block deployment until they are investigated and corrected. This fail-closed behavior is intentional, but production data has not been inspected in this change.

Tenant-transfer workflows must reconcile or move evidence-pack items before changing a pack's organization. Repository contract tests verify DDL structure only; they do not prove live migration execution, production data cleanliness, concurrency behavior, or runtime deployment.

## Alternatives considered

Application-only validation was rejected because privileged writers, migrations, RPCs, and future integrations could bypass it.

A trigger was rejected because a composite foreign key provides native referential integrity, reverse-update protection, and database concurrency semantics.

A `NOT VALID` constraint was rejected because it would permit deployment without establishing that existing governance evidence is tenant-consistent.

## Rollback

Before deployment, revert this change. After deployment, add a forward migration that drops `enterprise_evidence_pack_items_pack_organization_fkey`. Drop `enterprise_evidence_packs_id_organization_id_key` only after confirming no other foreign key depends on it.

Do not rewrite applied migration history. Rollback deliberately reopens the tenant-integrity gap and requires an explicit security and governance decision.
