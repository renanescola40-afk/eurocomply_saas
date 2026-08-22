# Subprocessors register

Status: enterprise review draft. This file must be verified before being incorporated into a final DPA or represented as counsel-approved contractual language.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, current connector-observation ledger `docs/trust/evidence/2026-08-22-external-assurance-runtime-provider-revalidation.md`, and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers that may process customer data or operational metadata for RISCK COMPLY. Keep it current before signing a customer agreement or answering a procurement questionnaire.

A provider may be marked **factually active** only from attributable evidence. Technical activity is separate from legal classification: runtime presence does not by itself prove an applicable DPA, contracting entity, approved processing region, retention term, transfer mechanism or final subprocessor role.

Release-bound provider statements use a **runtime evidence subject SHA**: the deployed application state actually observed. The later Git commit that stores this document may differ because documentation itself creates a new commit. That difference alone does not prove a new deployment and does not automatically invalidate the captured provider fact.

## Current draft list

| Provider | Service category | Data category | Captured factual evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | On 2026-08-22, target-production deployment `dpl_HNt5846gxC36eaEZbynqJTu69GFN` was observed as `READY`, bound to runtime evidence subject `3a3382e385eb54f8e706e31046c8b7d497057527`; `/pt/trust` returned HTTP `200`. The connected team remains on plan `hobby`. | Runtime active / plan mismatch open / legal facts incomplete |
| Supabase | Database, authentication and storage | Customer data, organization data, documents, auth metadata | Connected Production project `tganhbbhfxcpblmgqprg` remains in `eu-west-1`; the connected organization remains on plan `free`. Provider DPA framework evidence exists separately, while customer-accessible recovery/PITR entitlement and final resilience claims remain unresolved. | Runtime active / region proven / Free-plan resilience open / legal review incomplete |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | Connected LIVE account identity is `RISCK COMPLY SAAS`; LIVE Products/Prices and webhook control-plane evidence exist, but a genuine customer subscription/checkout lifecycle has not been proven. The connector does not expose account country in the retained evidence. | LIVE control plane proven / real customer lifecycle open / applicable DPA entity open |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Repository and CI usage are established. The repository is public and owned by a personal GitHub account; no Team/Enterprise contract is proven. | Repository usage proven / applicable account-contract facts open |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Current Production `/pt/trust` for runtime subject `3a3382e385eb54f8e706e31046c8b7d497057527` exposes `sentry-environment=production` and the exact current release. Client guardrails disable default PII and replay sampling. Organization region and account-level contractual facts remain unresolved. | Runtime instrumentation proven / account region & legal facts incomplete |
| PostHog | Product analytics | Analytics events and identifiers when consent/configuration allows capture | Current Production bundle contains a populated PostHog project identifier and EU service endpoints. The only project exposed by the connected assurance account is a different project created on 2026-08-22 with no proven ingestion; exact identifiers are intentionally omitted. | Production binding present / connected assurance project mismatch / account facts open |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Repository supports Resend-backed delivery and historical RISCK COMPLY deliveries exist, but no attributable current exact-release Production send/account binding was established in the 2026-08-22 revalidation. | Historical use proven / current Production binding open |
| Upstash | Distributed Redis rate limiting and security-control state | Operational request/control metadata and identifiers | On runtime subject `3a3382e385eb54f8e706e31046c8b7d497057527`, a high-risk endpoint returned the normal HTTP `429` exhausted-limit response with rate-limit headers. The Production control is designed to return `503 security_control_unavailable` if Redis is missing or unavailable, so this observation proves the distributed Redis runtime binding was available for the request. | Runtime binding proven / account plan, region, retention, DPA & transfer facts open |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Provider-backed scanning is required by runtime policy for enabled enterprise uploads; historical scanner evidence exists, but current exact-release provider binding/identity is not established here. | Conditional / current binding unverified |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs; customer content only where manually supplied by the founder | Owner declaration identifies ChatGPT/OpenAI operational use outside direct SaaS runtime. Current evidence does not establish a Business/Enterprise/API no-training posture or a processor/subprocessor role for that workflow. | Founder fact captured / legal role and customer-content policy unapproved |

## Factual provider-material boundary

Provider-public legal/security materials reduce factual uncertainty but do not prove the exact RISCK COMPLY account agreement, contracting entity, plan, applicable version, DPA acceptance, processing configuration, or legal sufficiency. Account-level evidence and qualified legal conclusions remain separate requirements before contractual disclosure.

The Upstash and PostHog rows are intentionally explicit examples of this boundary: Upstash is technically proven active while its account/legal facts remain open; PostHog is technically present in Production while the currently connected assurance account is proven to be the wrong project for Production-specific account evidence.

For founder-operated ChatGPT use, current factual evidence does not establish a processor/subprocessor legal role, DPA coverage, acceptable customer-content policy, retention/deletion posture or transfer treatment. Qualified legal review must decide whether customer content may enter that workflow, requires a Business/Enterprise/API arrangement, or must be excluded.

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data when required by the final approved DPA/agreement. Final notice period, authorisation model, objection grounds and remedies must be approved by qualified legal counsel.

## Guardrail

1. Review this register before each enterprise contract or security questionnaire.
2. Confirm which providers are actually enabled in the target environment or used operationally outside runtime where customer data may be supplied.
3. Separate **runtime/configuration proof** from **account/legal approval**.
4. Confirm provider legal entity, DPA/account applicability, security documentation, region, retention/deletion posture and transfer mechanism where applicable.
5. Confirm data categories and whether customer personal data is processed.
6. Update the public Trust Center and procurement packet when attributable evidence changes; do not wait for legal conclusions to correct a false technical fact.
7. Archive the version ultimately disclosed to each customer with the related DPA/agreement version.
8. Revalidate runtime evidence when a material provider, region, data flow, configuration or service scope changes, or before describing a newer release as live.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed review register for infrastructure, authentication/database/storage, billing, observability, analytics, distributed security controls, email/scanning providers and relevant founder-operated external services. Technical Production facts are reconciled separately from legal interpretation. Final contractual commitments depend on active services, account-specific provider agreements/DPAs, approved transfer and retention treatment, qualified legal review and the signed customer agreement."

## Final boundary

Do not claim a complete subprocessor program, GDPR compliance, approved international-transfer posture, completed independent pentest, final DPA, tested Production RPO/RTO, or provider account-contract coverage until the corresponding attributable evidence and qualified review are complete.
