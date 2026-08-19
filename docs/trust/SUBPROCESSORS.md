# Subprocessors register

Status: enterprise review draft. This file must be verified before being shared with customers or incorporated into a DPA.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers that may process customer data or operational metadata for Risck comply. Keep it current before signing a customer agreement or answering a procurement questionnaire.

A provider may be marked factually active only from attributable current evidence. A repository environment-variable template is not runtime proof, and the existence of a provider's public DPA is not proof that the RISCK COMPLY account has accepted or is covered by it.

## Current draft list

| Provider | Service category | Data category | Current factual evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | Connected project `eurocomply-saas`; current production-target deployment is `READY`, exact Git SHA `3ad7a6c5c11a69b9c7f61115672278b05e84f984`, function region `iad1`. Contract/DPA applicability and transfer treatment remain unresolved. | Partial factual evidence |
| Supabase | Database, authentication and storage | Customer data, organization data, documents, auth metadata | Connected production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY` in `eu-west-1` (West EU / Ireland per current provider region documentation). DPA/account and plan-specific retention facts remain unresolved. | Partial factual evidence |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | Connected Stripe account exists with display name `risck comply`. Exact contracting entity, DPA/account applicability, region/transfer and retention details remain unresolved. Billing runtime evidence remains Chat 3-owned. | Partial factual evidence |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Repository and CI usage are current. Customer-data role, contractual/DPA and retention/transfer treatment still require reconciliation where applicable. | Partial factual evidence |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Current production HTML exposes Sentry trace metadata for `environment=production` and release `3ad7a6c5c11a69b9c7f61115672278b05e84f984`; current CSP permits Sentry ingestion. Provider legal entity/region/retention/DPA/transfer facts remain unresolved. | Current runtime enabled / legal facts incomplete |
| PostHog | Product analytics if enabled | Consented analytics events and identifiers | Current production layout includes the PostHog analytics provider and analytics-consent banner, and CSP permits EU PostHog hosts. No active project key or transmitted-event evidence is established here. | Runtime component present / enablement unverified |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Repository supports Resend-backed delivery; current external account/provider evidence is not yet reconciled here. | Conditional / unverified |
| Upstash | Redis, rate limiting or cache if enabled | Operational metadata | Canonical configuration supports Upstash, but current production enablement is not proven by this register. | Conditional / unverified |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Provider-backed scanner is required by runtime policy for enabled enterprise uploads; current provider identity/legal facts are not yet reconciled here. | Conditional / unverified |
| AI/model provider used by RISCK COMPLY | Optional AI-assisted features | Prompts, outputs and permitted customer content | No dedicated AI/model-provider configuration group or direct common provider integration was found in the current repository baseline. This is not production-absence proof; authorised-officer confirmation is still required. | Founder fact required |

## Factual provider-material boundary

Current provider-public materials were reviewed for Vercel, Supabase and Stripe. They show that provider DPA/privacy/transfer materials exist, but they do not prove the exact RISCK COMPLY account agreement, contracting entity, applicable version, or legal sufficiency. Those account-level facts and legal conclusions remain required before contractual disclosure.

See `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` for the evidence snapshot and unresolved fields.

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data. Final notice period, authorisation model, objection grounds and remedies must be approved by qualified legal counsel and reflected in the applicable agreement/DPA.

## Guardrail

1. Review this register before each enterprise contract or security questionnaire.
2. Confirm which providers are actually enabled in the target environment.
3. Confirm provider legal entity, DPA/account applicability, security documentation, region, retention/deletion posture and transfer mechanism where applicable.
4. Confirm data categories and whether customer personal data is processed.
5. Update the public Trust Center and procurement packet only after the disclosure is factually and legally approved.
6. Archive the version disclosed to each customer with the related DPA/agreement version.
7. Revalidate deployment/configuration facts when a material provider, region, data flow or final release dependency changes.

## Customer-safe answer

"Risck comply maintains an evidence-backed draft register for infrastructure, authentication/database/storage, billing, source control/CI, and conditional observability/cache/email/analytics providers. Production provider facts are reconciled separately from legal interpretation. Final contractual commitments depend on the active production services, applicable provider agreements/DPAs, approved transfer and retention treatment, and the signed customer agreement."

## Guardrail

Do not claim a complete subprocessor program, GDPR compliance, approved international-transfer posture, or a final DPA until provider account facts, regions, retention/deletion terms, applicable DPAs/transfer mechanisms, customer-notice procedures and qualified legal review are complete.
