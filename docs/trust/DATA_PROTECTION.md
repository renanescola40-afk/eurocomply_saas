# Data protection

Status: enterprise data-protection overview. This document describes current implementation and customer-safe answers. It is not a legal privacy policy, DPA, or certification statement.

## Data categories

Risck comply may process account data, organization data, compliance records, controlled documents, audit metadata, billing metadata, and provider-managed operational logs depending on customer configuration and enabled features.

## Current handling

- Account data is managed through Supabase Auth and application profile flows.
- Organization data is intended to be scoped by organization membership and RLS design.
- Compliance records are stored in Supabase tables and accessed through authenticated workspace flows.
- Controlled documents are intended for private storage and authenticated access.
- Audit metadata is sanitized before persistence to reduce accidental sensitive-data capture.
- Billing metadata is processed with Stripe; raw payment card data should remain with Stripe.
- Sensitive runtime configuration is intended to remain server-side and outside browser-delivered bundles.

## Access model

Customer data is intended to be accessed only by authenticated users who are members of the relevant organization and have a role permitting the requested operation. Server-side administrative access exists for backend operations and must be treated as privileged access. Administrative provider configuration must remain outside client bundles and source control.

## Retention

RISCK COMPLY uses a category-specific retention model rather than one universal period. The repository includes retention-policy schema/workflows and GDPR export/delete operations, but final contractual durations remain dependent on the data category, signed agreement, legal/accounting/security requirements and verified provider backup/log lifecycle.

Retention review covers:

| Data category | Default posture to confirm | Buyer-safe boundary |
| --- | --- | --- |
| Account/profile data | Retained while account is active unless deletion is approved | Agreement and identity-provider behavior may affect final timing |
| Organization records | Retained while the workspace is active | Customer-specific deletion/export commitments require approval |
| Controlled documents | Stored according to product configuration and provider storage behavior | Legal-hold and deletion commitments require contract review |
| Audit metadata | Retained for investigation and accountability needs | Retention period and export format must be approved before commitment |
| Billing metadata | Managed through Stripe and application subscription records | Payment-card details are handled by Stripe, not stored directly by Risck comply |
| Operational logs | Provider-managed and environment-dependent | Retention and access vary by provider configuration |

Related controls: `docs/trust/RETENTION_POLICY_DRAFT.md`, `docs/compliance/GDPR_OPERATIONAL_CONTROLS.md` and `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`.

## Export and deletion workflows

The repository includes GDPR export/delete request workflows, durable request-state handling and audit actions for privacy operations. These controls support customer/controller assistance and internal accountability, but a product delete event does not prove instantaneous erasure from every provider backup/log copy. Legal holds, accounting records, security evidence and downstream provider lifecycle constraints remain separate.

Buyer-safe language is: RISCK COMPLY supports controlled export/deletion workflows and category-specific retention criteria; exact contractual deletion windows and provider backup effects are stated only where verified and agreed.

## Subprocessors

Subprocessors are documented in `docs/trust/SUBPROCESSORS.md`. The list must be verified before sharing with enterprise customers. Provider regions, DPAs, and customer notice process must be confirmed per customer contract.

## Customer-safe answer

Use bounded language: Risck comply is designed around organization-scoped access, RBAC, RLS migrations, private document handling, audit logging, sensitive configuration management, provider-managed infrastructure, and agreement-dependent retention. Retention and subprocessor commitments must be finalized in the applicable customer agreement.


## Data residency and international transfers

The primary Production Supabase project is currently evidenced in `eu-west-1` (Ireland). Other active providers may process or access data from additional locations or global infrastructure. RISCK COMPLY therefore does not make a blanket “EU-only processing” claim.

Use `docs/trust/SUBPROCESSORS.md` and `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md` for the current provider-by-provider evidence boundary. A provider DPA/SCC framework is not automatically a final flow-level Chapter V conclusion.
