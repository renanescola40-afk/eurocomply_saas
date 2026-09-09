# Subprocessors register

Status: enterprise review draft. This file must be verified before being incorporated into a final DPA or represented as counsel-approved contractual language.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, the current overlay `docs/trust/evidence/2026-09-09-provider-current-overlay.md`, and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers and operational services that may process customer data, authentication data or operational metadata for RISCK COMPLY. Technical activity is separate from legal classification: runtime presence does not itself prove that a provider is legally a subprocessor, that an applicable DPA has been accepted, or that final region, retention or transfer treatment has been approved.

## Current draft list

| Provider | Service category | Data category | Current attributable evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting, deployment and edge/runtime delivery | Application traffic, deployment metadata, logs | Canonical public site is serving and fresh health validation succeeded, but the observed Production deployment is on an older Git release than the protected-main release captured by the current overlay. | Current public runtime proven / exact-current-main Production binding and protected provider runtime open |
| Supabase | Database, authentication, storage and RLS | Customer data, organization data, documents, auth metadata | Production project is live in `eu-west-1`; current read-only evidence shows selected V41 inventory `13/13` present live with reviewed RLS/FORCE RLS and payment-first surfaces. | V41 live schema effect proven / governed V41 promotion provenance and legal residuals open |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | Canonical LIVE account is attributable in Portugal. Platform-proof `livemode=true` Checkout events are non-crediting under the exact commercial-authority contract; legitimate LIVE subscription authority observed is `0`. | LIVE control plane proven / legitimate paying-customer lifecycle, VAT/tax and account/legal facts open |
| Google OAuth / Google Identity | Optional user authentication / identity federation | Authentication identifiers and provider-returned profile metadata | Runtime integration through Supabase Auth is implemented; exact current account legal/processing facts are not established by the current provider register. | Runtime integration present / final legal role, DPA, region, retention and transfer treatment open |
| Google Workspace | Corporate email and business communications | Corporate/support contacts, message metadata, message content and attachments where used | Corporate `risckcomply.com` mail is operational. Earlier account-specific Business Starter/EMEA evidence is retained but was not fully revalidated in the current release overlay. | Operational use current / agreement-CDPA, region, retention, transfer and legal-role facts require revalidation |
| GitHub / GitHub Actions | Source delivery, CI/CD and protected recovery/security workflows | Source/workflow metadata, security artifacts and transient Production data during protected recovery | Repository/CI use is active; protected recovery/release jobs can transiently process Production database data on GitHub-hosted runners while evidence boundaries are designed to retain only required redacted outputs. | Material operational provider / company-account DPA applicability, transfer treatment and final legal role open |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Earlier direct Production release-binding evidence is retained as historical evidence; it is not current exact-release acceptance. | Historical partial runtime binding / current protected producer plus organization region, retention and DPA facts open |
| PostHog | Product analytics | Analytics events and identifiers when consent/configuration allows capture | Production source/configuration has historically targeted EU endpoints, but the connected assurance project was not the Production project. | Connected assurance project mismatch / Production account recovery and account-linked DPA facts open |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Historical real delivery is independently evidenced; current exact-release account/provider acceptance is not credited by the current overlay. | Historical delivery proven / current exact-release binding and account acceptance open |
| Upstash | Distributed Redis rate limiting and security-control state | Operational request/control metadata and identifiers | The distributed Redis-backed integration remains implemented. Earlier direct Production catalogue-path proof is historical and is not current protected provider/runtime acceptance. | Historical partial runtime binding / current protected provider proof plus account plan, region, retention and account-specific acceptance open |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Runtime policy supports/requires provider-backed scanning when the feature is enabled; exact-current provider identity/binding is not established. | Conditional / current provider binding unverified |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs | Operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Founder operational fact captured / customer-content use and legal role open |

## Current and predecessor evidence

- current factual overlay: `docs/trust/evidence/2026-09-09-provider-current-overlay.md`
- historical direct provider runtime revalidation: `docs/trust/evidence/2026-08-24-current-runtime-provider-revalidation-41cc6656.md`
- predecessor Upstash proof: `docs/trust/evidence/2026-08-24-upstash-exact-current-runtime-reproof.md`
- predecessor Sentry proof: `docs/trust/evidence/2026-08-24-sentry-exact-current-runtime-reproof.md`

The 2026-08-24 files retain their original exact-SHA provenance and are historical. They must not be relabelled as current exact-release or protected provider acceptance when the 2026-09-09 overlay supersedes their release-specific facts.

## Superseded factual statements

Do not report these historical states as current:

- Vercel deployment `dpl_FEUD...` / `main@41cc6656...` as the current Production release — superseded by the 2026-09-09 overlay, which records a different observed Production deployment that is itself stale relative to protected main.
- Supabase V21 `0/31` as the current migration state — superseded by read-only V41 selected inventory `13/13` live; governed V41 provenance remains open.
- Sentry `41cc6656...` release binding as current exact-release evidence — retained only as historical partial runtime proof pending current protected acceptance.
- Upstash `41cc6656...` catalogue-path revalidation as current exact-release evidence — retained only as historical partial runtime proof pending current protected acceptance.
- PostHog EU endpoint configuration as proof of the current Production account — the connected assurance project mismatch remains unresolved.
- Stripe platform-proof events or seeded subscription rows as paying-customer proof — legitimate LIVE subscription authority observed under the exact contract is `0`.
- Google Workspace earlier plan/EMEA evidence as proof of the current applicable agreement/CDPA, processing region or transfer treatment — those account facts require revalidation.

## Factual provider-material boundary

Provider-public legal/security materials reduce factual uncertainty but do not automatically prove the exact account agreement, DPA acceptance actor/timestamp, retention setting, transfer treatment or final legal role. Account-specific evidence and qualified legal conclusions remain separate requirements.

Google OAuth is intentionally described as an identity provider rather than automatically labelled a subprocessor. Google Workspace is intentionally listed as a separate operational communications provider because real corporate mailboxes process support/security/procurement/legal communications. GitHub Actions is intentionally described as a material operational provider because protected recovery/release workflows can process Production database data transiently on hosted runners. Counsel must determine final role allocation.

The PostHog row remains explicit: source/configuration evidence and a non-Production connected assurance project do not establish the actual Production account.

For Resend and the malware scanner, current exact-release/account evidence must not be inferred from repository configuration or historical evidence alone.

## Customer notice draft

Customers should receive notice before adding a material provider/subprocessor that processes customer personal data when required by the final approved DPA/agreement. Final notice period, authorisation model, objection grounds and remedies require qualified legal approval.

## Guardrail

1. Confirm active providers before each enterprise disclosure.
2. Separate direct/historical runtime proof from protected exact-release producer acceptance and account/legal approval.
3. Confirm provider legal entity, purpose, data categories, region/location and retention/deletion behavior where applicable.
4. Confirm account-specific DPA/SCC/transfer and provider-notice status where applicable.
5. Obtain qualified legal role allocation before labelling ambiguous providers as controller, processor or subprocessor.
6. Revalidate runtime evidence after material provider, region, data-flow or service-scope changes.
7. Archive the version disclosed to each customer with the related agreement/DPA version.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed provider review register. Current Production facts, historical release evidence, protected producer acceptance and legal interpretation are tracked separately. Final contractual commitments depend on the services actually enabled, current account-specific provider agreements/DPAs where applicable, approved transfer and retention treatment, qualified legal review and the signed customer agreement."

## Final boundary

Do not claim a complete counsel-approved subprocessor program, GDPR compliance, approved international-transfer posture, completed independent pentest, final DPA, tested Production RPO/RTO, legitimate paying-customer lifecycle, exact-current-main Production acceptance, or provider account-contract coverage until the corresponding attributable evidence and qualified review are complete.
