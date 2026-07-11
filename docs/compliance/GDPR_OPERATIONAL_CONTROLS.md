# GDPR Operational Controls

Review date: 2026-07-11

## Scope and legal posture

RISCK COMPLY supports customer AI-governance and evidence workflows. This document describes operational controls and known gaps. It is not legal advice, a DPA, a certification or a guarantee of GDPR/LGPD compliance.

The customer is generally expected to act as controller for customer workspace data and RISCK COMPLY as processor, subject to the actual feature, contract and processing context. Final role allocation, international transfers, retention periods and lawful bases require legal review.

## Data inventory

Expected data categories include:

- account identity and authentication metadata;
- organization and membership records;
- AI-system inventory and risk/readiness inputs;
- document and evidence metadata;
- audit/security events;
- billing references and subscription status;
- support communications;
- technical logs and error telemetry.

Sensitive personal data should not be entered unless necessary, documented and contractually permitted.

## Operational control matrix

| Control | Required implementation | Current posture | Release rule |
| --- | --- | --- | --- |
| Data minimization | Collect only fields needed for the workflow; avoid free-form PII in logs/telemetry | Application and trust copy describe minimization; route-level validation exists | Block release on known avoidable PII logging |
| Purpose limitation | Use customer data only to provide, secure, bill and support the service | Described in trust content and terms summaries | Legal text must match actual providers/features |
| Analytics consent | Do not initialize non-essential analytics before valid consent; support withdrawal | PostHog/analytics consent controls exist in repository and require runtime verification | No-Go if analytics fires before consent in applicable jurisdictions |
| Access control | Supabase Auth, organization membership, RBAC/ABAC, RLS | Strong static controls and prior live RLS proof | Current-commit negative tenant proof required |
| Auditability | Record security/compliance-relevant actions without storing unnecessary payloads | Audit events and chain validation controls exist | No-Go if critical mutations lack audit coverage |
| Data export | Authenticated, tenant-scoped, rate-limited export with CSV injection defenses | Security checks and export controls exist | Verify runtime export for owner/admin and deny other tenants |
| Deletion request | Step-up authentication, explicit confirmation, rate limit, audit record and safe asynchronous workflow | Repository includes GDPR delete controls; runtime evidence must be current | No-Go if deletion can bypass step-up or tenant ownership |
| Retention | Document retention by data class, legal/security hold and deletion cadence | Public wording is conservative; measured operational schedule is incomplete | Enterprise contracts must not promise unimplemented periods |
| Subprocessors | Maintain actual provider list and DPA/transfer basis | Vercel, Supabase, Stripe, Sentry, PostHog and email/support providers referenced where configured | Verify production provider list before signature |
| Incident response | Detect, contain, assess, preserve evidence and communicate | `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md` covers data exposure and security incidents | Named privacy/security owner required before release |
| International transfers | Record hosting/processor regions and transfer mechanism | Not fully evidenced in public repository | Procurement response requires verified provider configuration |
| Security of processing | Encryption through managed providers, auth, RLS, rate limits, upload scanning, logging | Strong repository-side controls | Runtime smoke, current evidence and external review remain required |

## Analytics and PostHog

Non-essential analytics must be disabled until consent is recorded where consent is the applicable basis. Consent state must be:

- explicit and versioned;
- scoped to analytics categories;
- revocable without blocking core service use;
- respected on subsequent navigation and sessions;
- excluded from server events unless a documented lawful basis applies;
- free of secrets, document contents and sensitive workspace payloads.

Required validation:

1. fresh browser profile has no PostHog network call before consent;
2. accept initializes only approved analytics;
3. reject keeps analytics disabled;
4. withdraw stops future capture and clears applicable client state;
5. consent choice is localized and accessible;
6. analytics payload review confirms no raw PII or tenant content.

## Data subject and customer requests

### Export

- Require authenticated session and active organization membership.
- Restrict organization-wide export to an authorized role.
- Apply rate limit, no-store and audit event.
- Escape spreadsheet formula prefixes for CSV.
- Exclude secrets, internal tokens and data belonging to other tenants.
- Record generated artifact expiry and access path.

### Deletion

- Require recent step-up authentication for destructive account/organization deletion.
- Show scope, dependencies and irreversibility before confirmation.
- Require server-side permission and organization ownership.
- Apply rate limit and idempotency.
- Record request, approver, status, timestamps and completion evidence.
- Preserve only records required for security, billing, legal hold or statutory obligations, with documented rationale.
- Do not claim immediate deletion when provider backups or legal retention make that untrue.

## Retention baseline requiring owner approval

The following is a proposed operational baseline, not a contractual promise:

| Data class | Proposed active retention | Post-termination handling |
| --- | --- | --- |
| Workspace operational data | While account/contract is active | Export window followed by controlled deletion, subject to legal/security holds |
| Audit/security logs | Minimum needed for investigation and contractual requirements | Time-bounded archive with restricted access |
| Billing records | According to tax/accounting obligations | Retained only as legally required |
| Support communications | Duration needed to resolve and evidence support | Delete/anonymize on schedule unless dispute/legal hold |
| Backups | Provider lifecycle | Expire through provider rotation; document restore/deletion limitations |
| Analytics identifiers | According to consent and analytics configuration | Delete/anonymize after withdrawal/retention expiry where supported |

Before enterprise contracting, assign exact durations, owner, deletion mechanism, verification query and exception process for each class.

## Incident and breach workflow

A suspected data exposure is SEV-1. The incident commander must:

1. freeze unsafe changes and contain access;
2. preserve sanitized evidence without copying raw PII unnecessarily;
3. identify affected tenants, data classes, time window and access path;
4. rotate credentials or revoke signed URLs when relevant;
5. involve privacy/legal owner to assess notification duties and deadlines;
6. communicate only confirmed facts;
7. rerun RLS/auth/log-sanitization/audit-chain controls before closure;
8. document corrective actions and residual risk.

## Required private evidence

The public repository must contain only redacted references. Private evidence should include:

- executed DPA/subprocessor agreements;
- actual production regions and transfer mechanisms;
- analytics consent screenshots/network captures;
- data export and deletion runtime proof;
- retention job results and deletion verification;
- backup/restore and backup-expiry evidence;
- incident/breach decision records;
- legal review and approved customer wording.

## Current blockers

- Exact retention schedule and owners are not finally approved/evidenced.
- Current-commit production export/deletion runtime proof is incomplete.
- Production analytics consent network proof is not attached for the reviewed release.
- Provider region/transfer and signed DPA evidence is not available in the public repository.
- External security review/pentest remains Open.

These blockers prevent a claim of guaranteed GDPR/LGPD compliance and contribute to the enterprise No-Go decision.
