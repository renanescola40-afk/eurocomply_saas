# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-24  
**Latest Production deployment subject observed:** `75151c463ea7bf54c74e4dc9e5cd3af995615eae`  
**Latest attributable provider-runtime feature baseline:** `b8b099b9018f0be0de8f419d4c7d4a8629700d42`  
**Current Production serving state:** `BLOCKED_402_DEPLOYMENT_DISABLED`  
**Canonical tracker:** GitHub issue `#1727`  
**Current Production outage tracker:** GitHub issue `#1814`  
**Current connector-observation ledger:** `docs/trust/evidence/2026-08-24-external-assurance-runtime-provider-revalidation.md`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence.
- Public legal documents support due diligence but do not prove account-specific acceptance where the provider exposes a separate account/legal action.
- A provider can be technically active while account/legal facts remain open.
- An assurance account is not Production evidence unless it can be attributed to the Production integration.
- A deployment can be `READY` while the project is not serving traffic; deployment build state must not be promoted to application availability proof.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, private contracts, or exact public client project tokens when unnecessary.

## Factual reconciliation

| Provider / service | Current attributable fact | Region / location fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- | --- |
| Vercel | Current Production deployment `dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx` reached `READY`, target `production`, bound to protected `main@75151c463ea7bf54c74e4dc9e5cd3af995615eae`, and received the canonical RISCK COMPLY aliases. The project reports `live=false`; both the canonical `/api/health` endpoint and exact deployment URL returned HTTP `402 Payment Required` with `x-vercel-error: DEPLOYMENT_DISABLED`. Connected team plan remains `pro`. The build itself completed successfully. | Deployment function metadata reports `iad1`; this does not by itself establish all provider legal processing/storage locations. | `DEPLOYMENT_READY / PRO_PLAN_PROVEN / PRODUCTION_SERVING_BLOCKED_402 / ACCOUNT_OR_USAGE_STATE_REVIEW_OPEN` | Restore serving state through a zero-cost/configuration/account-state remedy, or obtain separate owner authorization before any paid action; then re-run exact-SHA health/runtime proof. Applicable account agreement/DPA treatment, retention/deletion and transfer interpretation remain separate legal/account residuals. |
| Supabase | Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY`; connected organization plan is `pro`. Standard provider DPA/SCC mechanics have provider-confirmed/public support. Pre-V19 application/schema runtime compatibility issue `#1778` was closed by merged PR `#1780` without Production DDL or migration-history repair. | Project region `eu-west-1` (Ireland). | `PROJECT_REGION_PROVEN / PRO_PLAN_PROVEN / STANDARD_DPA_FRAMEWORK_PROVEN / PRE_V19_RUNTIME_COMPATIBILITY_CLOSED / LEGAL_REVIEW_OPEN` | Check whether any separate negotiated agreement supersedes standard terms; final legal role/transfer/retention interpretation. Any governed V19 promotion remains a separate migration-authority decision and is not a current #1778 compatibility blocker. |
| Stripe | Connected LIVE account is `RISCK COMPLY SAAS`, livemode. Prior attributable account read established country `PT`, account type `standard`, `business_type=individual`, charges/payouts enabled and details submitted. Sensitive KYC fields are intentionally excluded. | Account country is Portugal; provider storage/processing geography is not inferred from that field. | `LIVE_CONTROL_PLANE_PROVEN / ACCOUNT_COUNTRY_PROVEN / OPERATOR_ENTITY_ALIGNMENT_OPEN` | Align the LIVE account with the final existing-company operator decision if required; retain account-specific contractual/DPA applicability and enabled-service data-flow evidence. |
| GitHub | Repository and CI/workflows are actively used. Repository is public and owned by a personal GitHub account. | No customer-data processing region specific to this account is established here. | `REPOSITORY_USAGE_PROVEN / PUBLIC_REPO_PROVEN / ACCOUNT_CONTRACT_FACTS_OPEN` | Determine applicable account terms/DPA treatment if required by the operating model. |
| Sentry | The most recent attributable serving-release response captured on provider-runtime baseline `b8b099b...` contained `sentry-environment=production` and exact `sentry-release=b8b099...`; that release binding remains proven historical/current-configuration provenance. The later `75151c...` deployment is currently disabled before application traffic reaches runtime, so a new serving-release Sentry response cannot yet be claimed. Human support confirmed self-service assurance relies on public legal/security/trust materials, while individualized questionnaires are Enterprise-only. | Organization-specific storage region is not established by retained account evidence. | `ATTRIBUTABLE_RELEASE_BINDING_PROVEN / CURRENT_SERVING_REPROOF_BLOCKED_BY_1814 / HUMAN_SUPPORT_BOUNDARY_PROVEN / ACCOUNT_DPA_REGION_OPEN` | After #1814 closure, reprove Sentry on the serving exact release; owner-visible organization region and DPA acceptance actor/timestamp; retention/transfer interpretation. |
| PostHog | The most recent attributable Production client bundle evidence targets EU PostHog API/assets endpoints. Connected assurance organization exposes only a different `Default project` created 2026-08-22 with no ingested event; it is not the Production project. Human provider support confirmed EU Cloud is Frankfurt and account-linked DPA generation occurs from the Legal page. The later disabled Vercel deployment does not by itself invalidate the unchanged integration evidence, but it is not new serving-runtime proof. | Production client evidence uses EU endpoints; provider states EU Cloud is Frankfurt. Production account ownership remains unrecovered. | `PRODUCTION_EU_ENDPOINT_BINDING_PROVEN / CONNECTED_ASSURANCE_PROJECT_MISMATCH / PRODUCTION_ACCOUNT_RECOVERY_OPEN` | Recover actual Production account/project; generate/retrieve account-linked DPA; confirm plan, retention and account settings. |
| Resend / transactional email | Historical RISCK COMPLY use and provider standard DPA/terms material exist. No attributable current exact-serving-release send/runtime binding was observed in the latest scoped check. | Current account/runtime region unproven. | `HISTORICAL_USE_PROVEN / CURRENT_EXACT_SERVING_RELEASE_BINDING_OPEN / PROVIDER_PUBLIC_MATERIAL_AVAILABLE` | Confirm current Production binding after serving state is restored; if active, account/legal entity, DPA applicability, retention, transfers and notice treatment. |
| Upstash / Redis | Historical predecessor-release runtime evidence proved distributed Redis binding. On provider-runtime baseline `b8b099...`, safe probing did not reach the backend and scoped logs did not provide attributable exact-release execution. The current `75151c...` deployment is disabled before application runtime and therefore cannot supply new Upstash execution proof. | Exact account region(s) remain unproven. | `HISTORICAL_RUNTIME_BINDING_PROVEN / CURRENT_EXACT_SERVING_RELEASE_REPROOF_OPEN / ACCOUNT_FACTS_OPEN` | Reprove runtime after #1814 closure; account/plan/owner/region, retention/deletion, DPA and transfer/subprocessor facts. |
| Malware/content scanner | Runtime policy requires provider-backed scanning for enabled enterprise uploads; historical scanner evidence exists, but current exact-serving-release provider identity/binding is not established. | `UNKNOWN_CURRENT` | `CONDITIONAL_UNVERIFIED` | Confirm actual active provider/scope, data categories, region, retention and legal terms if the feature is enabled. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Workspace-specific processing/storage posture is outside current provider-account evidence. | `FOUNDER_OPERATIONAL_USE_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / LEGAL_FACTS_OPEN` | Final policy on customer-content use, workspace terms/retention/training posture and qualified legal role. |

## Superseded provider blockers

The following historical blockers are explicitly superseded and must not be reported as current:

- `VERCEL_HOBBY_PLAN_MISMATCH` — **resolved**; connected Vercel team is Pro. This does not close the separate current serving outage `#1814`.
- `SUPABASE_FREE_PLAN_MISMATCH` — **resolved**; connected Supabase organization is Pro.
- `STRIPE_ACCOUNT_COUNTRY_OPEN` — **resolved**; attributable account country is Portugal.
- `SENTRY_CURRENT_RELEASE_BINDING_OPEN` — **resolved for the previously serving attributable release**; a fresh serving-release reproof is blocked by #1814.
- `POSTHOG_EU_ENDPOINT_BINDING_OPEN` — **resolved** for runtime endpoint configuration; Production account recovery/DPA remain separate.
- `PRE_V19_RUNTIME_COMPATIBILITY_1778` — **resolved** by merged #1780 without Production DDL; do not report #1778 as a current blocker.

## Current release compatibility and availability observation

The current protected `main@75151c463ea7bf54c74e4dc9e5cd3af995615eae` has a Vercel Production deployment that is build-complete and `READY`, but the project is not serving application traffic: `live=false` and the canonical health endpoint returns HTTP `402 DEPLOYMENT_DISABLED`. The current Production availability blocker is therefore `#1814`.

The earlier application/schema compatibility blocker `#1778` is closed by merged #1780 (`3a3382e385eb54f8e706e31046c8b7d497057527`), which introduced bounded pre-V19 compatibility behavior without direct Production DDL, migration-history repair, unrestricted `db push`, or RLS weakening. It must not be reopened merely because the current Vercel account/usage state prevents serving traffic.

Provider factual reconciliation must not be used to promote `PRODUCTION_GO` while #1814 or external acceptance gates remain open.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor role allocation;
- lawful basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- subprocessor authorisation/notice/objection model;
- analytics/cookie/consent legal requirements;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language.

Public provider terms reduce factual uncertainty but are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## Exact-SHA treatment

The provider-runtime feature evidence baseline and the latest Production deployment subject can differ. A documentation-only or disclosure-only commit does not automatically invalidate previously captured provider/account facts, but it also does not prove that the newer deployment is actually serving application traffic. Release-specific serving statements must be revalidated after material changes and after any outage/disabled state is cleared.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: MATERIALLY_RECONCILED`

`VERCEL_PLAN_BLOCKER: CLOSED`

`VERCEL_PRODUCTION_SERVING: BLOCKED_402_DEPLOYMENT_DISABLED`

`VERCEL_PRODUCTION_OUTAGE_TRACKER: #1814`

`SUPABASE_PLAN_BLOCKER: CLOSED`

`PRE_V19_RUNTIME_COMPATIBILITY_1778: CLOSED_VIA_1780`

`SENTRY_ATTRIBUTABLE_RELEASE_BINDING: PROVEN`

`POSTHOG_CURRENT_RELEASE_EU_ENDPOINT_BINDING: PROVEN`

`UPSTASH_CURRENT_EXACT_SERVING_RELEASE_REPROOF: OPEN`

`POSTHOG_PRODUCTION_ACCOUNT_RECOVERY: OPEN`

`STRIPE_OPERATOR_ENTITY_ALIGNMENT: OPEN`

`ACCOUNT_LEGAL_FACTS_OPEN: OPEN`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
