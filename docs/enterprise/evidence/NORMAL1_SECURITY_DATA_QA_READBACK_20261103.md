# RISCK COMPLY — Normal 1 security/data provider readback

**Observation date:** 2026-11-03  
**Domain:** SEC-01/02/03/04/05/06, DAT-02/03/04/05, OPS-03/04  
**Scope:** GitHub candidate #2598; source specialist #2599; connected isolated QA Supabase and production read-only SQL.  
**Status:** `EVIDENCE_OBSERVED / NO FORMAL A-GATE ACCEPTANCE`.

## Sources and version boundary

- Consolidated GitHub source candidate SHA **`ed261ed4b78adf536b0b11c9b09187d753707eb3`** was directly tested after the delegated-MFA metadata-audit correction and its regression source contracts were integrated.
- Historical applied MFA migration `20261015235500_enterprise_private_membership_mfa_gate.sql` is preserved untouched.
- Forward-only, **unapplied** migration `20261103080000_enterprise_clerk_text_subject_mfa_reconciliation.sql` delegates Enterprise private read and manage authorization to established Clerk/UUID-safe membership/role functions.
- Contract tests `tests/security/enterprise-private-membership-mfa-contract.test.mjs` and QA transactional scripts in `tests/security/enterprise-{clerk,uuid}-qa-transactional-rehearsal.sql` are versioned.
- The candidate remains **draft and unmerged** at the time of writing. A newer candidate SHA requires fresh exact-head test evidence; provider SQL compilation is not CI success or a production release.

## Executed isolated QA verification

The migration source body was replayed in one **single SQL transaction with explicit `ROLLBACK`** (2 second lock timeout; 45 second statement timeout), followed by the exact candidate's:

1. Clerk transactional SQL script, **32/32 behavioral checks**. Five synthetic QA users across two organizations, `aal1/aal2`, own-tenant/cross-tenant, unknown/missing subjects and tenants, and JWT role/app-metadata privilege spoof attempts.
2. UUID transactional SQL script, **16/16 behavioral checks**. One preexisting QA Auth UUID temporarily linked to a synthetic QA owner membership; MFA, own/cross-tenant, unknown UUID and subsequent suspended-user denial.
3. Updated `scripts/security/audit-enterprise-member-mfa-runtime.sql`, **`PASS_METADATA_ONLY`** (2/2 private helpers protected and 4/4 expected tables using them).

The SQL tests each abort on an incorrect result; no assertion failure occurred. Independent read-only SQL snapshots **before and after rollback matched exactly**:

```text
QA connected UUID memberships: 0 => 0
QA suspended fixture memberships: 0 => 0
enterprise_member_can_read(uuid)  md5: d22463f096060aa22683ee61a74e5875
enterprise_member_can_manage(uuid) md5: 4dcb3d1b3cd395ae9241bb6441336d9a
```

Additional fail-closed metadata-audit negative tests were performed **in reversible transactions** by temporarily substituting (a) the canonical private membership helper and (b) the Enterprise wrapper with an unconditional allow function. In both cases the audited helper count fell to 1/2 and result became `NO_GO_RUNTIME_MFA`. No unsafe function persisted.

Before the metadata-audit correction, the old read-only audit reported `PASS_METADATA_ONLY` against historical wrappers but a **false** `NO_GO_RUNTIME_MFA` after the canonical forward migration (0/2 helpers). The updated scanner passes both safe implementations while denying the two tested guard removals.

The **11 actual source test callbacks** from the GitHub enterprise MFA contract test were executed by an isolated V8 compatibility harness with a minimal `assert`/file-read shim and **11/11 assertions passed**. **This is NOT an official `node --test` run.** `npm run security:enterprise-membership-mfa-contract`, native PostgreSQL 17 multi-session test suite and official CI remain NOT_EXECUTED/NOT_PASS at the current exact candidate SHA.

## Independent read-only provider parity

- **PROD + QA:** 115/115 public tables have RLS and FORCE RLS, 33 public tables have no explicit policy and no direct anon/authenticated SELECT/INSERT/UPDATE/DELETE grants.
- **Table ACL:** 1,380 comparisons per environment; matching MD5 `963121ba8e27bdf7bb690f5c98501403`.
- **Function ACL:** 501 comparisons per environment; matching MD5 `0d07bda4689b4dcf141304328c6fbcc3`. Among examined public/private `SECURITY DEFINER` functions, `anon` execute count is zero.
- **Storage:** 8/8 tables have RLS; 0/8 FORCE RLS; 8 policies. Metadata fingerprint matches `8df210b4d8546b32e6febd922aa99787` across PROD and QA. Storage behavior, authenticated read/write boundary and definer behavior remain separate acceptance checks.
- **Usage counters:** production aggregate inspected 266 orgs and QA 2 orgs; recomputed `active_members/full_users/participants/viewers/active_admins` vs usage rows, **zero current drift** for every metric. This does not prove concurrent writes are atomic or that the historical incident is fully remediated.

No sensitive subjects, organization UUIDs, raw JWTs, application secrets, customer rows or credentials are included here.

## Mandatory acceptance blockers

| Gate | Required children | Readback scope | Why NOT_VERIFIED |
|---|---|---|---|
| A-01 | SEC-01 | Membership/MFA SQL helpers | Signed session creation, expiration, revocation, logout and recovery API/browser negative E2E missing |
| A-02 | SEC-02 / SEC-04 | SQL role matrix / ACL readback | Full server API authorization matrix, privileged operation negative tests and qualified review missing |
| A-03 | SEC-03 / SEC-06 | Own/cross-tenant SQL, audit hardening source | Signed tenant A/B API/export/download/Storage and durable critical audit replay missing |
| A-04 | SEC-05 | RLS/ACL structure only | Actual client-bundle/log secret scan and deployed encryption/transport checks missing |
| A-13 | DAT-02 / DAT-03 | Current zero counter drift | Native PostgreSQL concurrent-session/rollback/partial failure, signed audit-chain and DAT-01 ledger closure missing |
| A-14 | DAT-04 / DAT-05 | DB+Storage catalog parity | Governed isolated restore (DB/Auth/Storage/app), RTO/RPO, canonical DAT-01 migration ledger and exact release matching missing |
| A-20 | OPS-03 / OPS-04 | Vercel deployment metadata only | Exact deployment smoke, authenticated workflow, alert/support drill and incident proof missing |

**Acceptance required:** 7/7 gates all child controls PASS, exact-SHA reproducible artifacts and independent qualified review accepted by the canonical validator. No source-only success, provider catalog readback, unreviewed PR or simulated JWT claims may mark a gate accepted.

The connected Vercel production deployment most recently identified is `dpl_CmyiHWky6g41su26PE1nyGwwCS1f` at GitHub SHA `70d3545f414d063379d481fd238aed563e05edda`, not the new candidate. Production was not modified. GitHub Actions have repeated failed run states with no job-step details reported, while CircleCI #416 failure root cause remains unclassified pending actual provider job logs. Do not bypass these checks or trigger additional paid CI.

**Final recorded acceptance from the unified candidate evidence matrix during this observation:** 0/24 formal gates `accepted=true`, two atomic `PASS` (`BIL-01`, `OPS-01`), two A gates eligible for independent review (`A-09`, `A-18`), `A-12` blocked by DAT-01. This is distinct from historical reported gate scores.

## Safe reproduction / next action

1. On existing authorized Node 22 CI with zero new cost: `npm run security:enterprise-membership-mfa-contract` and the existing native isolated PostgreSQL 17 test script `node scripts/security/verify-p0-postgres-isolated.mjs`.
2. On a dedicated isolated QA environment after qualified review, replay exact forward migration through canonical governed migration pipeline, then execute signed-JWT A/B/MFA/API/Storage browser tests and compare rollback/ACL state.
3. Independently review exact candidate SHA + artifacts, resolve branch protection, update Evidence Factory via qualified gate reviewer, and only then promote.

**Safety:** no production write, no Stripe LIVE, no emails, no new costs, no unauthorized main merge, no bypass and no invented control/gate acceptance.
