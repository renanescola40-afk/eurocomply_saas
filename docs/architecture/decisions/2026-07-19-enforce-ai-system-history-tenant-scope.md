# Enforce AI-system history tenant scope

## Status

Proposed in draft pull request. This decision is not production evidence and does not claim that a migration has been applied outside repository CI.

## Context

`public.ai_system_history` stores both `ai_system_id` and `organization_id`. The existing foreign keys independently prove that the AI system and organization exist, while row-level security authorizes against the history row's `organization_id`.

Those independent checks do not prove that the referenced AI system belongs to the same organization. A writer able to supply a known AI-system UUID could therefore create a history row under one tenant that points to another tenant's AI system. This is a source-review finding only. No production exploitation, affected customer data, external audit result, penetration test, or regulatory breach is claimed.

## Decision

Add a unique parent key on `public.ai_systems (id, organization_id)` and a composite foreign key from `public.ai_system_history (ai_system_id, organization_id)` to that key.

The foreign key is validated when the migration runs. It is not introduced as `NOT VALID`, so deployment stops rather than silently accepting pre-existing cross-tenant rows. Existing `ON DELETE CASCADE` semantics are preserved for deletion of the referenced AI system.

## Consequences

### Positive

- The tenant relationship is enforced by PostgreSQL for application code, RPCs, service-role writers, migrations, and future integrations.
- A history row cannot be inserted or moved to an organization different from its AI system.
- An AI system with referenced history cannot be moved to another organization without first reconciling its history.
- RLS no longer has to carry an invariant it was not designed to prove.

## Risks and trade-offs

- Migration deployment will fail if cross-tenant history rows already exist. That is intentional fail-safe behavior, but operators must inspect and reconcile such rows before retrying.
- The additional unique constraint consumes index storage and adds a small write-maintenance cost on `ai_systems`.
- Code that intentionally rewrites AI-system tenant ownership will now fail while history rows reference the previous tenant. No such supported workflow was identified in this review.

## Validation boundary

The repository contract test checks the migration text and immediate-validation intent. GitHub CI can validate lint, typecheck, tests, build, and static security gates. Only applying the migration to a representative database can prove runtime DDL compatibility and whether legacy rows satisfy the new invariant; no such result is claimed by this decision record.

## Rollback

After confirming no dependent objects require the composite key:

```sql
alter table public.ai_system_history
  drop constraint if exists ai_system_history_system_organization_fkey;

alter table public.ai_systems
  drop constraint if exists ai_systems_id_organization_id_key;
```

Rollback restores the prior behavior and therefore reopens the tenant-integrity gap. Prefer correcting an unexpected compatibility issue and reapplying the invariant instead of leaving it removed.
