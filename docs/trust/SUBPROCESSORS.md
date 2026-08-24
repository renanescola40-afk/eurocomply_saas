# Subprocessors register

Status: enterprise review draft. This file must be verified before being incorporated into a final DPA or represented as counsel-approved contractual language.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, current connector-observation ledger `docs/trust/evidence/2026-08-24-external-assurance-runtime-provider-revalidation.md`, and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers that may process customer data or operational metadata for RISCK COMPLY. Technical activity is separate from legal classification: runtime presence does not itself prove an applicable DPA, final controller/processor/subprocessor role, approved retention term or transfer mechanism.

## Current draft list

| Provider | Service category | Data category | Current attributable evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | Production deployment for runtime subject `b8b099b9018f0be0de8f419d4c7d4a8629700d42` was observed `READY`; canonical aliases are active; `/api/health` returned `200`; connected team is `pro`. | Runtime active / Pro proven / legal interpretation incomplete |
| Supabase | Database, authentication and storage | Customer data, organization data, documents, auth metadata | Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY` in `eu-west-1`; connected organization is `pro`; standard provider DPA/SCC framework is separately evidenced. | Runtime active / region proven / Pro proven / legal review incomplete |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | LIVE account `RISCK COMPLY SAAS` is attributable; country is Portugal; account is standard and currently configured with `business_type=individual`; charges and payouts are enabled. Sensitive KYC data is intentionally excluded. | LIVE control plane proven / operator-entity alignment open |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Repository and CI usage are established; repository is public and owned by a personal GitHub account. | Repository usage proven / applicable account-contract facts open |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Production response exposes exact current Sentry release `b8b099...`; current-release runtime binding is proven. Human support established the self-service assurance-material boundary. | Current release binding proven / organization region and DPA acceptance open |
| PostHog | Product analytics | Analytics events and identifiers when consent/configuration allows capture | Production client targets EU PostHog endpoints. The connected assurance account exposes a different `Default project` with no ingested event and must not be treated as Production. Human provider support states EU Cloud is Frankfurt and account-linked DPA generation is available from the Legal page. | EU endpoint binding proven / Production account recovery & DPA open |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Historical use and standard provider DPA/terms material exist; no attributable exact-current-release send/runtime binding was observed in the latest check. | Historical use proven / current exact-release binding open |
| Upstash | Distributed Redis rate limiting and security-control state | Operational request/control metadata and identifiers | Historical predecessor-release runtime binding is proven. Current-release safe probing did not reach the Redis-backed path and scoped logs did not provide current-release execution proof. | Historical binding proven / current exact-release reproof and account facts open |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Provider-backed scanning is required by runtime policy for enabled enterprise uploads; current exact-release provider identity/binding is not established. | Conditional / current binding unverified |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs | Operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Founder operational fact captured / legal role and customer-content policy open |

## Superseded factual statements

Do not report the following historical states as current:

- Vercel `hobby` — superseded by connected `pro` plan evidence.
- Supabase `free` — superseded by connected `pro` plan evidence.
- Stripe account country unknown — superseded by attributable Portugal account evidence.
- Sentry current-release binding unknown — superseded by exact current release tracing evidence.
- PostHog EU endpoint binding unknown — superseded by current Production bundle evidence.

## Factual provider-material boundary

Provider-public legal/security materials reduce factual uncertainty but do not automatically prove the exact account agreement, DPA acceptance, retention setting, transfer treatment or final legal role. Account-specific evidence and qualified legal conclusions remain separate requirements.

The PostHog row is intentionally explicit: the Production integration is technically attributable while the connected assurance account is proven to be the wrong project for Production account/legal evidence.

For Upstash and Resend, historical or repository evidence must not be promoted to current exact-release proof until an attributable current runtime/account observation exists.

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data when required by the final approved DPA/agreement. Final notice period, authorisation model, objection grounds and remedies require qualified legal approval.

## Guardrail

1. Confirm active providers before each enterprise disclosure.
2. Separate runtime/configuration proof from account/legal approval.
3. Confirm provider legal entity, DPA/account applicability, region, retention/deletion and transfer treatment where applicable.
4. Confirm actual data categories and whether customer personal data is processed.
5. Revalidate runtime evidence after material provider, region, data-flow or service-scope changes.
6. Archive the version disclosed to each customer with the related agreement/DPA version.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed provider review register. Technical Production facts are reconciled separately from legal interpretation. Final contractual commitments depend on the services actually enabled, account-specific provider agreements/DPAs where applicable, approved transfer and retention treatment, qualified legal review and the signed customer agreement."

## Final boundary

Do not claim a complete subprocessor program, GDPR compliance, approved international-transfer posture, completed independent pentest, final DPA, tested Production RPO/RTO, or provider account-contract coverage until the corresponding attributable evidence and qualified review are complete.
