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

A formal retention policy remains draft and must be reviewed before it is represented contractually. Until a customer-specific retention schedule is approved, customer-safe language should state that Risck comply is designed to support controlled retention workflows, but final periods depend on the signed agreement, operational configuration, and legal review.

Retention review should cover:

| Data category | Default posture to confirm | Buyer-safe boundary |
| --- | --- | --- |
| Account/profile data | Retained while account is active unless deletion is approved | Agreement and identity-provider behavior may affect final timing |
| Organization records | Retained while the workspace is active | Customer-specific deletion/export commitments require approval |
| Controlled documents | Stored according to product configuration and provider storage behavior | Legal-hold and deletion commitments require contract review |
| Audit metadata | Retained for investigation and accountability needs | Retention period and export format must be approved before commitment |
| Billing metadata | Managed through Stripe and application subscription records | Payment-card details are handled by Stripe, not stored directly by Risck comply |
| Operational logs | Provider-managed and environment-dependent | Retention and access vary by provider configuration |

Related draft: `docs/trust/RETENTION_POLICY_DRAFT.md`.

## Export and deletion workflows

The repository includes GDPR export request routes and audit actions for `gdpr.export` and `gdpr.delete_requested`. These support privacy operations, but do not by themselves prove legal compliance, SLA timing, or complete subprocessor handling.

## Subprocessors

Subprocessors are documented in `docs/trust/SUBPROCESSORS.md`. The list must be verified before sharing with enterprise customers. Provider regions, DPAs, and customer notice process must be confirmed per customer contract.

## Customer-safe answer

Use bounded language: Risck comply is designed around organization-scoped access, RBAC, RLS migrations, private document handling, audit logging, sensitive configuration management, provider-managed infrastructure, and agreement-dependent retention. Retention and subprocessor commitments must be finalized in the applicable customer agreement.
