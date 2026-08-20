# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-20  
**Repository snapshot:** `main@127aed7e954d75ea71f20cfbeb0fb3ed4212615c`  
**Production READY snapshot:** `127aed7e954d75ea71f20cfbeb0fb3ed4212615c`  
**Canonical tracker:** GitHub issue `#1727`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, or proof that every public provider term applies to the RISCK COMPLY account.

## Evidence rules

A provider row may be promoted only from attributable evidence. Repository configuration alone does not prove production enablement. A public DPA alone does not prove that the RISCK COMPLY account accepted or is covered by it.

Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private contracts, or unnecessary client identifiers in this register.

## Current factual reconciliation

| Provider / service | Production/configuration fact currently supported | Region / location fact | Current evidence state | Still required before contractual disclosure |
| --- | --- | --- | --- | --- |
| Vercel | Connected project `eurocomply-saas` has target-production deployment `dpl_DdzMcjbdpbLqkK6FS9cNLX2VxPTB` in `READY`, bound to exact `main@127aed7e954d75ea71f20cfbeb0fb3ed4212615c`; aliases include `risckcomply.com` and `www.risckcomply.com`. | Deployment reports function-region signal `iad1`; this is a runtime-location fact, not a legal transfer conclusion. | `CURRENT_RUNTIME_ENABLED / EXACT_MAIN_LIVE / LEGAL_FACTS_INCOMPLETE` | Confirm actual account plan/agreement, contracting entity, DPA applicability/acceptance, relevant subprocessor snapshot, retention/deletion terms and approved transfer treatment. |
| Supabase | Connected production project/ref `tganhbbhfxcpblmgqprg`, name `eurocomply_saas`, was revalidated on 2026-08-20 as `ACTIVE_HEALTHY`. | Project region is `eu-west-1` (West EU / Ireland per provider region documentation). | `PARTIAL_FACTUAL_EVIDENCE` | Confirm contracted entity, actual DPA/account reference, plan-specific backup/log retention, transfer/subprocessor terms, storage behavior and customer-notice obligations. |
| Stripe | Connected-provider inspection on 2026-08-20 returns account display name `RISCK COMPLY SAAS`. PR `#1732` versioned this account as intended LIVE provider authority and PR `#1734` hardened the Vercel secret-type/authority path. Those facts do **not** prove successful LIVE bootstrap, webhook setup, Vercel rebinding, provider runtime proof, or a genuine customer billing lifecycle; those remain Billing-stream owned. | Current connector evidence retained here does not establish processing/storage region or contracting entity. | `ACCOUNT_IDENTITY_RECONCILED / LIVE_RUNTIME_CUTOVER_UNPROVEN / LEGAL_FACTS_INCOMPLETE` | Confirm account location, contracting Stripe entity, exact applicable agreement/DPA version, enabled-service data categories, retention/deletion posture and transfer/subprocessor applicability. Billing must separately prove post-merge LIVE lifecycle before billing-runtime PASS. |
| GitHub | Repository `renanescola40-afk/eurocomply_saas` and CI/repository workflows are actively used. | No customer-data processing region specific to this account is established here. | `PARTIAL_FACTUAL_EVIDENCE` | Confirm account/plan and applicable DPA/terms, contractual entity, relevant data categories, workflow/artifact retention and transfer treatment where applicable. |
| Sentry | Current production HTML revalidated on 2026-08-20 exposes `sentry-environment=production` and `sentry-release=127aed7e954d75ea71f20cfbeb0fb3ed4212615c`; production CSP permits Sentry ingestion domains. This is current runtime evidence for the live release. | Sentry publicly supports US/Germany storage locations, but the current RISCK COMPLY organization region is not established here. | `CURRENT_RUNTIME_ENABLED / EXACT_MAIN_LIVE / LEGAL_FACTS_INCOMPLETE` | Confirm organization/project ownership, actual organization region, provider legal entity, scrubbing/data categories, retention, DPA/subprocessor/transfer terms and account applicability. Runtime configuration remains Chat 1-owned. |
| PostHog | Current production delivery contains `PostHogAnalyticsProvider` and `AnalyticsConsentBanner`, while CSP permits EU PostHog ingestion/assets endpoints. These facts do **not** establish that the production project key is populated, that consent-required mode is enabled, or that events are currently transmitted. | CSP allowlists EU endpoints, but allowlisting alone does not prove active processing or account region. | `RUNTIME_COMPONENT_PRESENT / ENABLEMENT_AND_CONSENT_UNVERIFIED` | Confirm whether the production PostHog project key is populated and whether consent-required mode is enabled; if active, confirm account/project ownership, contractual entity, DPA applicability, project region/retention, event categories, legal consent policy and transfer/subprocessor treatment. |
| Resend / transactional email | Repository and `.env.example` support Resend-backed delivery. A prior scoped production-log search returned no matching `resend` entries; absence of logs is not absence proof. | Current account/runtime region is unproven. | `CONDITIONAL_UNVERIFIED / PROVIDER_PUBLIC_MATERIAL_AVAILABLE` | Confirm production enablement first; if active, establish account/legal entity, applicable agreement/DPA, message data, retention and transfer/subprocessor treatment. |
| Upstash / Redis | Canonical configuration supports conditional Upstash Redis use. No current external account evidence is retained here. | `UNKNOWN_CURRENT` | `CONDITIONAL_UNVERIFIED` | Confirm enabled status; if active, reconcile service, region, operational metadata, retention, DPA/account and transfer terms. |
| Malware/content scanning provider | Repository policy requires a production malware-scanner provider for enabled enterprise uploads, but current external provider identity evidence is not retained here. | `UNKNOWN_CURRENT` | `CONDITIONAL_UNVERIFIED` | Confirm actual provider, enabled scope, data categories, region, retention and DPA/transfer terms. Technical runtime ownership remains Chat 1. |
| AI/model provider used by RISCK COMPLY itself | Canonical configuration/repository review has not established a direct AI/model provider in production. This does **not** prove production absence. | `UNKNOWN_CURRENT` | `FOUNDER_FACT_REQUIRED` | Authorised officer must confirm whether any AI provider processes customer content, provider identity, retention/training posture, DPA/transfer terms, and whether N/A is genuinely correct. |

## Provider-public material boundary

Public provider legal/security material is useful factual due diligence but does not prove the exact RISCK COMPLY account agreement, contracting entity, plan, applicable version, DPA acceptance, processing configuration, or legal sufficiency. Account-level evidence and qualified legal conclusions remain separate requirements.

## Stale evidence explicitly rejected as current provider proof

`docs/security/evidence/runtime/production-secrets-provider-stores.json` is historical inventory evidence dated 2026-06-21 and must not be used by itself to claim current enablement, DPA status, region, retention or final-release coverage.

The provider snapshots bound to `main@3ad7a6c5c11a69b9c7f61115672278b05e84f984` and `main@d4549aa92938f2ed9bfb0de7cac884a70f80e187` remain provenance only for their respective capture points. Current release-bound Vercel/Sentry facts above are bound to exact live `main@127aed7e954d75ea71f20cfbeb0fb3ed4212615c`.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- subprocessor authorisation, notice and objection model;
- analytics/cookie/consent legal requirements and final notice wording;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language;
- provider legal role for a particular data flow.

## Exact-SHA / release treatment

Repository `main` and the currently READY production release must be tracked separately. A repository SHA must not be described as live until its production deployment reaches a successful terminal state and release-bound evidence is revalidated. In this snapshot both are aligned at `127aed7e954d75ea71f20cfbeb0fb3ed4212615c`.

Provider contract/DPA evidence has its own document/version/effective-date scope and does not become stale solely because application code changes. Material changes in data flows, enabled providers, regions, retention or service scope require reconciliation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: IN_REVIEW`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
