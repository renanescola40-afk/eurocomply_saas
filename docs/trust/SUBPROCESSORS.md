# Subprocessors register

Status: enterprise review draft. This file must be verified before being shared with customers or incorporated into a DPA.

## Purpose

This register lists providers that may process customer data or operational metadata for EuroComply. Keep it current before signing a customer agreement or answering a procurement questionnaire.

## Current draft list

| Provider | Service category | Data category | Region / hosting notes | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | Confirm project region and data residency settings | Needs review |
| Supabase | Database, authentication and storage if enabled | Customer data, organization data, documents, auth metadata | Confirm project region, backups and tenant-isolation evidence | Needs review |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | Confirm account region and DPA | Needs review |
| Upstash | Redis, rate limiting or cache if enabled | Operational metadata | Confirm enabled usage and region | Conditional |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Confirm repository access controls | Needs review |

## Customer notice draft

Customers should receive notice before adding a material subprocessor that processes customer personal data. Final notice period and approval process must be agreed with legal counsel.

## Guardrail

1. Review this register before each enterprise contract or security questionnaire.
2. Confirm which providers are actually enabled in the target environment.
3. Confirm provider DPA, security documentation, region, and retention posture.
4. Confirm data categories and whether customer personal data is processed.
5. Update the public Trust Center and procurement packet before customer disclosure.
6. Archive the version disclosed to each customer with the related DPA version.

## Customer-safe answer

"EuroComply maintains a subprocessor register for infrastructure, authentication/database/storage, billing, source control/CI, and conditional observability/cache/email providers. The register is reviewed before enterprise disclosure and final contractual commitments depend on the signed DPA and enabled production services."

## Guardrail

Do not claim a complete subprocessor program until provider DPAs, regions and customer notice procedures are verified.
