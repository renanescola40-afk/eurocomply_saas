# Lock AI assessment writes behind backend boundaries

- Status: Proposed
- Date: 2026-07-20
- Last updated: 2026-09-06
- Priority: P1 security, tenant integrity, and AI-governance accountability

## Context

`public.ai_assessments` is a tenant-scoped governance table. The current Production schema grants authenticated users INSERT, UPDATE, and DELETE privileges and installs role-based write policies. Those controls restrict rows by organization, but a browser session can still mutate the table directly through Supabase/PostgREST.

Direct client writes bypass reviewed server-side controls that may be required for a material assessment workflow, including trusted-origin enforcement, bounded request validation, distributed throttling, lifecycle rules, durable audit behavior, and future separation-of-duties checks.

A 2026-09-06 repository revalidation found one direct browser `ai_assessments` INSERT in `src/dashboard/page.tsx`. That file is legacy source outside the active Next.js App Router route tree. The canonical `src/app/[locale]/dashboard/page.tsx` does not import it and redirects to `/{locale}/dashboard/organizations`; repository search also found no `@/dashboard` import. The legacy file therefore does not establish a supported current App Router mutation contract, but its presence is recorded explicitly rather than represented as absent. Security/runtime test scripts also exercise client DML intentionally as validation code; they are not product writers.

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

A signed-in browser can continue reading assessments permitted by RLS but can no longer create, change, or delete assessment rows directly through PostgREST. Trusted backend code using the service role remains capable of performing reviewed mutations.

The legacy `src/dashboard/page.tsx` assessment-create handler would fail if that non-routed legacy surface were reintroduced without a reviewed backend mutation path. That is intentional fail-closed behavior: reactivating legacy UI must not silently reactivate direct database authority.

## Risks and trade-offs

- Any external or undocumented client that directly mutates `ai_assessments` will fail after deployment.
- The repository still contains a non-routed legacy direct-insert handler. It is retained for now because deleting/refactoring unrelated legacy UI is outside final-acceptance scope; its existence is not permission to keep Production client DML open.
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
- the canonical App Router dashboard remains independent of the legacy `src/dashboard/page.tsx` writer;
- repository-required checks are green on the exact head.

No Production migration execution, runtime acceptance, audit, certification, or penetration-test result is claimed until its corresponding protected evidence gate succeeds.

## Rollback

Before deployment, revert the migration/test changes and this decision update together if the authority decision is rejected.

After deployment, use a reviewed forward migration rather than rewriting migration history. Restoring authenticated DML or role-based write authority deliberately reopens the direct-write bypass and requires documented security acceptance plus verification that every client mutation path enforces equivalent backend controls. If the legacy dashboard is ever reactivated, route assessment mutation through a reviewed backend authority before restoring user-visible create behavior.
