# RISCK COMPLY — E2E QA provider access and owner decision V10

**Evidence date:** 2026-10-21 · **scope:** QA/procurement executor, not the primary release writer.  
**Decision:** `QA_E2E=NO_PASS`, `BILLING_E2E=NO_PASS`, `ENTERPRISE_100=NO_PASS`.  
**Safety:** no production data mutation, no additional spend, no emails, no merges, no release changes.

## 1. Confirmed connector and source facts

| Dependency | Verified state | Owner action / engineering decision |
| --- | --- | --- |
| GitHub repository | Connected GitHub API reports admin/push privileges for the repository. #2551 and #2553 are open QA-only PRs. | No further generic repository permission needed. Keep main merge and release authority with primary writer. |
| GitHub Actions runner | Newest sampled exact-head GitHub CI jobs fail with no executed steps/logs. Repository's 2026-10-15 financial runbook records owner's 2,000/2,000 included minutes screenshot and a historical pre-job payment/spend-cap annotation. | **Owner, read-only:** GitHub personal account Settings → Billing and licensing → Usage/Budgets and alerts. Confirm current Actions minutes, account billing restriction and spending cap; do not add payment methods or raise budgets without a fresh explicit spending decision. |
| Supabase QA | 7 accessible Supabase projects: production `tganhbbhfxcpblmgqprg` active, six others inactive, including historical `pqlnibgfdkqmdbeigcpd`. | **Owner decision required before repurposing old project:** confirm it is disposable/contains no protected data and that activation is free under current provider billing. Otherwise use a new isolated project only when provider confirms zero unapproved cost. Production project is excluded. |
| Vercel QA | Production project accessible. No custom QA environment, and no preview deployed from latest QA PR heads; other old previews do not establish isolation. SSO deployment protection enabled. | Configure an isolated preview with QA-specific environment variables, account-linked access and no production database/secrets. Preserve protection. Check plan/usage implications before deploying. |
| Stripe sandbox | Connected TEST account accessible; test subscriptions exist, but no checkout→verified signed webhook→Supabase entitlements evidence at the current QA SHA. | Use **test mode only**, bind its webhook to the isolated QA preview, create synthetic paid owner/plan as needed; verify TEST provider account and delivery first. No live transactions. |
| QA secrets and mail sink | Workflow references `E2E_QA_*` environment/repository secrets and a confirmed mail sink, but this review cannot validate all secret bindings. | Provision secrets through GitHub/Vercel provider secret stores, not through PR/chat. Confirm synthetic credentials and mail capture without sending real emails. |
| Legal and external assurance | DPA/customer packets are drafts; seller signing/IP chain and clean independent pentest/retest remain not accepted. | Defer registry/tax/IP actions to owner's requested final administrative stage. External assessor and signing parties must provide genuine evidence when applicable; prompts cannot replace it. |

## 2. No-new-spend route

1. Owner checks **existing** GitHub Actions usage/billing status read-only. No credentials need to be shared with the assistant.
2. If no free runner minutes remain, do not blindly rerun; use local/offline tests while waiting for the cycle to reset, or owner-approved local self-hosted capacity **only if safely configured and genuinely cost-free**. Do not change repository visibility.
3. Decide whether the historical inactive Supabase QA project may be reviewed and reused. Never restore or destroy unknown data without an explicit scoped authorization and verified snapshot safety.
4. Configure disposable QA identities and mail sink and a protected Vercel preview with **non-production** provider URLs and **Stripe TEST** credentials, keeping service-role keys out of frontend/public variable names.
5. Run PR #2553 E2E isolation proof first, then PR #2551 positive/negative paid-owner MFA tests against QA. To prove success export, an attributable QA MFA factor and paid **business** plan are required, not only a lower-tier fixture.
6. Execute sandbox checkout, signed TEST webhook replay/idempotency and durable entitlement assertions against isolated QA; record exact code/deploy/test artefacts. No PASS on a skipped, simulated, or provider-mismatched path.

## 3. Executable offline prerequisite

Current QA PR #2553 provides:
```bash
node --test tests/security/e2e-preflight-offline.test.mjs
```
Node 22 focused results **17/17 PASS** on 2026-10-21, verified against the two exact GitHub blob SHAs. These validate isolated QA preflight logic only, not Playwright, provider execution, runtime authentication, legal acceptance or release. Do not waive CI or substitute this unit proof for enterprise acceptance.

## 4. Explicit owner confirmation — limited scope

**Immediate owner input:** status of Actions included minutes / blocking banner from account billing settings. A yes/no or screenshot of the relevant **usage and error only** is sufficient; obscure billing personal/payment information.

**Second decision when ready:** allow a **non-production, isolated, disposable QA environment** only after verifying no charges, specifying whether the existing inactive project may be touched, and ensuring any old records are protected. This is separate from releasing production or signing customer contracts.

**No general unrestricted authorization or password sharing is requested.** No owner action can make external legal opinions, independent pentest reports or production E2E proofs true without actual attributable execution.
