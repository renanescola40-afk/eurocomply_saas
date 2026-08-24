# Subprocessors register

Status: enterprise review draft. This file must be verified before being incorporated into a final DPA or represented as counsel-approved contractual language.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers and operational services that may process customer data, authentication data or operational metadata for RISCK COMPLY. Technical activity is separate from legal classification: runtime presence does not itself prove that a provider is legally a subprocessor, that an applicable DPA has been accepted, or that final region, retention or transfer treatment has been approved.

## Current draft list

| Provider | Service category | Data category | Current attributable evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting, deployment and edge/runtime delivery | Application traffic, deployment metadata, logs | Current retained Production deployment `dpl_HjY8HsY874YjSDzUs9m1z9yxqWpC` is `READY` on `main@7c5f344d...`; connected team is Pro. Standard Pro DPA/SCC framework is provider-published and plan-matched. | Current runtime proven / Pro proven / account-custom agreement and legal interpretation open |
| Supabase | Database, authentication, storage and RLS | Customer data, organization data, documents, auth metadata | Production project is `ACTIVE_HEALTHY` in `eu-west-1`; connected organization is Pro; standard DPA framework is provider-confirmed/published. | Runtime active / Ireland region proven / Pro proven / PITR and legal residuals open |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | LIVE account is attributable; country is Portugal; account is standard and configured with `business_type=individual`; charges/payouts enabled. | LIVE control plane proven / operator-entity alignment open |
| Google OAuth / Google Identity | Optional user authentication / identity federation | Authentication identifiers and provider-returned profile metadata | Production Auth contains non-zero Google-provider identities from an aggregate non-PII query; application source uses Supabase Google OAuth. | Production use proven / final legal role, DPA, region, retention and transfer treatment open |
| Google Workspace | Corporate email and business communications | Corporate/support contacts, message metadata, message content and attachments where used | `risckcomply.com` has account-specific Google Workspace Business Starter billing evidence with 2 licenses; billed EMEA provider entity is Google Cloud EMEA Limited; corporate mailboxes are used for support, security, procurement and legal communications. | Account service/entity/plan proven / Workspace CDPA-SCC framework general / exact account incorporation, region, retention and legal role open |
| GitHub / GitHub Actions | Source delivery, CI/CD and protected recovery/security workflows | Source/workflow metadata, security artifacts and transient Production data during protected recovery | Repository/CI use proven; protected recovery jobs can transiently process Production database data on hosted runners while only redacted evidence JSON is intentionally retained as artifact. Repository is owned by a Personal User account. | Material operational provider / company-account DPA applicability and legal role open |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Retained exact-current Production proof shows `sentry-environment=production` and `sentry-release=7c5f344d...` on deployment `dpl_HjY8...`. | Exact-current runtime proven / retained evidence / organization region, retention and DPA acceptance open |
| PostHog | Product analytics | Analytics events and identifiers when consent/configuration allows capture | Production client targets EU endpoints. Connected assurance project has no ingested event and is not the Production project. Human provider support states EU Cloud is Frankfurt. | EU endpoint binding proven / Production account recovery & DPA open |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Historical real delivery is independently evidenced; provider standard DPA/SCC/subprocessor/deletion framework is established. No attributable exact-current-release send is retained. | Historical use proven / current exact-release binding and account acceptance open |
| Upstash | Distributed Redis rate limiting and security-control state | Operational request/control metadata and identifiers | Retained exact-current Production proof shows canonical `/api/billing/catalog` returned 200 on `dpl_HjY8...` / `7c5f344d...`; that route traverses the fail-closed billing Redis limiter before the normal response. | Exact-current runtime proven / retained evidence / account plan, region, retention and account-specific acceptance open |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Runtime policy supports/requires provider-backed scanning when the feature is enabled; exact-current provider identity/binding is not established. | Conditional / current provider binding unverified |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs | Operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Founder operational fact captured / customer-content use and legal role open |

## Retained exact-current evidence

- Upstash: `docs/trust/evidence/2026-08-24-upstash-exact-current-runtime-reproof.md`
- Sentry: `docs/trust/evidence/2026-08-24-sentry-exact-current-runtime-reproof.md`

## Superseded factual statements

Do not report these historical states as current:

- Vercel `hobby` — superseded by connected Pro evidence.
- Supabase `free` — superseded by connected Pro evidence.
- Stripe account country unknown — superseded by attributable Portugal account evidence.
- Sentry predecessor-release binding — superseded by retained exact-current `7c5f344d...` Production evidence.
- PostHog EU endpoint binding unknown — superseded by current Production client evidence.
- Upstash predecessor-only/current-reproof-open wording — superseded by retained exact-current `/api/billing/catalog` proof on `7c5f344d...`.
- Google OAuth merely configured/unproven — superseded by non-zero aggregate Production identity evidence.
- Google Workspace operational use unknown — superseded by account-specific Business Starter billing evidence and active corporate-mail use.

## Factual provider-material boundary

Provider-public legal/security materials reduce factual uncertainty but do not automatically prove the exact account agreement, DPA acceptance actor/timestamp, retention setting, transfer treatment or final legal role. Account-specific evidence and qualified legal conclusions remain separate requirements.

Google OAuth is intentionally described as an identity provider rather than automatically labelled a subprocessor. Google Workspace is intentionally listed as a separate operational communications provider because real corporate mailboxes process support/security/procurement/legal communications. GitHub Actions is intentionally described as a material operational provider because protected recovery workflows can process Production data transiently. Counsel must determine the final contractual/privacy role allocation.

The PostHog row remains explicit: Production integration is technically attributable while the connected assurance account is not the Production account.

For Resend and the malware scanner, current exact-release/account evidence must not be inferred from repository configuration or historical evidence alone.

## Customer notice draft

Customers should receive notice before adding a material provider/subprocessor that processes customer personal data when required by the final approved DPA/agreement. Final notice period, authorisation model, objection grounds and remedies require qualified legal approval.

## Guardrail

1. Confirm active providers before each enterprise disclosure.
2. Separate runtime/configuration proof from account/legal approval.
3. Confirm provider legal entity, purpose, data categories, region/location and retention/deletion behavior where applicable.
4. Confirm account-specific DPA/SCC/transfer and provider-notice status where applicable.
5. Obtain qualified legal role allocation before labelling ambiguous providers as controller, processor or subprocessor.
6. Revalidate runtime evidence after material provider, region, data-flow or service-scope changes.
7. Archive the version disclosed to each customer with the related agreement/DPA version.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed provider review register. Technical Production facts are reconciled separately from legal interpretation. Final contractual commitments depend on the services actually enabled, account-specific provider agreements/DPAs where applicable, approved transfer and retention treatment, qualified legal review and the signed customer agreement."

## Final boundary

Do not claim a complete counsel-approved subprocessor program, GDPR compliance, approved international-transfer posture, completed independent pentest, final DPA, tested Production RPO/RTO, or provider account-contract coverage until the corresponding attributable evidence and qualified review are complete.
