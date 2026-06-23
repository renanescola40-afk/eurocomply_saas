# EuroComply Data Retention Policy

Status: production readiness control
Owner: Privacy Engineering / Security Engineering
Last reviewed: 2026-06-22

## Purpose

This document records the enterprise privacy retention posture used by the GDPR self-service controls. It is an operational control, not a legal promise on its own.

## Retention classes

| Class | Examples | Handling |
| --- | --- | --- |
| Active customer data | workspace records, documents, tasks, vendors, risks | Included in organization export and eligible for approved privacy workflow action. |
| Account data | user profile and membership records | Included where linked to the organization and handled under account lifecycle rules. |
| Billing and legal records | subscription and invoice references | Preserved where required for tax, dispute, contract or legal obligations. |
| Security evidence | audit events, authorization records and chain metadata | Preserved for auditability and represented through new review events. |
| Operational logs | application and platform logs | Retained for a limited operational window unless needed for security review. |
| Backups | managed provider backups | Follow provider rotation and restore procedures. |

## Workflow controls

- Organization privacy export requires authentication, organization membership, RBAC permission, step-up verification and no-store response headers.
- Organization privacy review requires authentication, organization membership, RBAC permission, step-up verification, literal confirmation and a safety delay.
- Privacy actions record audit events and preserve records that must remain for billing, legal or security reasons.

## Review cadence

Review this document when data models, providers, billing flows, audit-chain behavior or customer contract terms change.
