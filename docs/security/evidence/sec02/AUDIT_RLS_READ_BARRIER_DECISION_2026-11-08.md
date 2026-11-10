# SEC-02 — Audit RLS Role Barrier Decision Package

**Status: REVIEW_REQUIRED / NOT VERIFIED.** QA metadata observation, not an authenticated exploit demonstration or release approval.

- Project: isolated Supabase QA `zrxrrfbllsxtleyxjpsz` (PostgreSQL 17, owner-approved).
- Source context: PR #2653. Store SHA of the reviewed patch and QA deployment before formal execution.
- Observed: 2026-11-08, via read-only SQL introspection with the connected Supabase provider.
- No schema changes were made, and no customer data or credentials were read.

## Source vs provider observed

The canonical authorization model (`src/lib/security/permissions.ts` and `docs/security/RBAC_MATRIX.md`)
grants `read_audit` **only** to `owner` and `admin`. The protected
`GET /api/audit/chain/verify` explicitly checks `read_audit`.

In isolated QA both `public.audit_logs` and `public.audit_events` have:

- `relrowsecurity=true` and `relforcerowsecurity=true`;
- effective `SELECT` grant for the PostgreSQL `authenticated` role, not `anon`;
- permissive SELECT policy `rls_audit_*_select_member` with
  `USING (app_private.is_org_member(organization_id))`;
- restrictive ALL policy `payment_first_commercial_authority` with
  `USING (app_private.has_commercial_authority(organization_id))`.

The QA definition of `app_private.is_org_member` verifies tenant MFA,
active association and matching user identity **but does not require**
`owner` or `admin`. The commercial-authority function resolves a valid
commercial plan and checks association; it does not establish `read_audit`
role permission.

**Reasoned risk:** a licensed tenant with MFA satisfied may expose audit rows
to a properly authenticated but lower-privilege same-tenant member through the
Supabase Data API if the table is exposed. The provider readback establishes
the policy/grant mismatch; it does not by itself prove a live authenticated
request succeeded. Do not label an exploit or PASS without genuine negative tests.

## Proposed narrowly scoped SQL correction — REVIEW ONLY, NOT EXECUTED

On a **reviewed, version-controlled migration** after canonical DAT-01
migration sequencing is approved, add restrictive SELECT barriers on both
audit tables. An additional restrictive policy is intentional: removing the
permissive SELECT alone would not necessarily prevent existing permissive
policies from opening the row to a role. RLS computes the permitted rows from
permissive policies and applies all restrictive policy predicates.

```sql
-- Candidate SQL only. Do not run on production.
-- Migration/reviewer must check policy names, function permissions,
-- installed schema, active tenant MFA rules and older readers first.
CREATE POLICY sec02_audit_logs_privileged_select
ON public.audit_logs AS RESTRICTIVE
FOR SELECT TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['owner','admin']));

CREATE POLICY sec02_audit_events_privileged_select
ON public.audit_events AS RESTRICTIVE
FOR SELECT TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['owner','admin']));
```

Never apply the proposal as an untracked manual mutation on a shared QA
database or to production. Do not issue this migration until checked for
naming collisions, intended legacy roles, existing application reads,
DAT-01 sequence, reversible test plan and independent review.
Do not weaken existing commercial/MFA/tenant conditions.

## Mandatory acceptance scenarios

1. Owner/admin with legitimate fresh QA session and appropriate subscription
   can read only their tenant's audit records (if the read is an approved
   product feature).
2. Member/editor/viewer of that same tenant with legitimate sessions cannot
   read these audit tables through the Data API or unprotected paths
   (zero rows/403/42501, with no audit payload), while ordinary authorized
   product reads still work.
3. Unauthenticated users cannot read; members of tenant B cannot read tenant A.
4. Existing approved service-role internal writer / audit-chain operations
   retain their intended behavior, while privileged API routes still enforce
   step-up and full `read_audit` guards.
5. Persisted SQL readback proves both restrictive policies and existing
   expected permissive/restrictive composition. Preserve exact SHA, QA
   environment, provider run ID, timestamp and reviewer.
6. Use disposable synthetic records and signed auth sessions; revoke sessions
   and confirm cleanup. Never substitute SQL GUC identity spoofing for real
   authenticated provider evidence.

## Gate consequence

Until the Data API/role boundary is tested and the mismatch is corrected
or conclusively disproven, **SEC-02 stays NOT_VERIFIED**.
This is separate from SEC-04 privileged-function acceptance.
