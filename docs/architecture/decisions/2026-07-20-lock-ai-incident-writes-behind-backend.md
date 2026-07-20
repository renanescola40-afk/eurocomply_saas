# ADR: Keep AI-incident mutations behind reviewed backend boundaries

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security and AI-governance integrity

## Context

The repository has reviewed server-side AI-incident mutation paths that enforce authentication, organization scope, permissions, trusted origin, distributed throttling, bounded validation, atomic lifecycle behavior, and durable audit evidence.

Allowing authenticated browser sessions to retain direct `INSERT`, `UPDATE`, or `DELETE` authority on `public.ai_incidents` would permit PostgREST/table DML to bypass those controls. Tenant-scoped RLS alone does not provide trusted-origin enforcement, bounded request validation, rate limiting, lifecycle transition rules, optimistic concurrency, or atomic audit persistence.

This decision is based on repository source and migration review only. It does not claim exploitation, a production incident, historical misuse, live Supabase validation, an audit, a certification, or a penetration test.

## Decision

Add a late additive migration that:

- fails closed if `public.ai_incidents` is absent;
- keeps RLS enabled and forced;
- removes any write policy applying to `public`, `anon`, or `authenticated`, without relying on historical policy names;
- revokes direct `INSERT`, `UPDATE`, and `DELETE` privileges from `anon` and `authenticated`;
- preserves authenticated `SELECT` access subject to existing read policies;
- preserves service-role DML for reviewed server-side and migration workflows;
- installs explicit deny policies for authenticated inserts, updates, and deletes.

## Consequences

Supported backend mutation paths remain available. Signed-in clients may continue tenant-scoped reads but cannot mutate AI incidents directly through Supabase/PostgREST.

This closes a control-bypass path for trusted-origin checks, throttling, validation, lifecycle enforcement, concurrency protection, and atomic audit evidence.

## Risks and trade-offs

- Any undocumented browser, mobile, script, or integration client performing direct table writes will fail after migration.
- Service-role code remains privileged and must continue to enforce authorization and audit requirements.
- The migration removes direct-client write policies dynamically; human review should confirm that no intentional authenticated write policy is required.
- No production migration execution or runtime compatibility test is claimed.
- This change does not alter historical rows or prove that prior direct writes occurred.

## Validation

A focused Vitest source contract verifies table-presence failure, dynamic removal of direct-client write policies, revoked authenticated DML, preserved reads and service-role privileges, forced RLS, and explicit deny policies.

Repository-required CI must pass on the exact pull-request head before merge. Runtime Supabase/PostgREST validation remains a deployment-stage responsibility.

## Rollback

Before deployment, revert the migration, test, and ADR together.

After the migration is applied, use a reviewed forward migration to restore only the specifically approved client privileges and policies. Do not edit an applied migration. Restoring direct authenticated DML deliberately reopens the backend-control bypass and requires a documented security decision.
