# FUN-QA — Signed-session AI inventory RPC boundary (REVIEW-ONLY)

**Source base:** protected `main@343e5c9bd756310c10814f1aefbea9556d88e7ef`  
**Target only after independent approval:** Supabase isolated QA `zrxrrfbllsxtleyxjpsz`  
**Production:** NO_GO; no Production or QA SQL executed by this PR.

## Problem addressed

The current QA Netlify deployment intentionally rejects `SUPABASE_SERVICE_ROLE_KEY`, yet `src/server/queries/ai-systems.ts` invokes `createAdminClient()` for inventory access. The two existing atomic RPCs accept caller-supplied actor and organization IDs and execute as `postgres`; direct `authenticated` EXECUTE is intentionally absent. Granting either broad RPC directly would permit caller-spoofed actor/tenant assertions.

The existing QA database does have `organization_members.user_id`, `status`, `role`, `auth.sessions`, a **RESTRICTIVE** commercial-authority policy on `ai_systems`, and `app_private.has_org_role` / `app_private.resolve_commercial_plan`. These are compatible with an explicit signed-session assertion.

## Proposed narrow capability

`scripts/qa/qa-fun-inventory-signed-session-rpcs-install.sql` proposes three new functions, none executed automatically:

1. `app_private.qa_require_ai_inventory_actor(organization_id)` privately derives the actor from verified `auth.uid()` and requires `auth.jwt()` role authenticated, AAL2, a corresponding existing and unexpired `auth.sessions` record with verified MFA factor, active own-organization writer membership, existing tenant-MFA/role policy, and authentic licensed commercial plan. It rejects every missing or contradictory condition.
2. `public.qa_create_ai_system_for_session(organization_id, system)` calls the existing atomic create with **server-derived** actor after the private assertion.
3. `public.qa_reassess_ai_system_for_session(system_id, organization_id, updated_at, patch)` similarly calls the existing atomic reassess with actor derived from the signed session.

Only the two new public wrappers propose `EXECUTE` for the `authenticated` database role. They do **not** grant the old spoofable RPCs, add table DML grants, disable RLS or authorize TEST-mode Stripe data as a paid subscription. Both public wrappers are `SECURITY DEFINER`; this is an explicit **security-review risk** because these are exposed authenticated RPCs. Reviewer must assess the narrowly scoped assertions and, if necessary, reject the design for a Supabase Edge Function or other non-exposed alternative before any installation.

## Mandatory preconditions and exclusions

- Independent Database and Security approval, exact QA project attestation, schema/migration provenance, and acceptance of the public-wrapper residual risk.
- Postgres EXPLAIN / `pgTAP` positive and negative tests against disposable QA identities: anonymous, AAL1, invalid session ID, revoked/expired session, member, suspended member, org A→B, mismatched actor, missing commercial authority, quota, concurrency/replay and reassessment `updated_at` conflict. Synthetic fixtures must be isolated and cleaned up.
- Only after the database is approved and installed: implement **session-bound** application reads, organization selection, audit and create/reassess calls. Do not swap `createAdminClient()` to an unqualified user client without validating all dependent tenant/MFA/role/audit checks. This source PR alone does **not** fix the Next.js request path.
- QA currently has zero `subscriptions` rows and zero `ai_systems` rows. A TEST Stripe subscription cannot be treated as LIVE commercial authority. A positive inventory test would require an independently authorized disposable QA signed-contract fixture or legitimate provider-backed licensing proof, never fabricated LIVE payment authority.
- The Netlify PR #2770 is a working **no-billing** Git Preview and has not verified logged-in AAL2, distributed rate limiter or inventory persistence; do not use it for payment acceptance.
- No secret keys, outgoing emails, Stripe LIVE changes, Production deploys or new costs.

## Verification and rollback

Source contract tests: `npx vitest run tests/security/qa-fun-inventory-signed-session-rpc-contract.test.ts`. These are **static contract tests**, not SQL execution or Supabase Auth acceptance. Full exact-HEAD GitHub CI and qualified independent review are required.

Once an authorized QA installer is applied, verify ACLs and that existing RPC `authenticated_execute=false` remains unchanged. Independently run the complete signed-session runtime negative matrix. If anything fails, execute the **QA-only** `scripts/qa/qa-fun-inventory-signed-session-rpcs-rollback.sql` after its own approval; it drops only the newly introduced wrappers/helper.

**Current release conclusion:** `FUN_QA_CANDIDATE_FOR_REVIEW`, not `PERMISSION_DEPLOYED`, not `AI_INVENTORY_RUNTIME_PASS`, not customer GO.
