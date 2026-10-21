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
Node 22 focused results **23/23 PASS** on 2026-10-21, verified against GitHub workflow blob `8271a66e68e8e3d9e18297bd78778af52888c969` and synthetic-test blob `d4757b926d7e01aae2d83a193e2b968aee77073e`. Six additional negative cases reject QA application and Supabase origins carrying paths, query/fragment or nonstandard HTTPS ports. The Node TAP report is in the V10 handoff zip. These validate isolated QA preflight logic only, not Playwright, provider execution, runtime authentication, legal acceptance or release. Do not waive CI or substitute this unit proof for enterprise acceptance.

## 4. Explicit owner confirmation — limited scope

**Immediate owner input:** whether the existing CircleCI project has free credits available and a manual trigger is accessible (yes/no or a screenshot of usage without private billing fields). The small QA job can then be manually triggered with `run_qa_preflight=true` on `qa/fix-e2e-node22-20261021`. This is *not* authority to incur paid credits.

**Second decision when ready:** allow a **non-production, isolated, disposable QA environment** only after verifying no charges, specifying whether the existing inactive project may be touched, and ensuring any old records are protected. This is separate from releasing production or signing customer contracts.

**No general unrestricted authorization or password sharing is requested.** No owner action can make external legal opinions, independent pentest reports or production E2E proofs true without actual attributable execution.


## V12-C CENTRAL WRITE GUARD ADDENDUM — 21 October 2026

**Executor C scope:** existing PR #2553 only; no main merge, deploy, external email, Stripe provider mutation, Supabase production read/write query, new spend or changes to Executor A/B branches.

### Concrete defect and scoped correction

The inherited opt-in browser suites (\`authenticated-commercial-acceptance.spec.ts\`, \`full-saas-functional-journey.spec.ts\`, \`new-customer-commercial-activation.spec.ts\`) treated \`E2E_ALLOW_SYNTHETIC_APP_WRITES=true\` plus disposable-fixture wording as permission to attempt writes, without a common configuration-load-time check of the application/database destination.

The existing \`payment-first-runtime-global-setup.ts\` test performs negative PostgREST write attempts against an unlicensed synthetic tenant when specifically activated; it also needed a fail-closed destination check **before** browser launch/direct API access. The paid-owner retention browser spec needed the same provider isolation when using explicit QA credentials.

Implemented **on the existing QA PR only**:

- \`playwright.config.ts\`: a central fail-closed preflight runs before \`defineConfig\` whenever \`E2E_ALLOW_SYNTHETIC_APP_WRITES=true\`, requiring a root HTTPS non-production QA app URL, an explicit non-production Supabase project URL, Stripe \`sk_test_\` credentials and webhook signing-secret shape, a confirmed QA mail sink and no production-like server gate.
- Known public application origins (apex, www, subdomains) and confirmed production Vercel aliases are rejected. The current Vercel project read-only domain inventory confirmed \`eurocomply-saas.vercel.app\` as a production alias and returned further canonical/main and current production-deployment hosts; these known hosts were excluded. **This static list does not establish that an arbitrary other Vercel preview is isolated**: runtime target validation and provider-account verification still need actual evidence.
- \`payment-first-runtime-global-setup.ts\`: refuses unsafe/production application and database origins before acquiring a browser or making negative write requests.
- \`retention-export-functional.spec.ts\`: paid-owner fixture now also needs non-production app/DB, TEST billing key and confirmed mail sink. The anonymous read-only denial test remains available.
- New offline Node suites \`payment-first-qa-origin-guard.test.mjs\` and \`playwright-synthetic-write-qa-gate.test.mjs\` cover positive disposable-URL scenarios, known production aliases, malformed/missing origins, production Supabase, forbidden Stripe LIVE credentials and missing mail sink.
- The existing small \`qa-preflight-offline\` CircleCI workflow and its own contract tests now execute both suites without privileged provider keys or npm installation.

### Actually executed vs not executed

A **local isolated Node 22 rehearsal of the guard logic** (using recreated local copies of the reviewed guard source, *not* a checkout of the private PR head) executed 59/59 checks successfully. It establishes logic-level confidence only: **not** an exact-SHA repository test run and **not** browser, QA provider, Stripe webhook, database persistence or CI evidence. All changed remote files were read back through the GitHub connector and checked for guard presence and ordering.

**New PR-head status:** prior CircleCI #209/#210/#211 PASS reports remain confined to older SHA \`9b7ef4df352e6a4c5246618f1c224d9e242b0728\`. New commits invalidate transfer of that execution status; on this newly edited branch the combined GitHub commit statuses must be reread, and the exact-head QA preflight/full CI must run if free provider resources are available. No unearned PASS or release equivalence.

### Smallest next real provider acceptance

1. Independently attest an isolated non-production Supabase project is disposable, owned, contains no customer/protected data and may be active at zero extra cost. Existing historical inactive projects are **not** automatically disposable.
2. Provide an approved protected QA preview with verifiable deployment SHA and QA-only backend/Stripe TEST bindings, disposable owner/member identities, verified mail sink and no production credential inheritance.
3. After remaining CircleCI credits are confirmed, run the small source-only manual preflight on the latest QA SHA. Escalate exact-head full CI and authenticated Playwright only when all prerequisites hold.
4. Create/configure a **new** QA-only Stripe TEST webhook after the isolated target exists; prove real signed receipt, event idempotency, workspace association, subscription persistence, entitlements/reloads and revocation. Do not enable the currently disabled stale TEST endpoint or reuse its protection-bypass metadata.
5. Return exact SHA, CI job IDs, test names/counts, skipped tests, QA deployment ID, provider-backed redacted evidence and open failures to Executor A. Executor A alone governs review, merge and release.

\`\`\`text
QA_ISOLATED_WRITE_GUARD=IMPLEMENTED_ON_PR_2553
LOCAL_GUARD_REHEARSAL=59_PASS_0_FAIL_NOT_EXACT_HEAD_CI
PRODUCTION_APP_ALIAS_EXCLUSIONS=APEX_AND_VERIFIED_VERCEL_ALIASES
AUTHENTICATED_E2E=NO_PASS
STRIPE_TEST_SIGNED_WEBHOOK=NO_PASS
PROVIDER_PERSISTENCE=NO_PASS
CUSTOMER_PAID_PILOT_GO=NO_GO
EXTERNAL_MESSAGES_SENT=0
LIVE_PAYMENTS_CREATED=0
PRODUCTION_WRITES=0
UNAPPROVED_SPENDING=0
\`\`\`

## V12-C REPORT-ACCEPTANCE ADDENDUM — 21 October 2026

**Objective:** prevent a full Playwright invocation from being marketed as customer acceptance when the paid owner / MFA functional test is skipped because isolated provider prerequisites are missing.

- `scripts/quality/check-paid-owner-playwright-proof.mjs` reads a standard Playwright JSON reporter output and requires precisely one completed successful attempt of `tests/e2e/retention-export-functional.spec.ts` → `owner clicks export, receives MFA dialog, and unverified API request is denied`.
- Explicitly rejects skipped, missing, failed, interrupted, retried/flaky or duplicate matching test records; denies a report with unexpected or flaky suite results. No guarantee is inferred from output file existence alone.
- The isolated manual E2E workflow uses `PLAYWRIGHT_JSON_OUTPUT_FILE=test-results/qa-customer-playwright.json`, runs Playwright with the JSON reporter and then runs the verifier. The workflow blocks the known current Vercel production aliases in addition to the `risckcomply.com` production domain.
- The offline CircleCI preflight incorporates `tests/security/paid-owner-playwright-proof.test.mjs` with 12 local test fixtures, **12/12 actually executed on Node 22**, and both GitHub blob SHAs matching exactly the locally executed validator/test files (`15afefdb33012a6ea9b1fcdb1dcde643e9e9aae0` and `fd3a19a4e2a570eeb3f28cbfb6d478c1cf16d422`). **No exact-head CI PASS is claimed**.
- The verifier establishes only the stated paid-owner browser MFA negative boundary. It cannot establish positive export under verified step-up, signed Stripe webhook delivery, durable provider writes, tenant security, subscription lifecycle, final GDPR compliance or legal acceptance.

**Read-only provider state:** seven Supabase projects were visible, only the named production project active; six inactive projects are not approved as disposable. Vercel branch-filtered deployment listing for the QA branch returned zero. Therefore no current isolated browser-to-provider E2E acceptance has been executed.

**Supabase upcoming platform change (provider changelog checked 21 Oct 2026):** on 30 October 2026, the Data API automatic exposure policy changes for existing projects. The PostgreSQL 17.11 upgrade may also require extension/index compatibility checks. Executor B owns database schema/security postconditions; this QA workstream does **not** relax grants/RLS or apply migrations to production. An isolated provider-backed acceptance must verify both table API exposure and correct tenant-authorized row results (GRANT alone does not prove secure RLS).

```text
OFFLINE_PAID_OWNER_REPORT_CHECKER=12_PASS_0_FAIL_EXACT_FILE_BLOBS
EXACT_HEAD_CI=NOT_EXECUTED
ISOLATED_QA_DEPLOYMENT=NOT_FOUND
ISOLATED_QA_DATABASE=NOT_ACTIVATED_OR_APPROVED
PAID_OWNER_MFA_BROWSER=NOT_EXECUTED
PROVIDER_PERSISTENCE=NOT_VERIFIED
STRIPE_TEST_WEBHOOK_DELIVERY=NOT_VERIFIED
EMAILS_SENT=0
PRODUCTION_WRITES=0
LIVE_PAYMENTS_CREATED=0
UNAPPROVED_SPEND=0
```
