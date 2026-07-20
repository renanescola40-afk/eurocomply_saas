# Enforce enabled platform-admin scope for Sales Console actors

- Status: Proposed
- Date: 2026-07-19
- Priority: P1 security and accountability integrity

## Context

The internal Sales Console is restricted in application code through `requirePlatformAdmin`, and its tables are revoked from direct `anon` and `authenticated` access. However, several durable attribution fields reference `auth.users` directly:

- `sales_leads.owner_user_id`
- `sales_leads.updated_by`
- `sales_lead_activities.created_by`
- `sales_lead_notes.created_by`
- `sales_lead_activity_events.actor_user_id`

Those foreign keys prove only that an account exists. They do not prove that the account is an enabled member of `platform_admin_users`. A service-role caller, migration, future integration, or application defect could therefore persist ownership or activity attribution to an arbitrary authenticated user even though that user is not authorized to operate the Sales Console.

This is a repository source-review finding. It is not evidence of exploitation, production impact, a completed audit, or a penetration test.

## Decision

Add a database trigger function that requires every non-null Sales Console owner or actor reference to match an enabled row in `public.platform_admin_users`.

The function:

- is `SECURITY DEFINER` with an empty `search_path`;
- uses fully qualified relations;
- raises PostgreSQL `check_violation` for invalid attribution;
- preserves nullable attribution fields;
- has direct execution revoked from `public`, `anon`, and `authenticated`.

Triggers cover inserts and relevant actor-column updates on the lead, activity, note, and activity-event tables.

## Consequences

### Positive

- Ownership and activity attribution remain aligned with the Sales Console authorization model.
- The invariant applies to service-role code, migrations, RPCs, and future integrations, not only current UI actions.
- Existing RLS, table grants, and application authorization remain unchanged.

### Trade-offs

- Disabled platform administrators cannot be assigned to new or changed ownership/actor fields.
- Existing historical rows are not scanned, rewritten, or claimed to be valid.
- Disabling an administrator does not rewrite historical attribution; lifecycle handling remains separate.
- A future workflow that intentionally attributes an external actor needs an explicit separate field rather than overloading privileged-user columns.
- Each affected write performs one indexed lookup against `platform_admin_users.user_id`.

## Evidence and validation boundary

Repository evidence establishes that the Sales Console application requires platform-admin access while the listed database columns reference any `auth.users` row. The migration and contract test establish the proposed static invariant.

No production migration execution, historical-data review, runtime Supabase validation, external security assessment, certification, or compliance attestation is claimed. Required GitHub checks on the exact pull-request head remain authoritative before merge.

## Rollback

After deployment, use a forward migration to drop these triggers:

- `enforce_sales_lead_owner_admin_scope`
- `enforce_sales_lead_updater_admin_scope`
- `enforce_sales_lead_activity_creator_admin_scope`
- `enforce_sales_lead_note_creator_admin_scope`
- `enforce_sales_lead_event_actor_admin_scope`

Then drop `public.enforce_sales_console_admin_actor_scope()` after confirming no trigger depends on it. Do not rewrite applied migration history. Rollback deliberately reopens the attribution-integrity gap and requires a documented security decision.
