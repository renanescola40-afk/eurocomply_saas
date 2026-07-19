# Enforce AI assessment system tenant scope

- Status: Proposed
- Date: 2026-07-19
- Priority: P1 tenant integrity and AI-governance record correctness

## Context

`public.ai_assessments` stores an `organization_id` and an optional `ai_system_id`. Existing row-level-security policies authorize reads and mutations through the assessment row's organization. The existing foreign key on `ai_system_id` proves that the referenced AI system exists, but it does not prove that the AI system belongs to the same organization.

A privileged writer, service-role path, migration, or future integration could therefore persist an assessment under one tenant while linking it to another tenant's AI system. This is a repository source-review finding. It does not claim exploitation, production impact, a live data issue, penetration testing, external assurance, or regulatory non-compliance.

## Decision

Add a database trigger that rejects any non-null `ai_system_id` unless `public.ai_systems` contains the same ID with the assessment's `organization_id`.

The trigger runs before inserts and updates that change `organization_id` or `ai_system_id`. Assessments without an AI-system reference remain valid. The trigger function is `SECURITY DEFINER`, uses an empty `search_path`, qualifies referenced relations, and is not directly executable by `public`, `anon`, or `authenticated`.

## Why the database boundary

Assessment records can be written through more than one application path. A database invariant covers authenticated RLS writes, privileged service-role writes, RPCs, migrations, and future integrations without relying on every caller to duplicate the same validation correctly.

## Impact

Valid same-tenant assessment writes are unchanged. Cross-tenant AI-system references now fail with PostgreSQL `check_violation`. Each write with a non-null AI-system reference performs one indexed lookup by the AI-system primary key.

## Risks and trade-offs

- Enforcement is prospective. This change does not scan or remediate historical rows.
- Undocumented integrations that intentionally write cross-tenant references will fail, which is the intended security behavior.
- A future tenant-transfer workflow must reconcile linked assessment records before changing ownership.
- Repository contract tests do not prove production migration execution or historical data cleanliness.

## Validation

A focused Vitest contract verifies the organization-match predicate, insert and scope-changing update coverage, nullable-reference behavior, hardened function configuration, and revoked direct execution.

All required GitHub checks must be green on the exact pull-request head before merge. No runtime database result, production validation, audit, penetration test, or certification is claimed.

## Rollback

After deployment, use a follow-up migration to drop `enforce_ai_assessment_system_tenant_scope` from `public.ai_assessments` and then drop `public.enforce_ai_assessment_system_tenant_scope()`. Do not rewrite applied migration history.

Rollback deliberately reopens the tenant-integrity risk and therefore requires a documented security decision.
