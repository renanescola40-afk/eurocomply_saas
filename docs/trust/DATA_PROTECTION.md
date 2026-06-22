# Data protection

Status: enterprise data-protection overview. This document describes current implementation and customer-safe answers. It is not a legal privacy policy, DPA, or certification statement.

## Data categories

EuroComply may process the following categories depending on customer configuration and enabled features:

| Category | Examples | Current handling |
| --- | --- | --- |
| Account data | User profile, email, authentication metadata | Managed through Supabase Auth and application profile flows. |
| Organization data | Organization records, memberships, roles, settings | Scoped by organization membership and RLS design. |
| Compliance records | Vendors, risks, tasks, evidence metadata, reports | Stored in Supabase tables and accessed through authenticated workspace flows. |
| Controlled documents | Uploaded compliance evidence and document metadata | Intended for private storage; public document listing is not part of the product model. |
| Audit metadata | Action, entity, actor, organization, request context | Sanitized before persistence; sensitive metadata keys are filtered. |
| Billing metadata | Plan, subscription, customer identifiers | Processed with Stripe; raw payment card data should remain with Stripe. |
| Operational logs | Deployment, error, and request diagnostics | Provider-managed and environment dependent. |

## Data minimization

The product should collect only data needed to operate compliance workspaces, billing, auditability, and support. Audit metadata is sanitized to reduce accidental persistence of tokens, passwords, cookies, authorization headers, API keys, OTPs, private keys, and similar secrets.

## Access model

Customer data is intended to be accessed only by authenticated users who are members of the relevant organization and have a role permitting the requested operation. Server-side service-role access exists for backend operations and must be treated as privileged access. Service-role keys must remain outside client bundles and source control.

## Retention

A formal retention policy remains draft and must be reviewed before it is represented contractually. Until a customer-specific retention schedule is approved, customer-safe language should state that EuroComply is designed to support controlled retention and deletion workflows, but final retention periods depend on the signed agreement, operational configuration, and legal review.

Related draft: `docs/trust/RETENTION_POLICY_DRAFT.md`.

## Deletion and export

The repository includes GDPR export and delete request routes and audit actions for `gdpr.export` and `gdpr.delete_requested`. These support privacy operations, but do not by themselves prove legal compliance, SLA timing, or fully automated erasure across every subprocessor. Production evidence and legal review are required before making stronger claims.

## Subprocessors

Subprocessors are documented in `docs/trust/SUBPROCESSORS.md`. The list must be verified before sharing with enterprise customers. Provider regions, DPAs, and customer notice process must be confirmed per customer contract.

## Customer-safe answers

Use: "EuroComply is designed around organization-scoped access, RBAC, RLS migrations, private document handling, audit logging, and provider-managed infrastructure. Retention and subprocessor commitments are documented and must be finalized in the applicable customer agreement."

Do not use: "fully GDPR compliant", "all data is deleted automatically", "no subprocessors process personal data", "end-to-end encrypted", or "customer data never leaves the EU" unless current evidence and contract terms support it.
