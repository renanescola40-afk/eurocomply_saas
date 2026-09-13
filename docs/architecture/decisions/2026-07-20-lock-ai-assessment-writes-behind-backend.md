# Lock AI assessment writes behind backend boundaries

- Status: Proposed
- Date: 2026-07-20
- Last updated: 2026-09-13
- Priority: P1 security, tenant integrity, and AI-governance accountability

## Context

`public.ai_assessments` is a tenant-scoped governance table. The current Production schema grants authenticated users INSERT, UPDATE, and DELETE privileges and installs role-based write policies. Those controls restrict rows by organization, but a browser session can still mutate the table directly through Supabase/PostgREST.

Direct client writes bypass reviewed server-side controls that may be required for a material assessment workflow, including trusted-origin enforcement, bounded request validation, distributed throttling, lifecycle rules, durable audit behavior, and future separation-of-duties checks.

A 2026-09-06 repository revalidation found one direct browser `ai_assessments` INSERT in `src/dashboard/page.tsx`. That file was legacy source outside the active Next.js App Router route tree: the canonical `src/app/[locale]/dashboard/page.tsx` did not import it and redirected to `/{locale}/dashboard/organizations`, and repository search found no `@/dashboard` import.

On 2026-09-13 the non-routed `src/dashboard/page.tsx` legacy surface was removed during commercial-surface cleanup. The removal eliminates that dormant direct-insert implementation from repository source; it does not by itself prove that Production database privileges or policies have changed. Security/runtime test scripts may still exercise client DML intentionally as validation code; they are not product writers.

This is a repository and read-only Production review finding. It does not establish exploitation, customer impact, historical data quality, penetration-test results, regulatory non-compliance, or successful Production deployment of the proposed hardening.

## Decision

Use the bounded September 6 forward reconciliation package to keep authenticated tenant-scoped reads and deny direct `anon` and `authenticated` INSERT, UPDATE, and DELETE operations on `public.ai_assessments`.

The migration:

- fails closed if `public.ai_assessments` is absent;
- keeps RLS enabled and forced;
- revokes direct client DML privileges;
- adds RESTRICTIVE false policies for authenticated INSERT, UPDATE, and DELETE so an accidental future table grant cannot silently reopen browser writes while historical permissive policies remain;
- retains service-role table privileges for reviewed server-side or migration workflows;
- leaves the existing tenant-scoped SELECT contract available to authenticated users;
- does not rewrite or delete assessment rows.

## Impact

A signed-in browser can continue reading assessments permitted by RLS but can no longer create, change, or delete assessment rows directly through PostgREST after the proposed database hardening is promoted.

The legacy `src/dashboard/page.tsx` assessment-create handler no longer exists in repository source. Any future user-visible assessment-create surface must use a reviewed backend mutation path; reintroducing direct browser DML is explicitly outside this decision.

## Risks and trade-offs

- Any external or undocumented client that directly mutates `ai_assessments` will fail after deployment of the database hardening.
- Removing the dormant legacy dashboard eliminates one known repository-side direct-insert path but does not substitute for revoking direct database DML authority in Production.
- This change establishes a database boundary; it does not create a new assessment mutation API.
- Service-role writers must still implement authorization, validation, audit, tenant scope, and workflow rules correctly.
- Static migration tests and repository route inspection do not prove that Supabase has applied the migration or that live PostgREST behavior matches the proposed contract.

## Validation

Before promotion, the exact release head must verify:

- authenticated SELECT remains available under tenant-scoped RLS;
- `anon` and `authenticated` cannot INSERT, UPDATE, or DELETE `ai_assessments`;
- service-role CRUD remains available;
- RLS and FORCE RLS remain enabled;
- the restrictive mutation-deny policies exist;
- repository search confirms that the removed legacy `src/dashboard/page.tsx` writer has not been reintroduced;
- the canonical App Router dashboard remains free of direct browser `ai_assessments` mutation authority;
- repository-required checks are green on the exact head.

No Production migration execution, runtime acceptance, audit, certification, or penetration-test result is claimed until its corresponding protected evidence gate succeeds.

## Rollback

Before deployment, revert the migration/test changes and this decision update together if the authority decision is rejected.

After deployment, use a reviewed forward migration rather than rewriting migration history. Restoring authenticated DML or role-based write authority deliberately reopens the direct-write bypass and requires documented security acceptance plus verification that every client mutation path enforces equivalent backend controls. If a legacy dashboard or any new assessment-create UI is introduced, route assessment mutation through a reviewed backend authority before restoring user-visible create behavior.
