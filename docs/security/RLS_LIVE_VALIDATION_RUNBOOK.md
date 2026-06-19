# EuroComply RLS Live Validation Runbook

This runbook defines how EuroComply validates Supabase Row Level Security before release candidate and enterprise production readiness.

## Purpose

Row Level Security is a core tenant-isolation control. Static SQL review is useful, but enterprise readiness requires validating RLS against a real Supabase project using controlled backend credentials and representative tenant data.

## Current Modes

### Advisory Mode

The RLS gate runs in advisory mode when:

```txt
SUPABASE_ACCESS_TOKEN is not configured
```

In advisory mode, CI can still validate static migration and policy evidence, but it cannot prove live Supabase state.

This mode is acceptable for local development and early preview environments only. It is not acceptable for Release Candidate or public production approval.

### Live Validation Mode

The RLS metadata gate should run in live validation mode when:

```txt
SUPABASE_ACCESS_TOKEN is configured
NEXT_PUBLIC_SUPABASE_URL points to the target Supabase project
SUPABASE_SERVICE_ROLE_KEY is configured for the same target project
```

The tenant-isolation proof must additionally run:

```txt
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register
```

This script creates tenant A and tenant B, creates users/members for each tenant, seeds representative rows, signs in with both tenant clients, verifies tenant A cannot read, insert, update, or delete tenant B data, and verifies same-tenant reads still work where expected.

The older `scripts/security/run-supabase-live-rls-validation.mjs` remains for compatibility, but the strict release validator is `scripts/security/run-supabase-live-tenant-isolation.mjs`.

## Required Environment Variables

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN
```

## Required Validation Evidence

Before enterprise release, collect evidence that:

- RLS is enabled on tenant-scoped tables.
- Anonymous access cannot read tenant-owned records.
- Authenticated users cannot read another organization's records.
- Authenticated users cannot insert another organization's records with an RLS or permission denial, not merely a duplicate-key or unrelated application error.
- Authenticated users cannot update another organization's records.
- Authenticated users cannot delete another organization's records.
- Same-tenant reads still work for the signed-in user's own organization and representative seeded rows.
- Service-role-only operations are restricted to controlled server-side code paths.
- Audit events preserve organization context.
- GDPR delete/export flows remain organization scoped.
- Evidence/export endpoints do not bypass tenant isolation.

## Critical tables

The live validation and metadata gates must cover these tables when present:

- organizations
- organization_members
- documents
- audit_events
- audit_logs
- risks
- vendors
- tasks
- compliance_tasks
- subscriptions
- notifications
- organization_invites
- invitations
- ai_systems
- ai_incidents

## Manual Validation Checklist

1. Apply all Supabase migrations to the target project.
2. Configure the environment variables for the target Supabase project.
3. Run the metadata/static RLS gate:

```txt
npm run security:rls
```

4. Confirm the gate does not run in advisory mode for Release Candidate.
5. Run the strict live tenant isolation proof:

```txt
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register
```

6. Confirm `docs/security/evidence/runtime/supabase-live-rls-validation.json` has `status: Complete`, `outcome: passed`, and per-table operation flags for cross-tenant read/insert/update/delete denial plus same-tenant reads.
7. Confirm `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks only the Supabase live RLS row as `Complete` after the successful script run.
8. Run the full Security CI workflow.
9. Save CI logs or GitHub Actions run URL as release evidence.

## Release Rule

Do not mark EuroComply as enterprise-ready until live RLS validation has run against the production-like Supabase project.

Release candidate requires:

```txt
SUPABASE_ACCESS_TOKEN configured
npm run security:rls completed against target project
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register completed against target project
Security CI completed successfully
RLS validation evidence attached to release notes
```

## Failure Handling

If live validation fails:

- block release
- identify the affected table or policy
- add or update the Supabase migration
- re-run the RLS metadata gate
- re-run the live tenant isolation proof
- re-run full Security CI
- document the remediation in release notes

## Enterprise Evidence

Attach these artifacts to enterprise/security review packages:

- GitHub Actions Security CI run URL
- RLS gate logs
- `docs/security/evidence/runtime/supabase-live-rls-validation.json`
- Supabase project/environment identifier
- migration commit hash
- list of tenant-scoped tables validated
- known exceptions, if any
