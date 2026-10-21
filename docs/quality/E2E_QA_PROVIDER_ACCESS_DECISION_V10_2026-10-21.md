# RISCK COMPLY — E2E QA provider access and owner decision V10

**Evidence date:** 2026-10-21 · **scope:** QA/procurement executor, not the primary release writer.  
**Decision:** `QA_E2E=NO_PASS`, `BILLING_E2E=NO_PASS`, `ENTERPRISE_100=NO_PASS`.  
**Safety:** no production data mutation, no additional spend, no emails, no merges, no release changes.

## 1. Confirmed connector and source facts

| Dependency | Verified state | Owner action / engineering decision |
| --- | --- | --- |
| GitHub repository | Connected GitHub API reports admin/push privileges for the repository. #2551 and #2553 are open QA-only PRs. | No further generic repository permission needed. Keep main merge and release authority with primary writer. |
| CircleCI (preferred alternate CI) | **Already integrated**: GitHub combined status for main SHA `70d3545f414d063379d481fd238aed563e05edda` confirms `ci/circleci: validar-risck` and `ci/circleci: p0-postgres-synthetic` both SUCCESS. PR #2553 now contains an extra `qa-preflight-offline` small Node 22 job, with an opt-in boolean defaulting to `false`. | **Owner:** CircleCI project → Plan Usage/Credits; confirm a Free or other zero-extra-charge balance, then manually trigger QA branch `qa/fix-e2e-node22-20261021` with boolean parameter `run_qa_preflight=true`. Record exact pipeline ID and SHA. No paid upgrades, no automatic rerun. A Circle PASS does not silently replace GitHub branch-protection required status checks; the release controller must explicitly review equivalence. |
| GitHub Actions (historical blocker) | Exact-head jobs failed before executing steps, with historical exhausted included-minute evidence. Not treated as a product-test failure. | **No longer the first path.** CircleCI is preferred for new QA work. Keep historical GitHub required contexts governed; do not waive or disable them merely because CircleCI runs. |
| Supabase QA | 7 accessible Supabase projects: production `tganhbbhfxcpblmgqprg` active, six others inactive, including historical `pqlnibgfdkqmdbeigcpd`. | **Owner decision required before repurposing old project:** confirm it is disposable/contains no protected data and that activation is free under current provider billing. Otherwise use a new isolated project only when provider confirms zero unapproved cost. Production project is excluded. |
| Vercel QA | Production project accessible. No custom QA environment, and no preview deployed from latest QA PR heads; other old previews do not establish isolation. SSO deployment protection enabled. | Configure an isolated preview with QA-specific environment variables, account-linked access and no production database/secrets. Preserve protection. Check plan/usage implications before deploying. |
| Stripe sandbox | **Read-only provider verification 21 October 2026:** Stripe TEST account has 3 subscriptions (2 `active`, 1 `past_due`) and exactly 1 TEST webhook endpoint, currently **disabled**. Its target is an older protected Vercel deployment, **not** a validated isolated QA target; its URL contains a protection-bypass query parameter (value deliberately not copied to repo, report, or chat). The endpoint lists `checkout.session.completed`, subscription changes and invoice event subscriptions. | **Blocker confirmed.** Before any E2E, configure a fresh QA-specific TEST endpoint *after* an isolated QA runtime exists, establish signed deliveries and durable entitlement updates, review/rotate the old bypass token if still valid, and keep LIVE webhook untouched. No anonymous webhook bypass, no LIVE payments, and no enabling stale endpoints. |
| QA secrets and mail sink | Workflow references `E2E_QA_*` environment/repository secrets and a confirmed mail sink, but this review cannot validate all secret bindings. | Provision secrets through GitHub/Vercel provider secret stores, not through PR/chat. Confirm synthetic credentials and mail capture without sending real emails. |
| Legal and external assurance | DPA/customer packets are drafts; seller signing/IP chain and clean independent pentest/retest remain not accepted. | Defer registry/tax/IP actions to owner's requested final administrative stage. External assessor and signing parties must provide genuine evidence when applicable; prompts cannot replace it. |

## 2. No-new-spend route

1. Owner checks **CircleCI project credits/usage** (no passwords/tokens shared), confirms no additional charge, and only then manually starts PR #2553 source-only preflight using `run_qa_preflight=true`. The default `false` means source changes alone do not schedule the new CircleCI QA executor.
2. Retain existing GitHub required checks and security gates until the designated release owner reviews a documented CircleCI equivalence/substitution; never declare a missing GitHub check green or waive it. If CircleCI free credits are exhausted, continue local/offline tests and wait for included quota reset. Do not make the repository public to seek credits.
3. Decide whether the historical inactive Supabase QA project may be reviewed and reused. Never restore or destroy unknown data without an explicit scoped authorization and verified snapshot safety.
4. Configure disposable QA identities and mail sink in **CircleCI/Vercel secret stores** and a protected Vercel preview with **non-production** provider URLs and **Stripe TEST** credentials, keeping service-role keys out of frontend/public variable names.
5. Run PR #2553 E2E isolation proof first, then PR #2551 positive/negative paid-owner MFA tests against QA. To prove success export, an attributable QA MFA factor and paid **business** plan are required, not only a lower-tier fixture.
6. Confirm a new QA-only Stripe TEST webhook is enabled *on the correct isolated deployment*, using signing-secret verification and no copied protection-bypass URLs in evidence. Execute sandbox checkout, signed TEST webhook replay/idempotency and durable entitlement assertions against isolated QA; record exact code/deploy/test artefacts. No PASS on a skipped, simulated, stale or provider-mismatched path.

### Two-stage QA CI closure (21 October 2026)

Both pipelines are on **PR #2553 only**, restricted to branch `qa/fix-e2e-node22-20261021`, and default to `false`:

| CircleCI manual parameter | Test evidence | Cost exposure | Explicit acceptance boundary |
| --- | --- | --- | --- |
| `run_qa_preflight=true` | Node 22 source-only isolated E2E guard, CI gate contracts and Stripe source-contract scanners. Stores TAP + SHA-bound hashes. | Small CircleCI executor; **only after existing included credits are confirmed**. | The preflight proves repository contract behavior, **not** real Stripe billing, Supabase RLS, authenticated Playwright, procurement or production. |
| `run_qa_full=true` | Reuses existing `validar-risck` job: npm lockfile, lint, TypeScript, Vitest, P0 source tests, ISO/SOC2, security, dependency policy, Next.js build, route audit; and existing `p0-postgres-synthetic`: disposable PostgreSQL 17.6 tenant/MFA/rollback/concurrency. | **Large + small** resource jobs consume more credits; only with verified free quota and owner approval. | Code-level and disposable-PG17 checks only. Does not replace isolated QA browser or provider-backed billing proof. |

**No CircleCI job was executed by this QA branch edit.** The normal `verificacao-isolada` workflow retains its original branch filters and will *not* automatically run on this QA branch. The full validation job's internal checkout allowlist was enlarged only for the exact QA branch so it can run through the manual workflow; its SHA and privileged-provider-secret guards remain active. Do **not** disable GitHub required status checks or claim release equivalence without governance approval and exact-SHA provider evidence.

Suggested sequence if included credits are sufficient: (1) manually execute `run_qa_preflight=true` with `run_qa_full=false`; (2) review the SHA-bound artifact, (3) execute `run_qa_full=true` with `run_qa_preflight=false`; (4) archive job IDs, terminal status, commit SHA, artifacts and actual consumption. **Stop on any FAIL** rather than automatically rerunning.

### CircleCI manual QA control (added 21 October 2026)

`.circleci/config.yml` on PR #2553 defines `qa-preflight-manual`, gated by `run_qa_preflight` (default `false`). It only permits the exact QA branch and uses a small Node 22 executor. In addition to dependency-free Node preflight and CircleCI contract checks, it now runs the existing source-only `check-stripe-webhook-contract.mjs` and `run-stripe-runtime-validation.mjs` validators. It preserves a SHA-bound `tests.tap`, `stripe-webhook-contract.txt`, `stripe-runtime-source-only.json`, plus report digests. The Stripe validator itself explicitly outputs `repository_contract_passed_runtime_not_run`: **this is code-contract evidence, not a signed webhook or entitlement E2E result**. The existing full validation and synthetic PostgreSQL jobs are preserved. No CircleCI QA run is claimed yet; the project dashboard/verified job evidence must establish PASS.

**CircleCI official:** https://circleci.com/docs/guides/orchestrate/pipeline-variables/ for manually passing booleans; https://circleci.com/docs/guides/plans-pricing/credits/ for remaining/free credits.

## 3. Executable offline prerequisite

Current QA PR #2553 provides:
```bash
node --test tests/security/e2e-preflight-offline.test.mjs
```
Node 22 focused results **17/17 PASS** on 2026-10-21, verified against the two exact GitHub blob SHAs. These validate isolated QA preflight logic only, not Playwright, provider execution, runtime authentication, legal acceptance or release. Do not waive CI or substitute this unit proof for enterprise acceptance.

## 4. Explicit owner confirmation — limited scope

**Immediate owner input:** whether the existing CircleCI project has free credits available and a manual trigger is accessible (yes/no or a screenshot of usage without private billing fields). The small QA job can then be manually triggered with `run_qa_preflight=true` on `qa/fix-e2e-node22-20261021`. This is *not* authority to incur paid credits.

**Second decision when ready:** allow a **non-production, isolated, disposable QA environment** only after verifying no charges, specifying whether the existing inactive project may be touched, and ensuring any old records are protected. This is separate from releasing production or signing customer contracts.

**No general unrestricted authorization or password sharing is requested.** No owner action can make external legal opinions, independent pentest reports or production E2E proofs true without actual attributable execution.
