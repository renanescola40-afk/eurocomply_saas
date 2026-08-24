# Subprocessors register

Status: enterprise review draft. This file must be verified before being incorporated into a final DPA or represented as counsel-approved contractual language.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, current connector-observation ledger `docs/trust/evidence/2026-08-24-external-assurance-runtime-provider-revalidation.md`, canonical External Assurance issue `#1727`, and current Production serving outage `#1814`.

## Purpose

This register lists providers that may process customer data or operational metadata for RISCK COMPLY. Technical activity is separate from legal classification: runtime presence does not itself prove an applicable DPA, final controller/processor/subprocessor role, approved retention term or transfer mechanism.

## Current draft list

| Provider | Service category | Data category | Current attributable evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | Current Production deployment `dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx` reached `READY` and is bound to protected `main@75151c463ea7bf54c74e4dc9e5cd3af995615eae`; however project state is `live=false` and the canonical `/api/health` returns HTTP `402 DEPLOYMENT_DISABLED`. Connected team is `pro`; the build itself completed successfully. | Deployment ready / Pro proven / Production serving blocked by #1814 / legal interpretation incomplete |
| Supabase | Database, authentication and storage | Customer data, organization data, documents, auth metadata | Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY` in `eu-west-1`; connected organization is `pro`; standard provider DPA/SCC framework is separately evidenced. Pre-V19 application/schema compatibility issue #1778 is closed via merged #1780 without Production DDL. | Runtime active / region proven / Pro proven / pre-V19 compatibility closed / legal review incomplete |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | LIVE account `RISCK COMPLY SAAS` is attributable; country is Portugal; account is standard and currently configured with `business_type=individual`; charges and payouts are enabled. Sensitive KYC data is intentionally excluded. | LIVE control plane proven / operator-entity alignment open |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Repository and CI usage are established; repository is public and owned by a personal GitHub account. | Repository usage proven / applicable account-contract facts open |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | The last attributable serving evidence baseline `b8b099...` exposed exact Sentry release binding and proved runtime attribution for that serving release. The later current Vercel deployment is disabled before application traffic reaches runtime, so fresh current-serving-release Sentry proof is not yet available. Human support established the self-service assurance-material boundary. | Attributable serving-baseline binding proven / current serving reproof blocked by #1814 / organization region and DPA acceptance open |
| PostHog | Product analytics | Analytics events and identifiers when consent/configuration allows capture | Attributable Production client evidence targets EU PostHog endpoints. The connected assurance account exposes a different `Default project` with no ingested event and must not be treated as Production. Human provider support states EU Cloud is Frankfurt and account-linked DPA generation is available from the Legal page. | EU endpoint binding proven / Production account recovery & DPA open |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Historical use and standard provider DPA/terms material exist; no attributable current exact-serving-release send/runtime binding was observed in the latest check. | Historical use proven / current exact-serving-release binding open |
| Upstash | Distributed Redis rate limiting and security-control state | Operational request/control metadata and identifiers | Historical predecessor-release runtime binding is proven. The latest attributable serving baseline did not produce exact-release Redis execution proof, and the current Vercel deployment is disabled before application runtime. | Historical binding proven / current exact-serving-release reproof and account facts open |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Provider-backed scanning is required by runtime policy for enabled enterprise uploads; current exact-serving-release provider identity/binding is not established. | Conditional / current binding unverified |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs | Operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Founder operational fact captured / legal role and customer-content policy open |

## Superseded factual statements

Do not report the following historical states as current:

- Vercel `hobby` — superseded by connected `pro` plan evidence. The separate Production serving outage #1814 remains open.
- Supabase `free` — superseded by connected `pro` plan evidence.
- Stripe account country unknown — superseded by attributable Portugal account evidence.
- Sentry binding unknown — superseded for the last attributable serving evidence baseline; fresh current-serving-release reproof is blocked by #1814 and must not be claimed until Production serves again.
- PostHog EU endpoint binding unknown — superseded by attributable Production client configuration evidence.
- Supabase pre-V19 runtime compatibility #1778 open — superseded by merged #1780; #1778 is closed and must not be reported as current.

## Factual provider-material boundary

Provider-public legal/security materials reduce factual uncertainty but do not automatically prove the exact account agreement, DPA acceptance, retention setting, transfer treatment or final legal role. Account-specific evidence and qualified legal conclusions remain separate requirements.

The PostHog row is intentionally explicit: the Production integration is technically attributable while the connected assurance account is proven to be the wrong project for Production account/legal evidence.

For Upstash and Resend, historical or repository evidence must not be promoted to current exact-serving-release proof until an attributable current runtime/account observation exists.

For Vercel, `READY` build/deployment metadata must not be promoted to application availability while project state is `live=false` and canonical health returns HTTP `402 DEPLOYMENT_DISABLED`.

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data when required by the final approved DPA/agreement. Final notice period, authorisation model, objection grounds and remedies require qualified legal approval.

## Guardrail

1. Confirm active providers before each enterprise disclosure.
2. Separate runtime/configuration proof from account/legal approval.
3. Confirm provider legal entity, DPA/account applicability, region, retention/deletion and transfer treatment where applicable.
4. Confirm actual data categories and whether customer personal data is processed.
5. Revalidate runtime evidence after material provider, region, data-flow, service-scope or Production-serving-state changes.
6. Archive the version disclosed to each customer with the related agreement/DPA version.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed provider review register. Technical Production facts are reconciled separately from legal interpretation. Final contractual commitments depend on the services actually enabled, account-specific provider agreements/DPAs where applicable, approved transfer and retention treatment, qualified legal review and the signed customer agreement."

## Final boundary

Do not claim a complete subprocessor program, GDPR compliance, approved international-transfer posture, completed independent pentest, final DPA, tested Production RPO/RTO, provider account-contract coverage, or current Production availability until the corresponding attributable evidence and qualified review are complete.
