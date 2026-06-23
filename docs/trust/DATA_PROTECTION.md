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

## Access model

Customer data is intended to be accessed only by authenticated users who are members of the relevant organization and have a role permitting the requested operation. Server-side service-role access exists for backend operations and must be treated as privileged access. Service-role keys must remain outside client bundles and source control.

## Retention

A formal retention policy remains draft and must be reviewed before it is represented contractually. Until a customer-specific retention schedule is approved, customer-safe language should state that Risck comply is designed to support controlled retention workflows, but final periods depend on the signed agreement, operational configuration, and legal review.

Related draft: `docs/trust/RETENTION_POLICY_DRAFT.md`.

## Export workflows

The repository includes GDPR export request routes and audit actions for `gdpr.export`. These support privacy operations, but do not by themselves prove legal compliance, SLA timing, or complete subprocessor handling.

## Subprocessors

Subprocessors are documented in `docs/trust/SUBPROCESSORS.md`. The list must be verified before sharing with enterprise customers. Provider regions, DPAs, and customer notice process must be confirmed per customer contract.

## Customer-safe answer

Use bounded language: Risck comply is designed around organization-scoped access, RBAC, RLS migrations, private document handling, audit logging, and provider-managed infrastructure. Retention and subprocessor commitments must be finalized in the applicable customer agreement.
