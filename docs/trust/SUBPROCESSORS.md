# Subprocessors register

Status: enterprise review draft. This file must be verified before being shared with customers or incorporated into a DPA.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, connector-observation ledger `docs/trust/evidence/2026-08-21-external-assurance-runtime-provider-revalidation.md`, and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers that may process customer data or operational metadata for RISCK COMPLY. Keep it current before signing a customer agreement or answering a procurement questionnaire.

A provider may be marked factually active only from attributable evidence. A repository environment-variable template is not runtime proof, and the existence of a provider's public DPA is not proof that the RISCK COMPLY account accepted or is covered by it.

Release-bound provider statements use a **runtime evidence subject SHA**: the deployed application state actually observed. The later Git commit that stores this document may differ because documentation itself creates a new commit. That difference alone does not prove a new deployment and does not automatically invalidate the captured provider fact.

## Current draft list

| Provider | Service category | Data category | Captured factual evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | On 2026-08-21, target-production deployment `dpl_5gJQQGGTKjGG3QJxQ3K87ArMqjDy` was observed as `READY`, bound to runtime evidence subject `b54afdfd6370442e7c7924f31d6210841621cf38`. Connected production fetches of `/pt/trust`, `/pt/security`, and `/pt/status` returned HTTP `200`. Contract/DPA applicability, legal processing region and transfer treatment remain unresolved. | Runtime evidence captured / legal facts incomplete |
| Supabase | Database, authentication and storage | Customer data, organization data, documents, auth metadata | Connected production project `tganhbbhfxcpblmgqprg` was revalidated on 2026-08-21 as `ACTIVE_HEALTHY` in `eu-west-1`; Postgres engine `17`, database version `17.6.1.127` were observed. DPA/account and plan-specific retention facts remain unresolved. | Partial factual evidence |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | Connected Stripe account inspection on 2026-08-20 returned display name `RISCK COMPLY SAAS`. PR `#1732` established the intended LIVE provider authority and PR `#1734` hardened the Vercel Stripe secret-type boundary, but those repository changes alone do not prove LIVE activation/bootstrap, canonical webhook/Vercel rebinding, provider runtime proof, or genuine customer billing lifecycle completion. Billing runtime remains Chat 3-owned. | Account identity reconciled / LIVE runtime cutover unproven / legal facts incomplete |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Repository and CI usage are established. GitHub publishes provider DPA/subprocessor material, but the applicable RISCK COMPLY account/plan, contractual entity, retention and transfer treatment remain unresolved where relevant. | Partial factual evidence |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Live production HTML captured on 2026-08-21 for runtime evidence subject `b54afdfd6370442e7c7924f31d6210841621cf38` from `/pt/trust`, `/pt/security`, and `/pt/status` exposed Sentry `environment=production` and release `b54afdfd6370442e7c7924f31d6210841621cf38`; the captured CSP permitted Sentry ingestion. Organization region and account-level legal facts remain unresolved. | Runtime evidence captured / legal facts incomplete |
| PostHog | Product analytics | Analytics events and identifiers if enabled | Production delivery revalidated on 2026-08-21 for runtime evidence subject `b54afdfd6370442e7c7924f31d6210841621cf38` contained the PostHog analytics/consent components and the CSP permitted EU PostHog ingestion/assets endpoints. This does **not** prove that the production project key is populated, that consent-required mode is enabled, or that events are transmitted. | Runtime component present / enablement and consent unverified |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Repository supports Resend-backed delivery. A prior scoped production-log search returned no `resend` matches, which is not absence proof. Actual production enablement and RISCK COMPLY account applicability remain unverified. | Conditional / unverified; provider public material available |
| Upstash | Redis, rate limiting or cache if enabled | Operational metadata | Canonical configuration supports Upstash. RISCK COMPLY account enablement and contractual coverage are not proven here. | Conditional / unverified |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Provider-backed scanner is required by runtime policy for enabled enterprise uploads; provider identity/legal facts are not reconciled here. | Conditional / unverified |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs; customer content only where manually supplied by the founder | Owner declaration on 2026-08-20 identifies ChatGPT/OpenAI as the only external AI/model service used operationally. Repository/configuration review has not identified a direct model-provider integration in the SaaS runtime. Owner screenshot confirms the personal ChatGPT setting `Melhorar o modelo para todo mundo` is enabled. OpenAI's consumer documentation states that new personal-workspace conversations may be used for model improvement while that setting remains enabled; Business/Enterprise/API no-training-by-default commitments must not be projected onto this personal workspace. | Founder fact captured / personal-workspace model improvement enabled / direct runtime integration not identified / legal role unapproved |

## Factual provider-material boundary

Provider-public legal/security materials reduce factual uncertainty but do not prove the exact RISCK COMPLY account agreement, contracting entity, plan, applicable version, DPA acceptance, processing configuration, or legal sufficiency. Account-level evidence and qualified legal conclusions remain separate requirements before contractual disclosure.

For the founder-operated ChatGPT workflow specifically, current factual evidence does not establish a processor/subprocessor legal role, DPA coverage, acceptable customer-content policy, retention/deletion posture or transfer treatment. Qualified legal review must decide whether the current personal-workspace workflow is permissible for customer content, requires a Business/Enterprise/API arrangement, or must exclude customer content.

See `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` for the evidence snapshot, evidence-subject semantics, and unresolved fields.

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data. Final notice period, authorisation model, objection grounds and remedies must be approved by qualified legal counsel and reflected in the applicable agreement/DPA.

## Guardrail

1. Review this register before each enterprise contract or security questionnaire.
2. Confirm which providers are actually enabled in the target environment or used operationally outside the runtime where customer data may be supplied.
3. Confirm provider legal entity, DPA/account applicability, security documentation, region, retention/deletion posture and transfer mechanism where applicable.
4. Confirm data categories and whether customer personal data is processed.
5. Update the public Trust Center and procurement packet only after disclosure is factually and legally approved.
6. Archive the version disclosed to each customer with the related DPA/agreement version.
7. Revalidate runtime evidence when a material provider, region, data flow, configuration or service scope changes, or before describing a newer release as live.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed draft register for infrastructure, authentication/database/storage, billing, source control/CI, observability, analytics and conditional cache/email/scanning providers, plus founder-operated external AI usage where relevant. Production and operational provider facts are reconciled separately from legal interpretation. Final contractual commitments depend on active services and workflows, applicable provider agreements/DPAs, approved transfer and retention treatment, and the signed customer agreement."

## Final boundary

Do not claim a complete subprocessor program, GDPR compliance, approved international-transfer posture, or a final DPA until provider account facts, regions, retention/deletion terms, applicable DPAs/transfer mechanisms, customer-notice procedures and qualified legal review are complete.
