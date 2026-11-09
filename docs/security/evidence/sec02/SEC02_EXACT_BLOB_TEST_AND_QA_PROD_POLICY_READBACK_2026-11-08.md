# SEC-02 — Exact-blob local regression and QA/production RLS preflight

**Date:** 2026-11-08 UTC.
**Status:** PARTIAL_VERIFIED_SOURCE / PROVIDER_METADATA_ONLY.
**Formal SEC-02:** NOT_VERIFIED; **formal A-02:** 0/2 atomic PASS.
**No production mutations, QA policy mutations, email delivery, live Stripe or paid runners.**

## Exact-source TypeScript / Node execution (local isolated runner)

Repository: `renanescola40-afk/eurocomply_saas`, PR #2653.
File: `src/lib/security/permissions.ts`.
GitHub blob SHA, obtained through authenticated GitHub connector:
`44d415f4b77e1ba3d8378d153a0066b1dd801173`.

An exact text copy was placed in the local isolated runner and independently
verified using `git hash-object`, yielding
`44d415f4b77e1ba3d8378d153a0066b1dd801173` (**match**).
The following commands were executed, with their actual results:

- `tsc --strict --noEmit --skipLibCheck --target ES2022 permissions.ts`: **exit 0**.
- `tsc --strict --target ES2022 --module commonjs --skipLibCheck --outDir dist permissions.ts`: **exit 0**.
- Node.js assert-based regression checks against the emitted module:
  **298/298 assertions, 0 failures**. Scenarios include role matrix,
  owner/admin elevated operations, member/viewer/editor administrative denies,
  unknown/null/invalid roles, documented aliases and canonical 16-permission
  correspondence.

These are genuine TypeScript and Node checks for **one exact file**, not
`vitest`, app-wide `tsc`, Next build, CI or authenticated QA API tests.
The earlier source-only V8 logic checks cannot be used as official runtime
provider evidence.

## Repeatable QA and production metadata readback

SQL source: `docs/security/evidence/sec02/SEC02_AUDIT_RLS_READBACK.sql`
(executed through authorized Supabase connector without modification).

| Observation | QA `zrxrrfbllsxtleyxjpsz` | PROD `tganhbbhfxcpblmgqprg` |
| --- | --- | --- |
| `audit_events` RLS + FORCE RLS | true | true |
| `audit_events` authenticated SELECT grant | true | true |
| `audit_events` restrictive owner/admin SELECT policy | false | false |
| `audit_events` structural result | NEEDS_HARDENING | NEEDS_HARDENING |
| `audit_logs` RLS + FORCE RLS | true | true |
| `audit_logs` authenticated SELECT grant | true | true |
| `audit_logs` restrictive owner/admin SELECT policy | false | false |
| `audit_logs` structural result | NEEDS_HARDENING | NEEDS_HARDENING |

Both exposed-schema tables have authenticated `SELECT` grants and
a permissive member-level read policy. This is a *potential direct Data API
authorization exposure* relative to canonical `read_audit` grants for
owner/admin only. It is not a proven authenticated exfiltration: true
Data API accessibility, valid user session, commercial entitlement and
actual returned records remain untested.

Reviewed SQL remediation candidate:
`docs/security/evidence/sec02/SEC02_AUDIT_RLS_SELECT_BARRIER_CANDIDATE.sql`.
The SQL candidate was source-checked to contain exactly two restrictive
SELECT policies for authenticated, using the existing
`app_private.has_org_role(organization_id,ARRAY['owner','admin'])` guard.
Provider readback confirms both target `organization_id` columns are UUID and
the checker function exists. **The SQL correction was NOT executed or deployed.**

## Release consequences

1. Reconcile DAT-01 canonical migration provenance before assigning a new
   executable production migration identity; apply the reviewed policy in
   isolated QA through governed migrations.
2. Obtain signed QA sessions and actually prove owner/admin allows and
   member/editor/viewer/outsider denies via real Data API calls; preserve
   real provider identifiers and cleanup evidence.
3. Run the full code tests on the exact final PR and deployed SHA using
   a genuinely available runner without incurring new costs.
4. Have an independent qualified reviewer inspect the security boundary,
   RLS interactions, QA rollback and SEC-01 dependency.
5. Use official validator; never label SEC-02 PASS solely from metadata
   or isolated TypeScript checks.

**Owner attention: potential authorization issue also present in production
metadata. No production write was authorized or performed.**
