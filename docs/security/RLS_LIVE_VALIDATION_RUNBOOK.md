# EuroComply Live RLS Validation Runbook

This runbook defines how EuroComply validates Supabase Row Level Security before release candidate and enterprise production readiness.

## Purpose

Row Level Security is a core tenant-isolation control. Static SQL review is useful, but enterprise readiness requires validating RLS against a real Supabase project using a controlled service credential and representative tenant data.

## Current Modes

### Advisory Mode

The RLS gate runs in advisory mode when:

```txt
SUPABASE_ACCESS_TOKEN is not configured
```

In advisory mode, CI can still validate static migration and policy evidence, but it cannot prove live Supabase state.

This mode is acceptable for local development and early preview environments only.

### Live Validation Mode

The RLS gate should run in live validation mode when:

```txt
SUPABASE_ACCESS_TOKEN is configured
NEXT_PUBLIC_SUPABASE_URL points to the target Supabase project
SUPABASE_SERVICE_ROLE_KEY is configured for the same target project
```

This mode is required before Release Candidate and enterprise production approval.

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
- Service-role-only operations are restricted to server-side code paths.
- Audit events preserve organization context.
- GDPR delete/export flows remain organization scoped.
- Evidence/export endpoints do not bypass tenant isolation.

## Recommended Test Tenants

Create at least two test organizations:

```txt
org_a
org_b
```

Create at least one user/member for each organization and representative records for:

- documents
- audit events
- evidence packs
- questionnaire exports
- vendor assurance exports
- retention-center records
- continuity-center records
- GDPR requests

## Manual Validation Checklist

1. Configure the environment variables for the target Supabase project.
2. Run:

```txt
npm run security:rls
```

3. Confirm the gate does not run in advisory mode.
4. Run the full security CI workflow.
5. Verify that cross-tenant reads are denied.
6. Verify that expected same-tenant reads still work.
7. Save CI logs or GitHub Actions run URL as release evidence.

## Release Rule

Do not mark EuroComply as enterprise-ready until live RLS validation has run against the production-like Supabase project.

Release candidate requires:

```txt
SUPABASE_ACCESS_TOKEN configured
npm run security:rls completed against target project
Security CI completed successfully
RLS validation evidence attached to release notes
```

## Failure Handling

If live validation fails:

- block release
- identify the affected table or policy
- add or update the Supabase migration
- re-run the RLS gate
- re-run full Security CI
- document the remediation in release notes

## Enterprise Evidence

Attach these artifacts to enterprise/security review packages:

- GitHub Actions Security CI run URL
- RLS gate logs
- Supabase project/environment identifier
- migration commit hash
- list of tenant-scoped tables validated
- known exceptions, if any
