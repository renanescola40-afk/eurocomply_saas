# EuroComply Data Processing Overview

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-06-24

## Purpose

This overview explains how EuroComply processes enterprise customer data for GDPR readiness. It complements the data inventory, retention policy and GDPR runbook. It is intentionally implementation-grounded: only controls evidenced in code or runbooks should be used in product or sales claims.

## Processing model

EuroComply processes data as a multi-tenant SaaS platform. Most product records are scoped to an `organization_id`. A user gains access through `organization_members`, and privacy operations must resolve the active organization before reading or planning changes to customer records.

## Processing purposes

| Purpose | Data categories | Lawful-basis owner | System handling |
| --- | --- | --- | --- |
| Account access and authentication | user id, email, auth/session metadata | customer/controller and EuroComply legal review | authenticated user context; no raw credentials exported |
| Tenant administration | organizations, organization members, roles | customer/controller | tenant-scoped records, RBAC and audit events |
| Compliance workflow | documents, risks, vendors, tasks, notifications | customer/controller | tenant-scoped CRUD and export descriptors |
| Billing and entitlement | subscriptions, billing metadata, Stripe customer/subscription ids | EuroComply billing/legal review | retained for billing, tax, dispute and contract requirements |
| Security and compliance evidence | audit events, audit logs, step-up metadata, authorization denials | EuroComply security/legal review | immutable/chained records preserved; sanitized metadata only |
| Operations and abuse prevention | application logs, platform logs, rate-limit metadata | EuroComply security/operations review | limited retention; no secrets or payment instrument data |

## Export control summary

The GDPR export flow is implemented at `src/app/api/gdpr/export/route.ts` and uses descriptors in `src/server/privacy/gdpr.ts`.

Controls:

- authenticated user required;
- active organization required;
- optional requested `organizationId` must match the active organization;
- `export_data` RBAC permission required;
- GDPR self-service entitlement required;
- `export_data` step-up token required;
- response uses no-store download headers;
- `gdpr_export_requested` or `gdpr_export_denied` audit events are recorded with sanitized request context.

## Delete-request control summary

The GDPR delete-request flow is implemented at `src/app/api/gdpr/delete-request/route.ts`.

Controls:

- trusted origin required;
- authenticated user required;
- active organization required;
- `manage_settings` RBAC permission required;
- GDPR self-service entitlement required;
- `gdpr_delete` step-up token required;
- literal confirmation `DELETE ORGANIZATION DATA` required;
- response uses no-store JSON headers;
- a retention-aware pending review plan is returned;
- `gdpr_delete_requested` or `gdpr_delete_denied` audit events are recorded with sanitized request context.

## Retention-aware deletion posture

Delete requests are intake-and-review operations, not silent destructive jobs. This protects European enterprise customers from accidental loss of records that must remain available for tax, billing, disputes, legal holds, fraud prevention or audit-chain integrity. Eligible customer content is deleted or anonymized after review and safety delay; preserved records are minimized and retained under the data retention policy.

## Processor boundaries

- Supabase: application database, auth/session-related records and application storage where configured.
- Stripe: subscription and payment processing. Sensitive payment instrument data is not stored in EuroComply exports.
- Hosting/observability/email providers: operational logs, availability events and notification metadata according to the provider register.

## Claims allowed in product/sales material

Allowed when this evidence is current:

- tenant-scoped organization GDPR export;
- RBAC and step-up protection for privacy actions;
- no-store privacy downloads/responses;
- audit events for GDPR export/delete request actions;
- retention-aware delete request intake that preserves billing/legal and immutable audit-chain records.

Do not claim without additional implementation evidence:

- automatic deletion from every downstream processor;
- export of raw payment instruments, passwords, session cookies, raw MFA factors or raw step-up tokens;
- automatic binary document export;
- hard deletion of immutable audit-chain records.
