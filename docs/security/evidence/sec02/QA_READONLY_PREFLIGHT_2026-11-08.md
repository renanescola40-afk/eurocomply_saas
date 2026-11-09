# SEC-02 — QA Read-only RBAC Preflight (NOT ACCEPTANCE)

**Observed:** 2026-11-08, Supabase QA project `zrxrrfbllsxtleyxjpsz` via authenticated Supabase management connector.
**Application baseline:** GitHub main `313eb1e258b3a790ea2f8bd4b103079cb38dc5ce`.
**Proposed fix:** PR #2653; record exact PR HEAD independently at review time.
**Scope:** PostgreSQL metadata and aggregate read-only queries only. No user impersonation,
no SQL or HTTP mutations, no signed-user API transactions, no data export and no production changes.
No provider run ID or formal independent acceptance claimed.

## Observed QA state

- Provider reports `ACTIVE_HEALTHY`; PostgreSQL 17 in eu-west-1.
- 115 public base tables, 227 public RLS policies.
- 2 organizations, 5 active membership rows, 5 Auth users.
- Active membership roles: 2 owner, 1 admin, 2 member. These counts do not
  establish that usable authenticated browser/API test sessions exist.
- `organization_members` policies for authenticated INSERT/UPDATE/DELETE
  have `false` as their write policy predicate(s), preventing direct writes
  through those policies.
- `organizations` UPDATE policy uses `app_private.has_org_role(id, ARRAY['owner'::text])`.
- `organization_members` SELECT policy uses `app_private.is_org_member(organization_id)`.

## Identified evidence gap

The QA readback of `app_private.is_org_member(uuid)` checks active association and
an identified user, but **does not explicitly restrict membership roles to the
five canonical values**. The observed check constraints on `organization_members`
constrain status, seat type/version and identity presence; none observed in that
readback validates the `role` value. The server-side fix in PR #2653 prevents
unknown app-level roles from receiving viewer read permissions; it does not
prove direct Data API/RLS enforcement for malformed roles.

Do not alter the database schema or migration history while DAT-01 replay and
governance prerequisites remain unresolved. Require review of the RLS trust
boundary and a governed SQL fix if the reviewer confirms direct-read exposure.

## Missing for SEC-02 PASS

1. Successful targeted unit/integration tests at exact committed SHA.
2. Signed authenticated API evidence for owner/admin/member and outsider;
   required negative reads/writes, inactive membership, and cross-tenant cases.
3. Every mandatory route/action mapped to a server authorization check,
   independent of visible UI controls.
4. QA application deployment provenance bound to tested SHA and provider evidence.
5. SEC-01 dependency accepted; independent qualified review and formal validator.

**Decision: SEC-02 NOT_VERIFIED. A-02 is not accepted.**
