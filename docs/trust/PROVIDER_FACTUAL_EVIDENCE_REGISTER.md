# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-24  
**Latest runtime evidence subject captured:** `b8b099b9018f0be0de8f419d4c7d4a8629700d42`  
**Canonical tracker:** GitHub issue `#1727`  
**Current connector-observation ledger:** `docs/trust/evidence/2026-08-24-external-assurance-runtime-provider-revalidation.md`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence.
- Public legal documents support due diligence but do not prove account-specific acceptance where the provider exposes a separate account/legal action.
- A provider can be technically active while account/legal facts remain open.
- An assurance account is not Production evidence unless it can be attributed to the Production integration.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, private contracts, or exact public client project tokens when unnecessary.

## Factual reconciliation

| Provider / service | Current attributable fact | Region / location fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- | --- |
| Vercel | Production deployment `dpl_Doqc3EAUXnV9M2oM3AFscyfbkCAE` was observed `READY`, bound to runtime subject `b8b099b9018f0be0de8f419d4c7d4a8629700d42`; `/api/health` returned `200`; canonical RISCK COMPLY aliases are active. Connected team plan is `pro`. | Deployment function metadata reports `iad1`; this does not by itself establish all provider legal processing/storage locations. | `RUNTIME_EVIDENCE_CAPTURED / PRO_PLAN_PROVEN / HOBBY_MISMATCH_RESOLVED` | Applicable account agreement/DPA treatment, retention/deletion and transfer interpretation where required. |
| Supabase | Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY`; connected organization plan is `pro`. Standard provider DPA/SCC mechanics have provider-confirmed/public support. | Project region `eu-west-1` (Ireland). | `PROJECT_REGION_PROVEN / PRO_PLAN_PROVEN / STANDARD_DPA_FRAMEWORK_PROVEN / LEGAL_REVIEW_OPEN` | Check whether any separate negotiated agreement supersedes standard terms; final legal role/transfer/retention interpretation. Production schema/readiness gap remains separately tracked in `#1778`. |
| Stripe | Connected LIVE account is `RISCK COMPLY SAAS`, livemode. Prior attributable account read established country `PT`, account type `standard`, `business_type=individual`, charges/payouts enabled and details submitted. Sensitive KYC fields are intentionally excluded. | Account country is Portugal; provider storage/processing geography is not inferred from that field. | `LIVE_CONTROL_PLANE_PROVEN / ACCOUNT_COUNTRY_PROVEN / OPERATOR_ENTITY_ALIGNMENT_OPEN` | Align the LIVE account with the final existing-company operator decision if required; retain account-specific contractual/DPA applicability and enabled-service data-flow evidence. |
| GitHub | Repository and CI/workflows are actively used. Repository is public and owned by a personal GitHub account. | No customer-data processing region specific to this account is established here. | `REPOSITORY_USAGE_PROVEN / PUBLIC_REPO_PROVEN / ACCOUNT_CONTRACT_FACTS_OPEN` | Determine applicable account terms/DPA treatment if required by the operating model. |
| Sentry | Production response on the exact runtime subject contains `sentry-environment=production` and exact `sentry-release=b8b099...`; current-release binding is proven. Human support confirmed self-service assurance relies on public legal/security/trust materials, while individualized questionnaires are Enterprise-only. | Organization-specific storage region is not established by retained account evidence. | `CURRENT_RELEASE_BINDING_PROVEN / HUMAN_SUPPORT_BOUNDARY_PROVEN / ACCOUNT_DPA_REGION_OPEN` | Owner-visible organization region and DPA acceptance actor/timestamp; retention/transfer interpretation. |
| PostHog | Production bundle targets EU PostHog API/assets endpoints. Connected assurance organization exposes only a different `Default project` created 2026-08-22 with no ingested event; it is not the Production project. Human provider support confirmed EU Cloud is Frankfurt and account-linked DPA generation occurs from the Legal page. | Production client uses EU endpoints; provider states EU Cloud is Frankfurt. Production account ownership remains unrecovered. | `PRODUCTION_EU_ENDPOINT_BINDING_PROVEN / CONNECTED_ASSURANCE_PROJECT_MISMATCH / PRODUCTION_ACCOUNT_RECOVERY_OPEN` | Recover actual Production account/project; generate/retrieve account-linked DPA; confirm plan, retention and account settings. |
| Resend / transactional email | Historical RISCK COMPLY use and provider standard DPA/terms material exist. No attributable current exact-release send/runtime binding was observed in the latest scoped check. | Current account/runtime region unproven. | `HISTORICAL_USE_PROVEN / CURRENT_EXACT_RELEASE_BINDING_OPEN / PROVIDER_PUBLIC_MATERIAL_AVAILABLE` | Confirm current Production binding; if active, account/legal entity, DPA applicability, retention, transfers and notice treatment. |
| Upstash / Redis | Historical predecessor-release runtime evidence proved distributed Redis binding. Current-release safe probing did not reach the backend and scoped logs did not provide attributable current-release execution. | Exact account region(s) remain unproven. | `HISTORICAL_RUNTIME_BINDING_PROVEN / CURRENT_EXACT_RELEASE_REPROOF_OPEN / ACCOUNT_FACTS_OPEN` | Current exact-release runtime reproof; account/plan/owner/region, retention/deletion, DPA and transfer/subprocessor facts. |
| Malware/content scanner | Runtime policy requires provider-backed scanning for enabled enterprise uploads; historical scanner evidence exists, but current exact-release provider identity/binding is not established. | `UNKNOWN_CURRENT` | `CONDITIONAL_UNVERIFIED` | Confirm actual active provider/scope, data categories, region, retention and legal terms if the feature is enabled. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Workspace-specific processing/storage posture is outside current provider-account evidence. | `FOUNDER_OPERATIONAL_USE_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / LEGAL_FACTS_OPEN` | Final policy on customer-content use, workspace terms/retention/training posture and qualified legal role. |

## Superseded provider blockers

The following historical blockers are explicitly superseded and must not be reported as current:

- `VERCEL_HOBBY_PLAN_MISMATCH` — **resolved**; connected Vercel team is Pro.
- `SUPABASE_FREE_PLAN_MISMATCH` — **resolved**; connected Supabase organization is Pro.
- `STRIPE_ACCOUNT_COUNTRY_OPEN` — **resolved**; attributable account country is Portugal.
- `SENTRY_CURRENT_RELEASE_BINDING_OPEN` — **resolved** for runtime binding; organization region/DPA acceptance remain separate.
- `POSTHOG_EU_ENDPOINT_BINDING_OPEN` — **resolved** for runtime endpoint configuration; Production account recovery/DPA remain separate.

## Current release compatibility observation

The observed runtime subject is healthy at the basic Vercel health endpoint. This does not close the separately reproduced Production maintenance/schema blocker in `#1778`, and provider factual reconciliation must not be used to promote `PRODUCTION_GO` while that technical gate or external gates remain open.

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

The runtime evidence subject SHA and the later documentation-containing commit SHA may differ. A documentation-only commit does not itself invalidate previously captured provider/account facts. Release-specific statements must be revalidated after material changes in runtime, provider configuration, data flows, regions, retention or service scope.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: MATERIALLY_RECONCILED`

`VERCEL_PLAN_BLOCKER: CLOSED`

`SUPABASE_PLAN_BLOCKER: CLOSED`

`SENTRY_CURRENT_RELEASE_BINDING: PROVEN`

`POSTHOG_CURRENT_RELEASE_EU_ENDPOINT_BINDING: PROVEN`

`UPSTASH_CURRENT_EXACT_RELEASE_REPROOF: OPEN`

`POSTHOG_PRODUCTION_ACCOUNT_RECOVERY: OPEN`

`STRIPE_OPERATOR_ENTITY_ALIGNMENT: OPEN`

`ACCOUNT_LEGAL_FACTS_OPEN: OPEN`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
