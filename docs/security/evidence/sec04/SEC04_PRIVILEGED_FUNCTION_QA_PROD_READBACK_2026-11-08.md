# A-02 / SEC-04 — Privileged function grants: QA and production readback

**Evidence class:** Real Supabase provider PostgreSQL catalog SELECT queries.
**Date:** 2026-11-08 (UTC).
**Status:** PARTIAL_EVIDENCE / NOT_VERIFIED; no formal review or invocation denial test.
**No customer-data, auth tokens or SQL function bodies extracted.**
**No mutations executed, including in production.**
**Applicable existing source script:** `scripts/security/audit-privileged-function-acls.sql`
(source GitHub main `313eb1e258b3a790ea2f8bd4b103079cb38dc5ce`).

## Exact environment provenance

| Environment | Supabase project ref | PostgreSQL |
| --- | --- | --- |
| Isolated QA | `zrxrrfbllsxtleyxjpsz` | 17 |
| Production | `tganhbbhfxcpblmgqprg` | 17 |

The provider returned **identical effective aggregate grants** in both projects:

| Observation for `public` + `app_private` | QA | PROD |
| --- | ---: | ---: |
| `SECURITY DEFINER` functions | 141 | 141 |
| Effective `EXECUTE` for `anon` | 0 | 0 |
| Effective `EXECUTE` for `PUBLIC` pseudo-role | 0 | 0 |
| Effective `EXECUTE` for `authenticated` | 7 | 7 |
| `authenticated` + schema `public` | 0 | 0 |
| `authenticated` + schema `app_private` | 7 | 7 |
| `SECURITY DEFINER` functions missing explicit search_path | 0 | 0 |
| `public` schema `SECURITY DEFINER` functions with `search_path` including `public` | 53 | 53 |

A further production-only grants check returned:
`has_schema_privilege('authenticated','public','CREATE')=false`,
`has_schema_privilege('anon','public','CREATE')=false`,
`has_schema_privilege('authenticated','app_private','USAGE')=true`,
`has_schema_privilege('anon','app_private','USAGE')=false`.

Seven authenticated-executable internal functions in QA were:
`app_private.enterprise_member_can_manage`,
`app_private.enterprise_member_can_read`,
`app_private.has_commercial_authority`,
`app_private.has_minimum_commercial_plan`,
`app_private.has_org_role`,
`app_private.has_org_write_role`,
`app_private.is_org_member`.

## Seven authenticated-executable helpers — body review (QA)

On 2026-11-08, retrieved the actual definitions with a **read-only**
`pg_get_functiondef` query scoped to exactly the seven
`app_private` SECURITY DEFINER functions executable by `authenticated`.

| Function | Observed authorization behavior |
| --- | --- |
| `enterprise_member_can_manage(uuid)` | Delegates to `has_org_role` for owner/admin/editor/compliance_manager |
| `enterprise_member_can_read(uuid)` | Delegates to `is_org_member` |
| `has_commercial_authority(uuid)` | For authenticated sessions requires `is_org_member` and a resolved plan |
| `has_minimum_commercial_plan(uuid,text)` | For authenticated sessions requires `is_org_member`; compares allowed plan rank |
| `has_org_role(uuid,text[])` | Checks tenant MFA, active association, allowed role and current user identity |
| `has_org_write_role(uuid)` | Delegates to `has_org_role` for owner/admin/editor |
| `is_org_member(uuid)` | Checks tenant MFA, active association and current user identity; does **not** check canonical role whitelist |

**Specific mismatch:** `is_org_member` authorizes *any* active stored role
matching user/tenant identity, including an unexpected role string. It is
appropriate for some ordinary reads but **insufficient for `read_audit`**,
which canonical RBAC restricts to owner/admin. The separate SEC-02 SQL
barrier proposal therefore uses `has_org_role(..., ARRAY['owner','admin'])`.
The application-side SEC-02 patch also rejects unrecognized role strings.

This review is **source/body inspection**, not a runtime unauthorized
invocation test. It does not establish that an authenticated user can call
these functions directly via the exposed PostgREST schemas.

## Interpretation and follow-up

The absence of effective anonymous/PUBLIC `EXECUTE` grants in the inspected
schemas is positive **metadata evidence only**; it does not prove the safety
of individual SECURITY DEFINER function bodies, Storage permissions,
service-role writers, files, webhooks, or signed runtime invocation denials.

The 53 pinned but public-containing `search_path` settings require qualified
review to confirm schema qualification and whether any writable schema can
be injected into calls; the current lack of `CREATE` privileges for
`anon` and `authenticated` on `public` mitigates one attack route, but
does not establish universal safety.

## Formal SEC-04 closure gaps

- Qualified independent readback/review of function owners, ACLs and behavior.
- Genuine authenticated unauthorized invocation tests with exact QA SHA.
- Storage, elevated writer and webhook checks.
- Verified release provenance and applicable production read-only evidence.
- SEC-02 prerequisite ACCEPTED and official acceptance validator result.

**Decision: SEC-04 NOT_VERIFIED. No formal PASS.**
