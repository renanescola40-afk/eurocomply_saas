# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-20  
**Repository snapshot:** `main@127aed7e954d75ea71f20cfbeb0fb3ed4212615c`  
**Production READY snapshot:** `d4549aa92938f2ed9bfb0de7cac884a70f80e187`  
**Canonical tracker:** GitHub issue `#1727`

This register separates current provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

A provider row may be promoted only from attributable evidence. Repository configuration alone does not prove that a service is enabled in production. A public DPA alone does not prove that the RISCK COMPLY account accepted or is covered by that DPA.

Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private contracts, or unredacted provider exports in this register. Public client-side identifiers are also omitted from this document when their exact value is unnecessary to prove configuration state.

## Current factual reconciliation

| Provider / service | Production/configuration fact currently supported | Region / location fact | Public provider material | Current evidence state | Still required before contractual disclosure |
| --- | --- | --- | --- | --- | --- |
| Vercel | Connected Vercel account contains project `eurocomply-saas`. At evidence capture, current repository `main` was `127aed7e954d75ea71f20cfbeb0fb3ed4212615c` and its target-production deployment was still `BUILDING`; the latest completed target-production deployment remained `READY` at `d4549aa92938f2ed9bfb0de7cac884a70f80e187`. This explicitly prevents treating repository `main` as already live before deployment completion. | Both the latest READY production deployment and the in-progress current-main deployment report function region signal `iad1`. This is a runtime location signal, not a legal transfer conclusion. | Current public DPA: `https://vercel.com/legal/dpa`. It describes processor terms, subprocessors and transfer mechanisms for covered agreements/plans. | `CURRENT_PRODUCTION_READY_ON_PRIOR_MAIN / CURRENT_MAIN_DEPLOYMENT_IN_PROGRESS / LEGAL_FACTS_INCOMPLETE` | Revalidate the current-main deployment after it reaches a terminal state; confirm actual account plan/agreement, contracting entity, DPA applicability/acceptance, relevant subprocessor snapshot, retention/deletion terms, and approved transfer treatment. |
| Supabase | Connected production project/ref `tganhbbhfxcpblmgqprg`, name `eurocomply_saas`, was revalidated on 2026-08-20 as `ACTIVE_HEALTHY`. | Project region is `eu-west-1`; Supabase's current region documentation maps this to West EU (Ireland). | `https://supabase.com/docs/guides/security` states a DPA is available for customers who need one; current region reference: `https://supabase.com/docs/guides/platform/regions`. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm contracted entity, actual DPA/account reference, plan-specific backup/log retention, transfer/subprocessor terms, storage behavior and customer-notice obligations. |
| Stripe | Connected-provider inspection on 2026-08-20 returns the reviewed new account display name `RISCK COMPLY SAAS`. PR `#1732` versioned this account as the intended LIVE provider authority; PR `#1734` subsequently hardened the Vercel secret-type/authority path. Neither merge by itself proves successful post-merge LIVE activation/bootstrap, webhook setup, Vercel rebinding, provider runtime proof, or a genuine customer billing lifecycle; those runtime steps remain Billing-stream owned. | Current connector evidence used in this register does not establish a processing/storage region or contracting entity. | Current public DPA FAQ: `https://stripe.com/legal/dpa/faqs`; Stripe states a DPA forms part of its services agreement and describes transfer mechanisms, but applicability depends on the actual account/agreement. | `ACCOUNT_IDENTITY_RECONCILED / LIVE_RUNTIME_CUTOVER_UNPROVEN / LEGAL_FACTS_INCOMPLETE` | Confirm account location, contracting Stripe entity, exact applicable agreement/DPA version, enabled-service data categories, retention/deletion posture and transfer/subprocessor applicability. Separately, Billing must prove the post-merge LIVE cutover/runtime lifecycle before any billing-runtime PASS. |
| GitHub | Repository `renanescola40-afk/eurocomply_saas` and CI/repository workflows are actively used. | Public provider subprocessor material lists multiple processing locations; no customer-data processing region specific to this RISCK COMPLY account is established here. | GitHub publishes a DPA/privacy framework and current subprocessor list. Applicability depends on the service/agreement governing the account. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm account/plan and applicable DPA/terms, contractual entity, relevant data categories, workflow/artifact retention and transfer treatment where GitHub processes personal data in the production operating model. |
| Sentry | The latest completed production deployment remained `d4549aa92938f2ed9bfb0de7cac884a70f80e187` at evidence capture, and production HTML previously revalidated on 2026-08-20 exposed Sentry trace metadata with `sentry-environment=production` and `sentry-release=d4549aa92938f2ed9bfb0de7cac884a70f80e187`; the production CSP permits Sentry ingestion domains. The newer `main@127aed7e...` deployment was still BUILDING, so no Sentry release claim is made for that SHA yet. | Sentry publicly supports US and Germany data-storage locations, but the current RISCK COMPLY Sentry organization region is not established by the evidence retained here. | Current Sentry documentation confirms region-specific US/DE hosting/API domains; account-level DPA/subprocessor/retention material still requires reconciliation. | `CURRENT_RUNTIME_ENABLED_ON_LATEST_READY_RELEASE / CURRENT_MAIN_NOT_YET_PROVEN_LIVE / LEGAL_FACTS_INCOMPLETE` | After current-main deployment completes, revalidate release metadata; confirm organization/project ownership, actual organization region, provider legal entity, scrubbing/data categories, retention, DPA/subprocessor/transfer terms, and account applicability. Runtime configuration changes remain Chat 1-owned. |
| PostHog | Current production delivery revalidated on 2026-08-20 includes the application's `PostHogAnalyticsProvider` and `AnalyticsConsentBanner` components, while the production CSP permits the EU PostHog ingestion/assets endpoints. These facts do **not** establish that the production PostHog project key is populated, that the consent-required flag is enabled, or that events are currently transmitted. Exact client/project identifiers are intentionally omitted. | The production CSP permits PostHog's EU service endpoints, but endpoint allowlisting alone does not prove active processing or account region. | PostHog's current Trust Center publishes a DPA, subprocessor material and privacy/security evidence; exact account applicability remains separate. | `RUNTIME_COMPONENT_PRESENT / ENABLEMENT_AND_CONSENT_UNVERIFIED` | Confirm whether the production PostHog project key is populated and whether the consent-required flag is enabled; if active, confirm account/project ownership, contractual entity, DPA/account applicability, project region and retention, exact data/event categories, consent-policy legal approval, and transfer/subprocessor treatment. |
| Resend / transactional email | Canonical repository code and `.env.example` support Resend-backed email delivery. A scoped prior current-production log search returned no matching `resend` log entries; absence of logs is not absence proof. | Current RISCK COMPLY account/runtime region is unproven. Resend's public DPA states its primary processing operations take place in the United States. | Current public DPA: `https://resend.com/legal/dpa`; current public subprocessors: `https://resend.com/legal/subprocessors`. Public terms identify Plus Five Five, Inc. and describe DPA/SCC/subprocessor treatment and deletion after termination, but do not prove RISCK COMPLY account usage or acceptance. | `CONDITIONAL_UNVERIFIED / PROVIDER_PUBLIC_MATERIAL_AVAILABLE` | Confirm whether Resend is actually enabled in production and, only if active, establish account/legal entity, applicable agreement/DPA, message data, retention, subprocessor/transfer terms and customer-notice implications. |
| Upstash / Redis | Canonical `.env.example` supports conditional Upstash Redis configuration. Current external account evidence was not available in this snapshot. | `UNKNOWN_CURRENT` | Upstash publishes current compliance/security material, but this does not prove RISCK COMPLY account use or contractual coverage. | `CONDITIONAL_UNVERIFIED` | Confirm enabled status first; if active, reconcile service, region, operational metadata, retention, DPA/account and transfer terms. |
| Malware/content scanning provider | Repository requires a production malware-scanner provider for enterprise uploads when that functionality is enabled, but this register does not contain current external provider identity evidence. | `UNKNOWN_CURRENT` | Not reconciled in this snapshot. | `CONDITIONAL_UNVERIFIED` | Confirm actual provider, enabled scope, content/data categories, region, retention, DPA/transfer terms. Technical runtime ownership remains Chat 1. |
| AI/model provider used by RISCK COMPLY itself | Canonical `.env.example` contains no dedicated AI/model-provider credential/configuration group, and repository search at the prior baseline found no direct OpenAI/Anthropic/Gemini/Mistral/Cohere/Groq integration. This does **not** prove production absence. | `UNKNOWN_CURRENT` | N/A until an actual provider is identified. | `FOUNDER_FACT_REQUIRED` | Authorised officer must confirm whether any AI provider processes customer content, model/provider identity, retention/training posture, DPA/transfer terms, and whether the correct result is genuinely N/A. |

## Stale evidence explicitly rejected as current provider proof

`docs/security/evidence/runtime/production-secrets-provider-stores.json` remains useful as a historical inventory of provider-store variable names, but it is dated 2026-06-21 and bound to commit `8389985112ec23f0e058a75a48b789a5f7a9b8d6`. It must not be used by itself to claim current provider enablement, current DPA status, current region, current retention, or final release coverage.

The 2026-08-19 provider snapshot at `main@3ad7a6c5c11a69b9c7f61115672278b05e84f984` is historical for release-bound runtime facts. The earlier 2026-08-20 reconciliation at `main@d4549aa92938f2ed9bfb0de7cac884a70f80e187` remains valid provenance for the last completed READY release at this evidence capture, but it is no longer the current repository SHA.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- subprocessor authorisation, advance notice and objection model;
- analytics/cookie/consent legal requirements and final notice wording;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language;
- whether a provider is legally a processor, subprocessor, independent controller or another role for a particular data flow.

Public provider terms may support factual due diligence, but they are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## Exact-SHA / release treatment

Repository `main` and the currently READY production release are tracked separately. A repository SHA must not be described as live until the production deployment for that SHA reaches a successful terminal state and release-bound evidence is revalidated. Provider contract/DPA evidence should record its own document/version/effective date and does not become stale solely because application code changes; material changes in data flows, enabled providers, regions, retention or service scope require reconciliation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: IN_REVIEW`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
