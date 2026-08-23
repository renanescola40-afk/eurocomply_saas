# Subprocessors register

Status: enterprise review draft. This file must be verified before being incorporated into a final DPA or represented as counsel-approved contractual language.

Detailed factual reconciliation is tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, the current connector-observation ledger `docs/trust/evidence/2026-08-23-provider-account-and-runtime-reconciliation.md`, the historical 2026-08-22 ledger, and canonical External Assurance issue `#1727`.

## Purpose

This register lists providers that may process customer data or operational metadata for RISCK COMPLY. Keep it current before signing a customer agreement or answering a procurement questionnaire.

A provider may be marked **factually active** only from attributable evidence. Technical activity is separate from legal classification: runtime presence does not by itself prove a final processor/subprocessor role, legal sufficiency, retention commitment, transfer conclusion or customer-ready contractual disclosure.

Release-bound provider statements use a **runtime evidence subject SHA**: the deployed application state actually observed. Account-plan, DPA and other provider facts have their own observation/version scope and do not become false solely because application code changes.

## Current draft list

| Provider | Service category | Data category | Captured factual evidence | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | On 2026-08-23 the current `main` Production deployment was observed `READY`; the connected team is on plan `pro`. The exact deployment had no observed `error`/`fatal` logs or HTTP `5xx` responses in the inspected post-deploy window. | Runtime active / Pro plan proven / legal facts incomplete |
| Supabase | Database, authentication and storage | Customer data, organization data, documents, auth metadata | Production is active/healthy in `eu-west-1` in the connected `pro` organization. Supabase Privacy Team confirmed that since 2026-08-01 the DPA is incorporated into Terms and applies automatically to customers. Security Advisor no longer reports the prior leaked-password-protection warning. PITR and the strict managed-backup/HIBP provider proof remain separate. | Runtime active / region & Pro plan proven / DPA applicability proven / PITR & strict resilience proof open |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | The connected LIVE Standard account is configured for `PT`, business type `individual`, with charges and payouts enabled and no currently due account requirements. LIVE inventory contains zero PaymentIntents, zero subscriptions and zero Checkout Sessions. | LIVE account facts proven / EU standard contract-DPA path attributable / genuine customer lifecycle open |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Repository and CI usage are established. The repository is public and owned by a personal GitHub account; no Team/Enterprise contract is proven. | Repository usage proven / applicable account-contract facts open |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic metadata | Current Production is bound to the exact current release and uses the German/European ingestion region. Client guardrails disable default PII and replay sampling. Account DPA acceptance is visible/acceptable only inside the organization by the appropriate role. | Runtime instrumentation & EU/DE ingestion region proven / DPA acceptance, retention & legal facts incomplete |
| PostHog | Product analytics | Analytics events and identifiers when consent/configuration allows capture | Production targets PostHog EU endpoints and has a populated public project token. The only project exposed by the connected assurance account is a different empty `Default project`; the two public project tokens do not match. Exact values are intentionally omitted. | Production EU binding present / `CONNECTED_ASSURANCE_PROJECT_MISMATCH` / `ACCOUNT_FACTS_OPEN` |
| Resend / email provider | Transactional and support email | Email address, message metadata and content | Provider-standard material documents DPA incorporation, US primary storage, transfer mechanisms and deletion/backup boundaries. The current protected exact-main provider-proof artifact was not directly observed in the 2026-08-23 reconciliation. | Standard contractual facts captured / exact provider-proof, domain verification & delivery availability open |
| Upstash | Distributed Redis rate limiting and security-control state | Operational request/control metadata and identifiers | Attributable Production behavior previously proved the distributed backend available for the high-risk control. Provider-standard material documents DPA incorporation and standard transfer/deletion mechanisms. | `RUNTIME_BINDING_PROVEN` / `ACCOUNT_LEGAL_FACTS_OPEN` for exact plan, regions and retention |
| Malware/content scanner | Enterprise upload scanning if enabled | Uploaded content and scan metadata | Protected runtime contracts require provider-backed scanning for enabled enterprise uploads, but the exact-main protected provider-proof artifact was not directly observed in this reconciliation. | Conditional / exact current provider proof and contractual facts open |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder-operated external AI assistance | Founder-submitted prompts and outputs; customer content only where manually supplied by the founder | Owner declaration identifies operational use outside direct SaaS runtime. Current evidence does not establish a direct model-provider integration in Production or an approved customer-content processing arrangement. | Founder fact captured / legal role and customer-content policy unapproved |

## Factual provider-material boundary

Provider-public legal/security materials can support factual due diligence when their applicability mechanics are explicit, but they do not replace account evidence where account plan, acceptance, configuration or contracting jurisdiction matters. Qualified legal review remains separate from technical/provider fact collection.

The Supabase row is intentionally explicit: account plan and DPA applicability are now evidenced, while PITR and the strict provider-resilience observations remain open. The PostHog row is also intentionally explicit: Production analytics is technically present, while the currently connected assurance account is proven to be the wrong project for Production-specific account evidence.

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data when required by the final approved DPA/agreement. Final notice period, authorisation model, objection grounds and remedies must be approved by qualified legal counsel.

## Guardrail

1. Review this register before each enterprise contract or security questionnaire.
2. Confirm which providers are actually enabled in the target environment or used operationally outside runtime where customer data may be supplied.
3. Separate **runtime/configuration proof** from **account/legal approval**.
4. Confirm provider legal entity, DPA/account applicability, security documentation, region, retention/deletion posture and transfer mechanism where applicable.
5. Do not represent standard provider material as a customer-specific legal conclusion.
6. Update public Trust/procurement material when attributable provider facts change; preserve dated historical evidence rather than rewriting it.
7. Archive the version ultimately disclosed to each customer with the related DPA/agreement version.
8. Revalidate release-bound evidence when a material provider, region, data flow, configuration or service scope changes.

## Customer-safe answer

"RISCK COMPLY maintains an evidence-backed review register for infrastructure, database/authentication/storage, billing, observability, analytics, distributed security controls, email/scanning providers and relevant founder-operated external services. Technical and account facts are reconciled separately from legal interpretation. Final contractual commitments depend on attributable provider evidence, qualified legal review and the signed customer agreement."

## Final boundary

Do not claim a complete subprocessor program, GDPR compliance, approved international-transfer posture, completed independent pentest, final DPA, tested Production RPO/RTO, PITR, Sentry DPA acceptance, PostHog Production account ownership or a genuine Stripe customer lifecycle until the corresponding attributable evidence and qualified review are complete.
