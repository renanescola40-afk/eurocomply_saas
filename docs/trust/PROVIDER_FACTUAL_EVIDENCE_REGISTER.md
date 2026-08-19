# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-19  
**Subject baseline:** `main@3ad7a6c5c11a69b9c7f61115672278b05e84f984`  
**Canonical tracker:** GitHub issue `#1727`

This register separates current provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

A provider row may be promoted only from attributable evidence. Repository configuration alone does not prove that a service is enabled in production. A public DPA alone does not prove that the RISCK COMPLY account accepted or is covered by that DPA.

Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private contracts, or unredacted provider exports in this register.

## Current factual reconciliation

| Provider / service | Production/configuration fact currently supported | Region / location fact | Public provider material | Current evidence state | Still required before contractual disclosure |
| --- | --- | --- | --- | --- | --- |
| Vercel | Connected Vercel account contains project `eurocomply-saas`; latest target `production` deployment is `READY`, aliases include `risckcomply.com` and `www.risckcomply.com`, and deployment metadata binds it to Git SHA `3ad7a6c5c11a69b9c7f61115672278b05e84f984`. | Current production deployment reports function region `iad1`. This is a runtime location signal, not a legal transfer conclusion. | Current public DPA: `https://vercel.com/legal/dpa`. It describes processor terms, subprocessors and transfer mechanisms for covered agreements/plans. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm actual account plan/agreement, contracting entity, DPA applicability/acceptance, relevant subprocessor snapshot, retention/deletion terms, and approved transfer treatment. |
| Supabase | Connected production project/ref `tganhbbhfxcpblmgqprg`, name `eurocomply_saas`, status `ACTIVE_HEALTHY`. | Project region is `eu-west-1`; Supabase's current region documentation maps this to West EU (Ireland). | `https://supabase.com/docs/guides/security` states a DPA is available for customers who need one; current region reference: `https://supabase.com/docs/guides/platform/regions`. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm contracted entity, actual DPA/account reference, plan-specific backup/log retention, transfer/subprocessor terms, storage behavior and customer-notice obligations. |
| Stripe | Connected Stripe account exists with display name `risck comply`. Billing lifecycle evidence is owned by Chat 3 and is referenced rather than recreated here. | Connector evidence used in this register does not establish a processing/storage region or contracting entity. | Current public DPA FAQ: `https://stripe.com/legal/dpa/faqs`; Stripe states a DPA forms part of its services agreement and describes transfer mechanisms, but applicability depends on the actual account/agreement. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm account location, contracting Stripe entity, exact applicable agreement/DPA version, enabled-service data categories, retention/deletion posture and transfer/subprocessor applicability. |
| GitHub | Repository `renanescola40-afk/eurocomply_saas` and CI/repository workflows are actively used. | No customer-data processing region is established by the evidence retained here. | Provider contract/privacy evidence not yet reconciled in this register. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm contractual entity, relevant data categories, workflow/artifact retention, DPA/transfer posture if GitHub processes customer personal data in the production operating model, and legal classification. |
| Sentry | Current production HTML contains Sentry trace metadata with `sentry-environment=production` and `sentry-release=3ad7a6c5c11a69b9c7f61115672278b05e84f984`; the production CSP also permits Sentry ingestion domains. This is current runtime evidence that Sentry observability is active for the deployed release. | Current provider account/data-processing region is not established by this evidence. | Provider DPA/subprocessor/retention material is not yet reconciled in this snapshot. | `CURRENT_RUNTIME_ENABLED / LEGAL_FACTS_INCOMPLETE` | Confirm organization/project ownership, provider legal entity, processing region, scrubbing/data categories, retention, DPA/subprocessor/transfer terms, and account applicability. Runtime configuration changes remain Chat 1-owned. |
| PostHog | Current production layout contains a `PostHogAnalyticsProvider` and `AnalyticsConsentBanner`, and the CSP permits the configured PostHog EU ingestion/asset hosts. The current evidence does **not** expose an active project key or prove that analytics events are being transmitted. | Runtime policy points to EU PostHog hosts, but project/account region and active event processing are not proven. | Not reconciled in this snapshot. | `RUNTIME_COMPONENT_PRESENT / ENABLEMENT_UNVERIFIED` | Confirm project/key enablement without exposing secrets, actual event transmission, consent behavior, identifiers/events, project region, retention, DPA and transfer terms. |
| Resend / transactional email | Canonical repository code and `.env.example` support Resend-backed email delivery. Current external account/provider evidence was not available in this snapshot. | `UNKNOWN_CURRENT` | Not reconciled in this snapshot. | `CONDITIONAL_UNVERIFIED` | Confirm actual enabled email provider, account/legal entity, region, message data, retention, DPA/transfer terms and customer-notice implications. |
| Upstash / Redis | Canonical `.env.example` supports conditional Upstash Redis configuration. Current external account evidence was not available in this snapshot. | `UNKNOWN_CURRENT` | Not reconciled in this snapshot. | `CONDITIONAL_UNVERIFIED` | Confirm enabled status first; if active, reconcile service, region, operational metadata, retention, DPA and transfer terms. |
| Malware/content scanning provider | Repository requires a production malware-scanner provider for enterprise uploads when that functionality is enabled, but this register does not contain current external provider identity evidence. | `UNKNOWN_CURRENT` | Not reconciled in this snapshot. | `CONDITIONAL_UNVERIFIED` | Confirm actual provider, enabled scope, content/data categories, region, retention, DPA/transfer terms. Technical runtime ownership remains Chat 1. |
| AI/model provider used by RISCK COMPLY itself | Canonical `.env.example` contains no dedicated AI/model-provider credential/configuration group, and repository search at this baseline found no direct OpenAI/Anthropic/Gemini/Mistral/Cohere/Groq integration. This does **not** prove production absence. | `UNKNOWN_CURRENT` | N/A until an actual provider is identified. | `FOUNDER_FACT_REQUIRED` | Authorised officer must confirm whether any AI provider processes customer content, model/provider identity, retention/training posture, DPA/transfer terms, and whether the correct result is genuinely N/A. |

## Stale evidence explicitly rejected as current provider proof

`docs/security/evidence/runtime/production-secrets-provider-stores.json` remains useful as a historical inventory of provider-store variable names, but it is dated 2026-06-21 and bound to commit `8389985112ec23f0e058a75a48b789a5f7a9b8d6`. It must not be used by itself to claim current provider enablement, current DPA status, current region, current retention, or final release coverage. Current runtime evidence above may supersede the enablement portion for a named provider without making the old artifact current for its other claims.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- subprocessor authorisation, advance notice and objection model;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language;
- whether a provider is legally a processor, subprocessor, independent controller or another role for a particular data flow.

Public provider terms may support factual due diligence, but they are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## Exact-SHA / release treatment

Configuration facts tied to a deployment or repository baseline must be revalidated if the final release changes materially. Provider contract/DPA evidence should record its own document/version/effective date and does not become stale solely because application code changes; material changes in data flows, enabled providers, regions, retention or service scope require reconciliation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: IN_REVIEW`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
