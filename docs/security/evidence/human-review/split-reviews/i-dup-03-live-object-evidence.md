# Supabase split review — I-DUP-03 (`20260612`)

Status: **TECHNICAL SPLIT-REVIEW EVIDENCE — NO PRODUCTION AUTHORIZATION**

Current evidence subject: `main` after PR #1603 (`d65c7c68d452c47ffff822aefb3ec7c2b2215c06`).

This dossier resolves the technical ambiguity inside duplicate-version group I-DUP-03 without representing the model, automation, or repository owner as the distinct independent approver required by the canonical migration Decision Gate.

## Group members

- `supabase/migrations/20260612_audit_event_hash_chain.sql`
- `supabase/migrations/20260612_intelligence_tables.sql`
- `supabase/migrations/20260612_seed_intelligence_items.sql`

## Live production evidence

A read-only production-schema inspection on 2026-08-13 established:

- `public.audit_events` exists;
- all five hash-chain columns from `20260612_audit_event_hash_chain.sql` exist with the expected types/nullability/default boundary:
  - `actor_user_id uuid` nullable;
  - `previous_hash text` nullable;
  - `event_hash text` nullable;
  - `hash_algorithm text not null default 'sha256'`;
  - `hash_signature text` nullable;
- all three indexes from that migration exist:
  - `audit_events_event_hash_key`;
  - `audit_events_org_created_hash_idx`;
  - `audit_events_previous_hash_idx`;
- `public.intelligence_items` does not exist;
- `public.intelligence_calendar_suggestions` does not exist;
- `public.email_notification_events` does not exist.

The production Vercel runtime independently records recurring `PGRST205` failures from `/api/intelligence/refresh`, matching the missing `intelligence_items` object rather than an application-code parsing error.

## Technical disposition candidates

### 1. `20260612_audit_event_hash_chain.sql`

**Candidate classification: `ALREADY_PRESENT_IN_SCHEMA`.**

The live schema contains every column and every named index created by this migration. The canonical Decision Gate should use this dossier as schema-level object evidence; it must not replay this SQL solely because the migration filename is absent from remote history.

### 2. `20260612_intelligence_tables.sql`

**Candidate classification: `SUPERSEDED`.**

The objects are absent from production, so this migration is not `ALREADY_PRESENT_IN_SCHEMA`. It should also not be promoted directly as the enterprise production candidate because the later reviewed reconciliation migration

`supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql`

contains the same Intelligence runtime objects with stronger security boundaries, including:

- fixed function `search_path`;
- explicit function privilege revocation and service-role grant;
- explicit table grants/revokes;
- authenticated-only SELECT policies;
- tenant membership delegated to the canonical `app_private.is_org_member(...)` helper.

The legacy migration instead uses direct `auth.uid()` predicates and does not carry the later explicit privilege hardening. The hardened reconciliation migration is therefore the technical replacement candidate. This dossier does **not** authorize executing the broad reconciliation migration in production.

### 3. `20260612_seed_intelligence_items.sql`

**Candidate classification: `ARCHIVE_LEGACY`.**

This is seed/content data rather than required schema. It depends on `intelligence_items`, contains legacy `EuroComply Intelligence Desk` branding, and is not required to restore the table contract used by `/api/intelligence/refresh`. Current runtime code already owns an idempotent RISCK COMPLY maintenance item. Historical seed content should not be made a production-schema prerequisite.

If product/content owners want equivalent sample editorial content later, it should be introduced through a separately reviewed current-brand content operation rather than by replaying this duplicate-version migration.

## Runtime impact and required closure path

The live Intelligence refresh path is currently schema-blocked. Closing this safely requires, in order:

1. canonical human acceptance of the I-DUP-03 split dispositions;
2. a bounded staging rehearsal of the selected hardened replacement path;
3. rollback/backup evidence for the exact selected production DDL;
4. distinct independent approval required by the Decision Gate;
5. protected production execution;
6. a live assertion that both Intelligence tables exist with the hardened privilege/RLS boundary;
7. a successful `/api/intelligence/refresh` runtime proof with no `PGRST205`.

## Safety boundary

This dossier performs no SQL write and grants no production authorization.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `migrationHistoryModified = false`
- `databaseModifiedByThisDossier = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`

It is schema/object evidence and a technical classification recommendation only.
