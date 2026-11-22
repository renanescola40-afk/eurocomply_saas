# FUN-QA — Signed-session inventory assertion: review-only, non-callable milestone

**Frozen starting baseline:** protected `main@1ded3c6127a575a314849de86651685b4bf89204`. **Target after separate authorization:** Supabase isolated QA `zrxrrfbllsxtleyxjpsz`. **Production:** NO_GO. Neither script has been executed in QA or Production.

## P1 security findings addressed in this revision

The original proposal granted `authenticated` EXECUTE on two public `SECURITY DEFINER` bridges to `create_ai_system_atomic` and `reassess_ai_system_atomic`. A valid signed AAL2 user could supply contradictory `risk_level`, `classification_summary`, `obligations`, or `next_actions` instead of using `classifyParsedAiSystemBody` in the trusted server, and then persist rows without the separate mandatory `createAuditEvent` chained audit append or its fail-closed compensation. Both are **P1 security/data-integrity defects**. These cannot be solved by adding JWT, tenant membership, or subscription checks alone.

**Remediation:** this PR now proposes **only** `app_private.qa_require_ai_inventory_actor(uuid)`, an unexposed session and authorization assertion. The installer creates **no public write RPC** and makes **no grant to `authenticated` or `anon`**; the private helper has default PUBLIC EXECUTE revoked before COMMIT. Existing restricted atomic RPC ACLs remain unchanged. It also aborts rather than silently overwriting any pre-existing helper/public bridge. The rollback aborts if any exposed bridge exists and removes only the narrowly proposed helper.

This is intentionally a **non-functional staged security building block**: it does **not** allow QA inventory saves and must not be advertised as an installed capability or ready-to-run migration. A SECURITY DEFINER private function still requires independent owner/privilege review before installation, with source code not being proof of privilege safety.

## Why classification and audit need a separate design

- The existing trusted Next.js handlers in `src/app/api/ai-systems/route.ts` and `src/app/api/ai-systems/[id]/route.ts` calculate classification through `classifyParsedAiSystemBody`, validate the AI system payload, and enforce authorization.
- They write the required `ai_system_created` / `ai_system_reassessed` chained audit through `createAuditEvent`; on audit failure they attempt compensation. A direct public DB RPC without equivalent transactional classification and signed-audit enforcement would bypass both controls.
- A future functional design must ensure a **single atomic trusted write + derived risk decision + required audit event**, with rollback on audit failure and strict signed-session/tenant checks. Consider an unexposed trusted service boundary that can run the same TypeScript decision engine, or a rigorously reviewed SQL equivalent and transactional audit chain. It must not depend on a caller-provided risk classification or a best-effort audit call.
- The existing application path still uses `createAdminClient()`; the QA Netlify preview intentionally has no service-role secret. No Next.js path changes or provider/Auth settings are included here.

## Security evidence needed before any QA rollout

Independent Security + Database review of the private helper ownership, `auth.sessions` SELECT authority, session/JWT trust model, AAL1 vs verified AAL2, revoked/expired session, anonymous caller, suspended member, different organization, writer roles, commercial authority, tenant policy, and permission grants. Then an independently authorized **QA-only** execution plan, with PostgreSQL compilation, exact project attestation, transaction rollback, and negative provider-signed session tests. A positive paid-plan path requires a legitimate provider-backed contract or explicitly authorized isolated signed-contract QA fixture; never fabricate a Stripe LIVE subscription.

## Verification boundary and decision

`npx vitest run tests/security/qa-fun-inventory-signed-session-rpc-contract.test.ts` exercises *static* source contracts and verifies no write grants, not a functional SQL install. Signed-session runtime, classification parity, chain audit persistence, concurrent writes, quota, RLS, rollback and customer readiness are **NOT VERIFIED**. Existing table policies and Stripe LIVE remain untouched, no emails or new costs.

**Decision:** `P1_WRITE_EXPOSURE_PREVENTED_IN_SOURCE` · `QA_INVENTORY_WRITES_BLOCKED` · `FUN_QA_NOT_RUNTIME_VERIFIED` · Production `NO_GO`. Any future reintroduction of exposed wrappers requires fresh independent review of classification and transactional audit *before* EXECUTE grants.
