# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-20  
**Latest runtime evidence subject captured:** `e8f2d10d6fe03096b07eeb9a049742cd049cc78b`  
**Canonical tracker:** GitHub issue `#1727`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

A provider row may be promoted only from attributable evidence. Repository configuration alone does not prove that a service is enabled in production. A public DPA alone does not prove that the RISCK COMPLY account accepted or is covered by it.

The **runtime evidence subject SHA** identifies the deployed application state that was actually observed. The Git commit that later contains this register may have a different SHA because committing or merging documentation creates a new repository commit. That difference alone does not invalidate previously observed provider/account facts. Release-bound facts must be revalidated when provider configuration, data flow, runtime behavior, deployment state, region, retention, or service scope changes materially, or whenever this register makes a new claim about the latest live release.

Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private contracts, or unredacted provider exports in this register. Public client-side identifiers are also omitted when their exact value is unnecessary to prove configuration state.

## Factual reconciliation

| Provider / service | Production/configuration fact supported by captured evidence | Region / location fact | Public provider material | Current evidence state | Still required before contractual disclosure |
| --- | --- | --- | --- | --- | --- |
| Vercel | On 2026-08-20, target-production deployment `dpl_Fw1Dw27oETEBCMwoxDBLBQU7Eyti` reached `READY` and was bound to runtime evidence subject `e8f2d10d6fe03096b07eeb9a049742cd049cc78b`; production aliases included `risckcomply.com` and `www.risckcomply.com`. | The captured deployment reported function-region signal `iad1`. This is a runtime-location fact, not a legal transfer conclusion. | Current public DPA: `https://vercel.com/legal/dpa`. It describes processor terms, subprocessors and transfer mechanisms for covered agreements/plans. | `RUNTIME_EVIDENCE_CAPTURED / LEGAL_FACTS_INCOMPLETE` | Confirm actual account plan/agreement, contracting entity, DPA applicability/acceptance, relevant subprocessor snapshot, retention/deletion terms, and approved transfer treatment. |
| Supabase | Connected production project/ref `tganhbbhfxcpblmgqprg`, name `eurocomply_saas`, was revalidated on 2026-08-20 as `ACTIVE_HEALTHY`. | Project region is `eu-west-1`; Supabase's region documentation maps this to West EU (Ireland). | `https://supabase.com/docs/guides/security` states a DPA is available for customers who need one; region reference: `https://supabase.com/docs/guides/platform/regions`. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm contracted entity, actual DPA/account reference, plan-specific backup/log retention, transfer/subprocessor terms, storage behavior and customer-notice obligations. |
| Stripe | Connected-provider inspection on 2026-08-20 returned account display name `RISCK COMPLY SAAS`. PR `#1732` versioned this account as intended LIVE provider authority and PR `#1734` hardened the Vercel Stripe secret-type boundary. Those repository facts do **not** prove that LIVE account activation/bootstrap, canonical webhook setup, Vercel rebinding, provider runtime proof, or a genuine customer billing lifecycle completed; those runtime steps remain Billing-stream owned. | Connector evidence retained here does not establish a processing/storage region or contracting entity. | Current public DPA FAQ: `https://stripe.com/legal/dpa/faqs`; Stripe states a DPA forms part of its services agreement and describes transfer mechanisms, but applicability depends on the actual account/agreement. | `ACCOUNT_IDENTITY_RECONCILED / LIVE_RUNTIME_CUTOVER_UNPROVEN / LEGAL_FACTS_INCOMPLETE` | Confirm account location, contracting Stripe entity, exact applicable agreement/DPA version, enabled-service data categories, retention/deletion posture and transfer/subprocessor applicability. Separately, Billing must prove the LIVE cutover/runtime lifecycle before any billing-runtime PASS. |
| GitHub | Repository `renanescola40-afk/eurocomply_saas` and CI/repository workflows are actively used. | Public provider subprocessor material lists multiple processing locations; no customer-data processing region specific to this RISCK COMPLY account is established here. | GitHub publishes a DPA/privacy framework and subprocessor list. Applicability depends on the service/agreement governing the account. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm account/plan and applicable DPA/terms, contractual entity, relevant data categories, workflow/artifact retention and transfer treatment where GitHub processes personal data in the production operating model. |
| Sentry | Live production HTML captured on 2026-08-20 for runtime evidence subject `e8f2d10d6fe03096b07eeb9a049742cd049cc78b` contained `sentry-environment=production` and `sentry-release=e8f2d10d6fe03096b07eeb9a049742cd049cc78b`; the captured CSP permitted Sentry ingestion domains. | Sentry publicly supports US and Germany data-storage locations, but the RISCK COMPLY organization region is not established by the evidence retained here. | Sentry documentation confirms region-specific US/DE hosting/API domains; account-level DPA/subprocessor/retention material still requires reconciliation. | `RUNTIME_EVIDENCE_CAPTURED / LEGAL_FACTS_INCOMPLETE` | Confirm organization/project ownership, actual organization region, provider legal entity, scrubbing/data categories, retention, DPA/subprocessor/transfer terms, and account applicability. Runtime configuration changes remain Chat 1-owned. |
| PostHog | Production delivery captured on 2026-08-20 contained the application's `PostHogAnalyticsProvider` and `AnalyticsConsentBanner` components, while the CSP permitted EU PostHog ingestion/assets endpoints. These facts do **not** establish that the production PostHog project key is populated, that the consent-required flag is enabled, or that events are transmitted. Exact client/project identifiers are intentionally omitted. | The captured CSP permitted PostHog EU service endpoints, but endpoint allowlisting alone does not prove active processing or account region. | PostHog's Trust Center publishes a DPA, subprocessor material and privacy/security evidence; exact account applicability remains separate. | `RUNTIME_COMPONENT_PRESENT / ENABLEMENT_AND_CONSENT_UNVERIFIED` | Confirm whether the production PostHog project key is populated and whether consent-required mode is enabled; if active, confirm account/project ownership, contractual entity, DPA/account applicability, project region and retention, exact data/event categories, consent-policy legal approval, and transfer/subprocessor treatment. |
| Resend / transactional email | Canonical repository code and `.env.example` support Resend-backed email delivery. A prior scoped production-log search returned no matching `resend` entries; absence of logs is not absence proof. | RISCK COMPLY account/runtime region is unproven. Resend's public DPA states its primary processing operations take place in the United States. | Current public DPA: `https://resend.com/legal/dpa`; current public subprocessors: `https://resend.com/legal/subprocessors`. Public terms identify Plus Five Five, Inc. and describe DPA/SCC/subprocessor treatment and deletion after termination, but do not prove RISCK COMPLY account usage or acceptance. | `CONDITIONAL_UNVERIFIED / PROVIDER_PUBLIC_MATERIAL_AVAILABLE` | Confirm whether Resend is actually enabled in production and, only if active, establish account/legal entity, applicable agreement/DPA, message data, retention, subprocessor/transfer terms and customer-notice implications. |
| Upstash / Redis | Canonical `.env.example` supports conditional Upstash Redis configuration. External account evidence was not available in this snapshot. | `UNKNOWN_CURRENT` | Upstash publishes compliance/security material, but this does not prove RISCK COMPLY account use or contractual coverage. | `CONDITIONAL_UNVERIFIED` | Confirm enabled status first; if active, reconcile service, region, operational metadata, retention, DPA/account and transfer terms. |
| Malware/content scanning provider | Repository requires a production malware-scanner provider for enterprise uploads when that functionality is enabled, but this register does not contain external provider identity evidence. | `UNKNOWN_CURRENT` | Not reconciled in this snapshot. | `CONDITIONAL_UNVERIFIED` | Confirm actual provider, enabled scope, content/data categories, region, retention, DPA/transfer terms. Technical runtime ownership remains Chat 1. |
| AI/model provider used by RISCK COMPLY itself | Canonical `.env.example` contains no dedicated AI/model-provider credential/configuration group, and prior repository review found no direct common AI-provider integration. This does **not** prove production absence. | `UNKNOWN_CURRENT` | N/A until an actual provider is identified. | `FOUNDER_FACT_REQUIRED` | Authorised officer must confirm whether any AI provider processes customer content, model/provider identity, retention/training posture, DPA/transfer terms, and whether the correct result is genuinely N/A. |

## Stale evidence explicitly rejected as current provider proof

`docs/security/evidence/runtime/production-secrets-provider-stores.json` remains useful as historical inventory evidence, but it is dated 2026-06-21 and bound to commit `8389985112ec23f0e058a75a48b789a5f7a9b8d6`. It must not be used by itself to claim current provider enablement, DPA status, region, retention, or final-release coverage.

Earlier runtime snapshots at `3ad7a6c5c11a69b9c7f61115672278b05e84f984`, `d4549aa92938f2ed9bfb0de7cac884a70f80e187`, and `127aed7e954d75ea71f20cfbeb0fb3ed4212615c` remain provenance for their respective capture points. The latest release-bound runtime observation recorded in this register is subject `e8f2d10d6fe03096b07eeb9a049742cd049cc78b`; the commit that contains this document is intentionally not treated as proof of deployment.

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

There are two distinct SHAs:

1. **runtime evidence subject SHA** — the deployed state actually observed and attributable to runtime evidence;
2. **document-containing commit SHA** — the repository commit that stores this register.

They are not required to be identical. A documentation-only commit or merge can change the second SHA without changing the runtime/provider fact previously observed. That does not create evidence that the new commit was deployed, and it does not automatically invalidate the prior runtime observation.

For a statement that something is the **latest live release**, production deployment state must be revalidated and a new runtime evidence subject must be recorded. Provider contract/DPA evidence has its own document/version/effective-date scope and does not become stale solely because application code changes; material changes in data flows, enabled providers, regions, retention, or service scope require reconciliation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: IN_REVIEW`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
