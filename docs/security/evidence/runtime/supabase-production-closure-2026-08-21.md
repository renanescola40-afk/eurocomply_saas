# Supabase Production Closure — 2026-08-21

**Status:** `HUMAN_BLOCKER`  
**Evidence capture window:** `2026-08-21T18:05:32Z`–`2026-08-21T18:15:05Z`  
**Repository:** `renanescola40-afk/eurocomply_saas`  
**Runtime evidence subject SHA:** `7c063edbd73e719024666b7740623455aae20f0d`  
**Production deployment:** `dpl_rbbHqrqcXWfAchSZs46ZeLoYZETw`  
**Canonical production URL:** `https://www.risckcomply.com`  
**Supabase project ref:** `tganhbbhfxcpblmgqprg`  
**Supabase region:** `eu-west-1`  
**Production migration ledger head:** `20260813124224`

This document records direct production observations. It does not treat repository configuration, a build, a mock, or a documentation commit as production proof. Secrets, bearer tokens, cookies, API-key values and customer row identifiers are intentionally omitted.

## 1. Project identity

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| Repository/runtime Supabase authority | `tganhbbhfxcpblmgqprg` | Production CSP emitted `https://tganhbbhfxcpblmgqprg.supabase.co`; connected Supabase project has the same ref | `PASS` |
| Production deployment release | current main subject | Production HTML emitted `sentry-release=7c063edbd73e719024666b7740623455aae20f0d` | `PASS` |
| Supabase project health | active production project | `ACTIVE_HEALTHY`, region `eu-west-1` | `PASS` |
| Public Supabase client key authority | key belongs to production project | Active legacy anon and modern publishable keys were returned by the project control plane; exact values omitted | `PASS` |
| Service-role browser exposure | none | Client/browser modules use only public keys; service-role clients are guarded by `server-only` | `PASS` |

Production request evidence:

- `GET /api/health` returned HTTP `200` with `status=ok` and request ID `req_9f936e5c-f7c2-4d7a-bbe7-cbac2f30b7b3`; the response CSP bound the app to the expected Supabase project ref.
- Anonymous `GET /pt/dashboard` resolved to the login surface, not private dashboard data. The response carried the exact runtime subject SHA above and the expected Supabase project ref in CSP.
- `GET /api/ready` without an authorized health bearer returned HTTP `401` and a correlated request ID, proving the readiness surface fails closed for anonymous callers.

## 2. Migration / schema reconciliation

`LOCAL_SCHEMA == PRODUCTION_SCHEMA` is **false** at this evidence point.

The repository's bounded forward reconciliation manifest contains migrations after the production ledger head. Direct read-only production postcondition checks found the following required runtime objects absent:

- `public.intelligence_items`;
- `public.intelligence_calendar_suggestions`;
- `public.email_notification_events`;
- `public.vendor_review_history`;
- `public.step_up_challenges`;
- `public.enterprise_break_glass_requests`;
- enterprise evidence-vault runtime objects.

Additional observed postconditions:

- `subscriptions`: `FORCE RLS = true`;
- `documents`: `FORCE RLS = true`;
- `tasks`: `FORCE RLS = false` at the production ledger head, while the selected forward set contains the hardening step that makes this boundary canonical.

The repository explicitly sets `productionWriteAuthorizedByConfig=false` and routes this change through rehearsal, filtered dry-run, exact human migration decision evidence and protected Production promotion. Direct `apply_migration`, unrestricted `db push`, migration repair, manual ledger insertion or partial application would bypass the repository's production safety contract and were therefore not performed.

### HUMAN BLOCKER — bounded migration promotion

**System:** GitHub Actions protected Supabase migration control plane / Supabase production  
**Reason:** The current production schema is behind the repository's reviewed bounded forward set, and the repository requires exact-SHA human decision/protected-environment approval before any production write. The connected tooling available to this evidence run does not expose a workflow-dispatch action and must not bypass the gate with direct DDL.  
**Exact human action:** Freeze the current release SHA; run successful exact-SHA `Supabase Forward Reconciliation Rehearsal`, `Supabase Forward Reconciliation Dry Run`, and `Supabase Migration Reconciliation Decision Gate`; then dispatch `Supabase Forward Reconciliation Production Promotion` with `release_sha`, `rehearsal_run_id`, `dry_run_run_id`, `decision_run_id`, `decision_subject_sha`, and confirmation exactly `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id> AND DECISION <decision_run_id>`; approve the protected `Production` environment only after reviewing the exact selected-byte digest and current remote ledger.  
**Expected confirmation:** Promotion run succeeds; remote-after ledger equals remote-before plus exactly the selected set; canonical postconditions pass; no unselected migration is applied; post-promotion exact-SHA acceptance/runtime evidence is regenerated.  
**Technical work that can continue meanwhile:** RLS negative testing, Auth/OAuth evidence collection, service-role exposure review, fail-closed verification, observability review and evidence packaging.

## 3. RLS / tenant-isolation matrix

Direct production catalog inspection produced this matrix. `Authenticated grants` are listed as privilege classes only; policies remain the tenant/role authorization boundary where DML is granted.

| Table | Tenant key | RLS | FORCE RLS | SELECT policy | INSERT policy | UPDATE policy | DELETE policy | Authenticated grants summary | Cross-tenant result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `organizations` | `id` | yes | yes | yes | no | yes | no | SELECT, UPDATE | blocked |
| `organization_members` | `organization_id` | yes | yes | yes | yes | yes | yes | SELECT only | blocked; privilege escalation update rejected |
| `profiles` | `user_id` | yes | no | yes | no | yes | no | broad table grants, self-only RLS | blocked by identity policy |
| `ai_systems` | `organization_id` | yes | yes | yes | yes | yes | yes | SELECT/INSERT/UPDATE/DELETE | blocked |
| `ai_assessments` | `organization_id` | yes | yes | yes | yes | yes | yes | DML granted, tenant/role RLS | blocked |
| `documents` | `organization_id` | yes | yes | yes | yes | yes | yes | DML granted, tenant/role RLS | blocked |
| `monitoring_preferences` | `user_id` | yes | yes | yes | yes | yes | yes | SELECT/INSERT/UPDATE/DELETE | blocked by user identity |
| `audit_logs` | `organization_id` | yes | yes | yes | yes | yes | yes | SELECT only | blocked |
| `compliance_tasks` | `organization_id` | yes | yes | yes | yes | yes | yes | DML granted, tenant/role RLS | blocked |
| `risks` | `organization_id` | yes | yes | yes | yes | yes | yes | DML granted, tenant/role RLS | blocked |
| `vendors` | `organization_id` | yes | yes | yes | yes | yes | yes | DML granted, tenant/role RLS | blocked |
| `tasks` | `organization_id` | yes | **no** | yes | yes | yes | yes | DML granted, tenant/role RLS | current RLS works; canonical FORCE-RLS hardening pending bounded promotion |

### Live negative tests

The production database contains multiple organizations and memberships, allowing real negative tests without publishing tenant/user IDs.

1. An existing authenticated owner from organization A was evaluated under the PostgreSQL `authenticated` role with only the user's JWT `sub` claim injected. Organization A remained visible; organization B, B's memberships, AI systems, assessments, documents, audit logs and monitoring preferences all returned `0` visible rows.
2. The same authenticated subject attempted a no-op `UPDATE` against organization B inside a rolled-back transaction: `0` rows were updated.
3. An existing `member/viewer` attempted a no-op organization update inside a rolled-back transaction: `0` rows were updated.
4. A `member/viewer` attempt to update `organization_members.role` to `owner` was rejected at the PostgreSQL grant boundary with `permission denied for table organization_members`; no role mutation occurred.

No customer row identifiers or JWTs were retained in this evidence file.

## 4. Auth / protected-route observations

- Anonymous `/pt/dashboard` fails closed to login and does not expose private dashboard content.
- `/api/ready` fails closed with `401` when the required protected health authorization is absent.
- `/auth/callback` without an OAuth code fails closed with a `307` to login and `error=missing_oauth_code`; it does not create an authenticated session.
- Production Supabase `auth.identities` contains both email and Google identities. Google has real production identities and a successful sign-in timestamp on `2026-08-15T13:50:36.786687Z`. This is attributable historical runtime evidence, not a fresh exact-release end-to-end OAuth proof.
- Normal localized login navigation sets `NEXT_LOCALE`; the unlocalized callback probe without that browser cookie was localized by middleware to `/en/auth/callback`. This is a diagnostic edge case, not evidence of an authorization bypass. Fresh human OAuth proof must confirm the user's intended locale on the actual browser flow.

### HUMAN BLOCKER — exact-release OAuth/session lifecycle proof

**System:** RISCK COMPLY production + Google OAuth through Supabase Auth  
**Reason:** A fresh Google OAuth callback, authenticated protected-route access and logout/session-invalidation proof require an authorized non-privileged end-user identity/browser session. No user credential, OAuth consent session or reusable production test identity was available to this agent, and credentials must not be invented or extracted.  
**Exact human action:** With a designated non-privileged production test account, open `https://www.risckcomply.com/pt/login`; start Google login; complete Google consent; confirm the callback lands on the intended `/pt/...` onboarding/dashboard continuation; open a protected route; logout; revisit the same protected route and confirm it returns to login. Record UTC time and non-secret request/correlation IDs only.  
**Expected confirmation:** Google provider completes; callback exchanges the real code; authenticated session reaches the intended locale/continuation; protected route is available only while authenticated; logout invalidates the session; post-logout protected access fails closed.  
**Technical work that can continue meanwhile:** Production provider/account identity, RLS, schema drift, request correlation, server-only secret boundary and historical provider-runtime evidence are already captured here and in the companion provider evidence document.

## 5. Service-role and fail-closed review

- `src/lib/supabase/admin.ts` imports `server-only` before constructing the administrative client.
- `src/integrations/supabase/server.ts` imports `server-only` and keeps service-role resolution server-side.
- Browser clients use only the Supabase URL and public anon/publishable authority.
- The legacy unconfigured browser shim returns explicit errors for auth/data/storage operations rather than reporting protected work as successful.
- Middleware treats missing Supabase public configuration or `auth.getUser()` failure as unauthenticated.
- Callback exchange failure redirects to login and does not retain a failed session.
- Current production runtime error aggregation showed no errors for `/auth/callback`, `/api/ready` or `/pt/dashboard` in the inspected 24-hour window.

## 6. Supabase security-advisor notes

The live security advisor was inspected. Remaining warnings that do not create a demonstrated cross-tenant exposure in this evidence point are not promoted to PASS claims. In particular, leaked-password protection remains an account-level Auth hardening item and some RLS-enabled backend/control-plane tables intentionally expose no browser policy. These require separate disposition according to product/plan and table authority; they do not override the demonstrated negative tenant tests above.

## 7. Acceptance result

`SUPABASE_PRODUCTION_CLOSURE: HUMAN_BLOCKER`

PASS is prohibited because the selected forward reconciliation set has not yet been promoted to production and a fresh exact-release Google OAuth + logout/session-revocation lifecycle has not been completed.

The documentation-containing commit SHA may differ from the runtime evidence subject SHA. That difference is explicit and non-crediting: this evidence file does not claim that its own commit is deployed.
